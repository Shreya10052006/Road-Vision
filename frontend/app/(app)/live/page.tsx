"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CameraSourceSelector } from "@/components/live/CameraSourceSelector";
import { CameraPreview } from "@/components/live/CameraPreview";
import { CurrentDetection } from "@/components/live/CurrentDetection";
import { LiveStats } from "@/components/live/LiveStats";
import { LiveControls } from "@/components/live/LiveControls";
import { DetectionFeed } from "@/components/live/DetectionFeed";
import { DetectionDetailsDrawer } from "@/components/detections/DetectionDetailsDrawer";
import { useLiveInspection } from "@/lib/hooks/useLiveInspection";
import { useCamera } from "@/contexts/CameraContext";
import { useToast } from "@/contexts/ToastContext";
import { damageTypeConfig } from "@/lib/priorityConfig";
import type { CameraFacingMode, CameraSource, DamageType, Detection } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function damageLabel(value: string) {
  return (
    damageTypeConfig[value as DamageType]?.label ??
    value.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

export default function LivePage() {
  const {
    source,
    setSource,
    facingMode,
    setFacingMode,
    selectedDeviceId,
    setSelectedDeviceId,
    availableDevices,
    connect,
    disconnect,
  } = useCamera();

  const live = useLiveInspection(facingMode);
  const { showToast } = useToast();
  const router = useRouter();
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const selectedDetection: Detection | null =
    live.detections.find((d) => d.id === selectedDetectionId) ?? null;

  const handleStart = async () => {
    const ok = await live.start(facingMode, selectedDeviceId);
    if (ok) {
      connect();
      showToast(
        `Live inspection started (${facingMode === "user" ? "Front Camera" : "Back Camera"})`,
        "success",
      );
    }
  };

  const handleSourceChange = async (newSource: CameraSource) => {
    setSource(newSource);
    if (newSource === "phone_back") {
      setFacingMode("environment");
      if (live.status === "running" || live.status === "paused") {
        await live.switchCamera("environment", null);
      }
    } else if (newSource === "phone_front") {
      setFacingMode("user");
      if (live.status === "running" || live.status === "paused") {
        await live.switchCamera("user", null);
      }
    }
  };

  const handleFacingModeChange = async (mode: CameraFacingMode) => {
    setFacingMode(mode);
    if (live.status === "running" || live.status === "paused") {
      await live.switchCamera(mode, selectedDeviceId);
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId || null);
    if (live.status === "running" || live.status === "paused") {
      await live.switchCamera(facingMode, deviceId || null);
    }
  };

  const handleFlipCamera = async () => {
    const nextMode: CameraFacingMode = live.facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (live.status === "running" || live.status === "paused") {
      await live.flipCamera();
    } else {
      await live.switchCamera(nextMode, null);
    }
    showToast(`Switched to ${nextMode === "user" ? "Front (Cabin)" : "Back (Road)"} camera`, "info");
  };

  const handleStop = async () => {
    const result = await live.stop({
      title: "Live Camera Inspection",
      road: facingMode === "user" ? "Live Front Camera" : "Live Road Camera",
      city: "Chennai",
    });
    disconnect();
    showToast(
      result
        ? `Inspection saved as ${result.inspection_id} — ${result.summary.unique_damages} damage${result.summary.unique_damages === 1 ? "" : "s"}`
        : "Inspection stopped",
      result ? "success" : "error",
    );
  };

  const handleNewSession = () => {
    live.reset();
  };

  const m = Math.floor(live.elapsedSeconds / 60);
  const s = live.elapsedSeconds % 60;
  const previewStatus = live.status === "completed" ? "idle" : live.status;

  return (
    <>
      <Header title="Live Inspection Center" subtitle="Real-time road damage & pothole monitoring from phone or camera" />
      <main className="flex-1 p-4 sm:p-8 space-y-5">
        <Card className="p-4">
          <CameraSourceSelector
            source={source}
            onChange={handleSourceChange}
            facingMode={live.facingMode}
            onFacingModeChange={handleFacingModeChange}
            availableDevices={availableDevices}
            selectedDeviceId={selectedDeviceId}
            onDeviceChange={handleDeviceChange}
            onFlipCamera={handleFlipCamera}
            connected={live.status === "running" || live.status === "paused"}
            disabled={live.status === "completed"}
          />
        </Card>

        {live.error && (
          <Card className="p-4 flex items-start gap-3 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                Camera / Inference Notice
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-0.5">{live.error}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={live.clearError}>
              Dismiss
            </Button>
          </Card>
        )}

        {live.status === "completed" ? (
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600">
              <CheckCircle2 size={26} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {live.saving ? "Saving Inspection…" : "Inspection Completed"}
            </h2>
            {live.saved && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Saved as {live.saved.inspection_id} · {live.saved.summary.unique_damages} unique damage
                {live.saved.summary.unique_damages === 1 ? "" : "s"} from{" "}
                {live.saved.summary.total_detections} frame-level detections
              </p>
            )}
            <div className="grid grid-cols-4 gap-8 mt-2">
              <Stat label="Duration" value={`${pad(m)}:${pad(s)}`} />
              <Stat label="Frames" value={live.framesProcessed.toLocaleString()} />
              <Stat
                label="Damages"
                value={String(live.saved?.summary.unique_damages ?? live.totalObserved)}
              />
              <Stat label="Critical" value={String(live.byPriority.P1)} />
            </div>

            {live.saved && Object.keys(live.saved.summary.counts_by_damage_type).length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                {Object.entries(live.saved.summary.counts_by_damage_type).map(([type, count]) => (
                  <span key={type}>
                    {damageLabel(type)}: <span className="font-medium">{count}</span>
                  </span>
                ))}
                <span>
                  Avg. confidence:{" "}
                  <span className="font-medium">
                    {(live.saved.summary.average_confidence * 100).toFixed(1)}%
                  </span>
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 max-w-lg">
              Repeated sightings of the same defect across frames are merged before saving. Priorities are
              rule-derived provisional decision-support labels, not dataset ground truth.
            </p>

            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => router.push(`/inspections/${live.saved?.inspection_id}`)}
                disabled={!live.saved}
              >
                <FileText size={16} />
                View Inspection Report
              </Button>
              <Button variant="outline" onClick={handleNewSession}>
                Start New Session
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <CameraPreview
                status={previewStatus}
                elapsedSeconds={live.elapsedSeconds}
                videoRef={live.videoRef}
                boxes={live.visibleBoxes}
                frameSize={live.frameSize}
                latencyMs={live.lastLatencyMs}
                facingMode={live.facingMode}
                isMirrored={live.isMirrored}
                hasTorch={live.hasTorch}
                torchActive={live.torchActive}
                potholeAlert={live.potholeAlert}
                onFlipCamera={handleFlipCamera}
                onToggleTorch={() => void live.toggleTorch()}
                onToggleMirror={live.toggleMirror}
              />
              <Card className="p-5">
                <LiveControls
                  status={previewStatus}
                  onStart={() => void handleStart()}
                  onPause={live.pause}
                  onResume={live.resume}
                  onStop={() => void handleStop()}
                  onCapture={live.captureFrame}
                  onFlipCamera={handleFlipCamera}
                  hasTorch={live.hasTorch}
                  torchActive={live.torchActive}
                  onToggleTorch={() => void live.toggleTorch()}
                />
              </Card>
              <LiveStats
                framesProcessed={live.framesProcessed}
                totalDamages={live.totalObserved}
                byPriority={live.byPriority}
              />
            </div>
            <div className="space-y-5">
              <CurrentDetection detection={live.currentDetection} />
              <DetectionFeed detections={live.detections} onSelect={setSelectedDetectionId} />
            </div>
          </div>
        )}
      </main>

      <DetectionDetailsDrawer detection={selectedDetection} onClose={() => setSelectedDetectionId(null)} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
