"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
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
import { useLiveSimulation } from "@/lib/hooks/useLiveSimulation";
import { useCamera } from "@/contexts/CameraContext";
import { useToast } from "@/contexts/ToastContext";
import type { Detection } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function LivePage() {
  const sim = useLiveSimulation();
  const { source, setSource, connect, disconnect } = useCamera();
  const { showToast } = useToast();
  const router = useRouter();
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const selectedDetection: Detection | null = sim.detections.find((d) => d.id === selectedDetectionId) ?? null;

  const handleStart = () => {
    connect();
    sim.start();
    showToast("Live inspection started", "success");
  };

  const handleStop = () => {
    sim.stop();
    disconnect();
    showToast("Inspection completed", "success");
  };

  const handleNewSession = () => {
    sim.reset();
  };

  const m = Math.floor(sim.elapsedSeconds / 60);
  const s = sim.elapsedSeconds % 60;

  return (
    <>
      <Header title="Live Inspection Center" subtitle="Real-time road damage monitoring" />
      <main className="flex-1 p-4 sm:p-8 space-y-5">
        <Card className="p-4">
          <CameraSourceSelector
            source={source}
            onChange={setSource}
            connected={sim.status === "running" || sim.status === "paused"}
            disabled={sim.status !== "idle"}
          />
        </Card>

        {sim.status === "completed" ? (
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600">
              <CheckCircle2 size={26} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Inspection Completed</h2>
            <div className="grid grid-cols-4 gap-8 mt-2">
              <Stat label="Duration" value={`${pad(m)}:${pad(s)}`} />
              <Stat label="Frames" value={sim.framesProcessed.toLocaleString()} />
              <Stat label="Damages" value={String(sim.detections.length)} />
              <Stat label="Critical" value={String(sim.byPriority.P1)} />
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => router.push("/inspections/INSP-2025-124")}>
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
              <CameraPreview status={sim.status} elapsedSeconds={sim.elapsedSeconds} currentDetection={sim.currentDetection} />
              <Card className="p-5">
                <LiveControls
                  status={sim.status}
                  onStart={handleStart}
                  onPause={sim.pause}
                  onResume={sim.resume}
                  onStop={handleStop}
                  onCapture={sim.captureFrame}
                />
              </Card>
              <LiveStats framesProcessed={sim.framesProcessed} totalDamages={sim.detections.length} byPriority={sim.byPriority} />
            </div>
            <div className="space-y-5">
              <CurrentDetection detection={sim.currentDetection} />
              <DetectionFeed detections={sim.detections} onSelect={setSelectedDetectionId} />
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
