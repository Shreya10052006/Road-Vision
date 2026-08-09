"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { damageTypeOrder, priorityOrder } from "@/lib/priorityConfig";
import { ROADS } from "@/lib/mock/roads";
import type { Detection, DamageType, Priority } from "@/lib/types";

export type LiveStatus = "idle" | "running" | "paused" | "completed";

let seq = 9000;

function randomDetection(frameIndex: number): Detection {
  const damageType = damageTypeOrder[Math.floor(Math.random() * damageTypeOrder.length)] as DamageType;
  // Weighted so potholes/alligator cracks skew more urgent — mirrors the rule-derived
  // training-label logic documented in the ML Pipeline (not a real inference call).
  const weights: Record<DamageType, number[]> = {
    pothole: [0.3, 0.32, 0.26, 0.12],
    alligator_crack: [0.22, 0.3, 0.32, 0.16],
    longitudinal_crack: [0.06, 0.22, 0.42, 0.3],
    transverse_crack: [0.05, 0.2, 0.4, 0.35],
    surface_wear: [0.02, 0.1, 0.38, 0.5],
    patch: [0.03, 0.12, 0.35, 0.5],
  };
  const w = weights[damageType];
  const x = Math.random();
  let priority: Priority = "P4";
  let acc = 0;
  for (let i = 0; i < priorityOrder.length; i++) {
    acc += w[i];
    if (x < acc) {
      priority = priorityOrder[i];
      break;
    }
  }
  const road = ROADS[Math.floor(Math.random() * ROADS.length)];
  const confidence = 0.62 + Math.random() * 0.36;
  const id = `LIVE-${++seq}`;
  const now = new Date();

  return {
    id,
    inspectionId: "LIVE-SESSION",
    frameIndex,
    timestamp: now.toISOString().slice(11, 19),
    damageType,
    priority,
    confidence,
    priorityConfidence: 0.7 + Math.random() * 0.28,
    modelVersion: "RF-v1.0",
    road: road.name,
    area: road.area,
    lat: road.lat + (Math.random() - 0.5) * 0.004,
    lng: road.lng + (Math.random() - 0.5) * 0.004,
    detectedAt: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: false }),
    features: {
      bboxAreaRatio: Math.max(0.01, 0.05 + Math.random() * 0.2),
      aspectRatio: Number((0.6 + Math.random() * 1.8).toFixed(2)),
      frameDamageCount: 1 + Math.floor(Math.random() * 4),
      frameDamageDensity: Math.max(0.01, 0.03 + Math.random() * 0.15),
      detectorConfidence: confidence,
      framePositionY: Math.random(),
    },
  };
}

export function useLiveSimulation() {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentDetection, setCurrentDetection] = useState<Detection | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);

  const clearAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (frameRef.current) clearInterval(frameRef.current);
    if (detectRef.current) clearInterval(detectRef.current);
  }, []);

  const start = useCallback(() => {
    setStatus("running");
    setElapsedSeconds(0);
    setFramesProcessed(0);
    setDetections([]);
    setCurrentDetection(null);
    frameCountRef.current = 0;

    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    frameRef.current = setInterval(() => {
      frameCountRef.current += Math.floor(20 + Math.random() * 15);
      setFramesProcessed(frameCountRef.current);
    }, 1000);
    detectRef.current = setInterval(() => {
      const d = randomDetection(frameCountRef.current);
      setCurrentDetection(d);
      setDetections((prev) => [d, ...prev].slice(0, 60));
    }, 2600);
  }, []);

  const pause = useCallback(() => {
    setStatus("paused");
    if (timerRef.current) clearInterval(timerRef.current);
    if (frameRef.current) clearInterval(frameRef.current);
    if (detectRef.current) clearInterval(detectRef.current);
  }, []);

  const resume = useCallback(() => {
    setStatus("running");
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    frameRef.current = setInterval(() => {
      frameCountRef.current += Math.floor(20 + Math.random() * 15);
      setFramesProcessed(frameCountRef.current);
    }, 1000);
    detectRef.current = setInterval(() => {
      const d = randomDetection(frameCountRef.current);
      setCurrentDetection(d);
      setDetections((prev) => [d, ...prev].slice(0, 60));
    }, 2600);
  }, []);

  const stop = useCallback(() => {
    clearAll();
    setStatus("completed");
  }, [clearAll]);

  const reset = useCallback(() => {
    clearAll();
    setStatus("idle");
    setElapsedSeconds(0);
    setFramesProcessed(0);
    setDetections([]);
    setCurrentDetection(null);
  }, [clearAll]);

  const captureFrame = useCallback(() => {
    const d = randomDetection(frameCountRef.current);
    setCurrentDetection(d);
    setDetections((prev) => [d, ...prev].slice(0, 60));
  }, []);

  useEffect(() => clearAll, [clearAll]);

  const byPriority = { P1: 0, P2: 0, P3: 0, P4: 0 } as Record<Priority, number>;
  detections.forEach((d) => byPriority[d.priority]++);

  return {
    status,
    elapsedSeconds,
    framesProcessed,
    detections,
    currentDetection,
    byPriority,
    start,
    pause,
    resume,
    stop,
    reset,
    captureFrame,
  };
}
