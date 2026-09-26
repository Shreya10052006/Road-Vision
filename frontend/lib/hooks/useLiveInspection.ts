"use client";

/**
 * Real webcam inspection.
 *
 *   getUserMedia -> <video> -> offscreen canvas -> JPEG blob
 *     -> POST /api/ml/detect-frame  (YOLO best.pt -> features -> rule priority)
 *     -> live overlay + running aggregates
 *     -> POST /api/ml/live/sessions/{id}/finalize on Stop
 *
 * Nothing here is simulated: every detection shown comes from the backend.
 *
 * PACING. Frames are sampled at ~2 fps, and only ever one request is in flight
 * — the loop is a self-rescheduling timeout, not an interval, so a slow
 * inference simply delays the next capture instead of queueing work. A frame is
 * skipped outright if the previous request has not returned. There is no queue.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectFrame,
  discardLiveSession,
  finalizeLiveSession,
  startLiveSession,
  type ApiDetection,
  type FinalizeLiveResponse,
} from "@/lib/api";
import type { DamageType, Detection, Priority } from "@/lib/types";

export type LiveStatus = "idle" | "running" | "paused" | "completed";

const TARGET_FPS = 2;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const JPEG_QUALITY = 0.7;
const REQUEST_TIMEOUT_MS = 15000;
const FEED_LIMIT = 60;

const emptyPriorityCounts = (): Record<Priority, number> => ({ P1: 0, P2: 0, P3: 0, P4: 0 });

/** Map a backend detection onto the Detection shape the existing panels render. */
function toDetection(d: ApiDetection, frameIndex: number, seq: number): Detection {
  const now = new Date();
  return {
    id: `LIVE-${frameIndex}-${seq}`,
    inspectionId: "LIVE-SESSION",
    frameIndex,
    timestamp: now.toISOString().slice(11, 19),
    damageType: d.damage_type as DamageType,
    priority: d.priority,
    confidence: d.confidence,
    // Rule-derived priorities carry no model confidence and no model version.
    priorityConfidence: d.priority_confidence ?? 0,
    modelVersion: d.model_version ?? "rule",
    road: "Live Camera",
    area: "—",
    lat: 0,
    lng: 0,
    detectedAt: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
    features: {
      bboxAreaRatio: d.features.bbox_area_ratio ?? 0,
      aspectRatio: d.features.aspect_ratio ?? 0,
      frameDamageCount: d.features.frame_damage_count ?? 0,
      frameDamageDensity: d.features.frame_damage_density ?? 0,
      detectorConfidence: d.features.detector_confidence ?? d.confidence,
      framePositionY: d.features.frame_position_y ?? 0,
    },
  };
}

export function useLiveInspection() {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentDetection, setCurrentDetection] = useState<Detection | null>(null);
  /** Boxes from the most recent frame only — what the overlay draws. */
  const [visibleBoxes, setVisibleBoxes] = useState<ApiDetection[]>([]);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [byPriority, setByPriority] = useState<Record<Priority, number>>(emptyPriorityCounts);
  const [byType, setByType] = useState<Record<string, number>>({});
  const [totalObserved, setTotalObserved] = useState(0);
  const [confidenceSum, setConfidenceSum] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [saved, setSaved] = useState<FinalizeLiveResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<string | null>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const seqRef = useRef(0);

  const averageConfidence = totalObserved > 0 ? confidenceSum / totalObserved : 0;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopLoops = useCallback(() => {
    runningRef.current = false;
    if (loopRef.current) clearTimeout(loopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    loopRef.current = null;
    timerRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
  }, []);

  /** Grab the current video frame as a JPEG blob via an offscreen canvas. */
  const captureBlob = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Drawn unmirrored on purpose: the preview may be CSS-mirrored for comfort,
    // but the frame sent for inference — and therefore the box coordinates that
    // come back — stays in the camera's own coordinate space.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY),
    );
  }, []);

  const processOneFrame = useCallback(async () => {
    if (inFlightRef.current) return; // never overlap requests
    const blob = await captureBlob();
    if (!blob) return;

    inFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const data = await detectFrame(blob, sessionRef.current ?? undefined, controller.signal);
      if (!runningRef.current) return;

      setFramesProcessed((n) => n + 1);
      setLastLatencyMs(data.processing_time_ms);
      setFrameSize({ width: data.image_width, height: data.image_height });
      setVisibleBoxes(data.detections);

      if (data.detection_count > 0) {
        const frameIndex = data.frame_index ?? 0;
        const mapped = data.detections.map((d) => toDetection(d, frameIndex, seqRef.current++));
        setCurrentDetection(mapped[0]);
        setDetections((prev) => [...mapped.reverse(), ...prev].slice(0, FEED_LIMIT));
        setTotalObserved((n) => n + data.detection_count);
        setConfidenceSum((sum) => sum + data.detections.reduce((a, d) => a + d.confidence, 0));
        setByPriority((prev) => {
          const next = { ...prev };
          for (const d of data.detections) next[d.priority] += 1;
          return next;
        });
        setByType((prev) => {
          const next = { ...prev };
          for (const d of data.detections) next[d.damage_type] = (next[d.damage_type] ?? 0) + 1;
          return next;
        });
      }
    } catch (err) {
      // One failed frame must not end the session — the camera keeps running.
      if ((err as Error)?.name !== "AbortError" && runningRef.current) {
        setError((err as Error)?.message ?? "A frame could not be processed.");
      }
    } finally {
      clearTimeout(timeout);
      inFlightRef.current = false;
      abortRef.current = null;
    }
  }, [captureBlob]);

  /** Self-rescheduling loop: the next capture is only queued once this one is done. */
  const scheduleLoop = useCallback(() => {
    if (!runningRef.current) return;
    loopRef.current = setTimeout(async () => {
      await processOneFrame();
      scheduleLoop();
    }, FRAME_INTERVAL_MS);
  }, [processOneFrame]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support camera access (getUserMedia).");
      return false;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      const name = (err as DOMException)?.name;
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Camera permission was denied. Allow camera access in the browser and try again."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No camera was found on this device."
            : name === "NotReadableError"
              ? "The camera is already in use by another application."
              : `The camera could not be started: ${(err as Error)?.message ?? name}`,
      );
      return false;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        /* autoplay policies — the muted playsInline video normally starts anyway */
      }
    }

    try {
      sessionRef.current = (await startLiveSession()).session_id;
    } catch {
      // The camera still runs and detections still display; only saving is lost.
      sessionRef.current = null;
      setError("Connected to the camera, but the backend session could not be started — this run cannot be saved.");
    }

    seqRef.current = 0;
    setElapsedSeconds(0);
    setFramesProcessed(0);
    setDetections([]);
    setCurrentDetection(null);
    setVisibleBoxes([]);
    setByPriority(emptyPriorityCounts());
    setByType({});
    setTotalObserved(0);
    setConfidenceSum(0);
    setSaved(null);
    setStatus("running");
    runningRef.current = true;
    startTimer();
    scheduleLoop();
    return true;
  }, [scheduleLoop, startTimer]);

  const pause = useCallback(() => {
    stopLoops();
    setStatus("paused");
    setVisibleBoxes([]);
  }, [stopLoops]);

  const resume = useCallback(() => {
    setStatus("running");
    runningRef.current = true;
    startTimer();
    scheduleLoop();
  }, [scheduleLoop, startTimer]);

  /** Stop inference, release the camera, then save the session as an Inspection. */
  const stop = useCallback(
    async (meta: Record<string, string | number | undefined> = {}) => {
      stopLoops();
      stopCamera();
      setVisibleBoxes([]);
      setStatus("completed");

      const sessionId = sessionRef.current;
      if (!sessionId) return null;
      sessionRef.current = null;

      setSaving(true);
      try {
        const result = await finalizeLiveSession(sessionId, meta);
        setSaved(result);
        return result;
      } catch (err) {
        setError((err as Error)?.message ?? "The inspection could not be saved.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [stopCamera, stopLoops],
  );

  const reset = useCallback(() => {
    stopLoops();
    stopCamera();
    if (sessionRef.current) {
      void discardLiveSession(sessionRef.current);
      sessionRef.current = null;
    }
    setStatus("idle");
    setError(null);
    setElapsedSeconds(0);
    setFramesProcessed(0);
    setDetections([]);
    setCurrentDetection(null);
    setVisibleBoxes([]);
    setByPriority(emptyPriorityCounts());
    setByType({});
    setTotalObserved(0);
    setConfidenceSum(0);
    setSaved(null);
  }, [stopCamera, stopLoops]);

  /** Capture Frame: one extra inference now, outside the sampling rhythm. */
  const captureFrame = useCallback(() => {
    void processOneFrame();
  }, [processOneFrame]);

  // Release the camera if the page unmounts mid-session.
  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (loopRef.current) clearTimeout(loopRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      abortRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    status,
    error,
    elapsedSeconds,
    framesProcessed,
    detections,
    currentDetection,
    visibleBoxes,
    frameSize,
    byPriority,
    byType,
    totalObserved,
    averageConfidence,
    lastLatencyMs,
    saved,
    saving,
    videoRef,
    start,
    pause,
    resume,
    stop,
    reset,
    captureFrame,
    clearError: () => setError(null),
  };
}
