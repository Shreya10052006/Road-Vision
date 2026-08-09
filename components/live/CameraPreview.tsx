"use client";

import { Camera, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityConfig } from "@/lib/priorityConfig";
import { damageTypeConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CameraPreview({
  status,
  elapsedSeconds,
  currentDetection,
}: {
  status: "idle" | "running" | "paused";
  elapsedSeconds: number;
  currentDetection: Detection | null;
}) {
  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = Math.floor(elapsedSeconds % 60);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 aspect-video flex items-center justify-center">
      {/* Simulated road texture */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage:
          "repeating-linear-gradient(180deg, transparent 0px, transparent 60px, rgba(255,255,255,0.06) 60px, rgba(255,255,255,0.06) 64px)",
      }} />
      <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 opacity-20" style={{
        backgroundImage: "repeating-linear-gradient(180deg, #fff 0 24px, transparent 24px 48px)",
      }} />

      {status === "idle" ? (
        <div className="relative z-10 flex flex-col items-center gap-2 text-slate-500">
          <Camera size={32} />
          <span className="text-sm">Camera preview will appear here</span>
          <span className="text-xs text-slate-600">Press Start Inspection to begin</span>
        </div>
      ) : (
        <>
          {/* Scanning line */}
          {status === "running" && (
            <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-scan pointer-events-none" />
          )}

          {/* Bounding box overlay for current detection */}
          {currentDetection && status === "running" && (
            <div
              className="absolute border-2 rounded animate-in fade-in"
              style={{
                borderColor: priorityConfig[currentDetection.priority].color,
                left: "38%",
                top: "42%",
                width: "26%",
                height: "22%",
              }}
            >
              <span
                className="absolute -top-6 left-0 text-[10px] font-semibold px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                style={{ backgroundColor: priorityConfig[currentDetection.priority].color }}
              >
                {damageTypeConfig[currentDetection.damageType].label} · {currentDetection.priority}
              </span>
            </div>
          )}

          {/* LIVE badge + timer */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 text-white text-[11px] font-bold px-2 py-1 rounded",
                status === "running" ? "bg-red-600" : "bg-slate-600"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full bg-white", status === "running" && "animate-pulse")} />
              {status === "running" ? "LIVE" : "PAUSED"}
            </span>
            <span className="text-white text-xs font-mono bg-black/40 px-2 py-1 rounded">
              {pad(h)}:{pad(m)}:{pad(s)}
            </span>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-2 text-slate-600">
            {status === "paused" ? <Pause size={28} /> : <Play size={28} className="opacity-40" />}
          </div>
        </>
      )}
    </div>
  );
}
