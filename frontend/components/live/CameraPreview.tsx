"use client";

import { Camera, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityConfig, damageTypeConfig } from "@/lib/priorityConfig";
import type { ApiDetection } from "@/lib/api";
import type { DamageType } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function damageLabel(value: string) {
  return (
    damageTypeConfig[value as DamageType]?.label ??
    value.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

/**
 * Live webcam preview with the real YOLO detections drawn on top.
 *
 * Boxes arrive in pixel coordinates of the captured frame, so they are
 * converted to percentages of that frame — the overlay then scales with the
 * video element at any size. The preview is deliberately not CSS-mirrored,
 * which keeps every box aligned with the frame the camera actually sent.
 */
export function CameraPreview({
  status,
  elapsedSeconds,
  videoRef,
  boxes,
  frameSize,
  latencyMs,
}: {
  status: "idle" | "running" | "paused";
  elapsedSeconds: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  boxes: ApiDetection[];
  frameSize: { width: number; height: number } | null;
  latencyMs?: number | null;
}) {
  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = Math.floor(elapsedSeconds % 60);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 aspect-video flex items-center justify-center">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={cn("absolute inset-0 w-full h-full object-contain", status === "idle" && "opacity-0")}
      />

      {status === "idle" ? (
        <div className="relative z-10 flex flex-col items-center gap-2 text-slate-500">
          <Camera size={32} />
          <span className="text-sm">Camera preview will appear here</span>
          <span className="text-xs text-slate-600">Press Start Inspection to begin</span>
        </div>
      ) : (
        <>
          {frameSize &&
            boxes.map((d, i) => {
              const color = priorityConfig[d.priority].color;
              return (
                <div
                  key={`${i}-${d.damage_type}`}
                  className="absolute border-2 rounded pointer-events-none"
                  style={{
                    borderColor: color,
                    left: `${(d.bbox.x / frameSize.width) * 100}%`,
                    top: `${(d.bbox.y / frameSize.height) * 100}%`,
                    width: `${(d.bbox.width / frameSize.width) * 100}%`,
                    height: `${(d.bbox.height / frameSize.height) * 100}%`,
                  }}
                >
                  <span
                    className="absolute -top-6 left-0 text-[10px] font-semibold px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                    style={{ backgroundColor: color }}
                  >
                    {damageLabel(d.damage_type)} · {d.priority} · {(d.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 text-white text-[11px] font-bold px-2 py-1 rounded",
                status === "running" ? "bg-red-600" : "bg-slate-600",
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full bg-white", status === "running" && "animate-pulse")} />
              {status === "running" ? "LIVE" : "PAUSED"}
            </span>
            <span className="text-white text-xs font-mono bg-black/40 px-2 py-1 rounded">
              {pad(h)}:{pad(m)}:{pad(s)}
            </span>
            {latencyMs != null && status === "running" && (
              <span className="text-white/80 text-[11px] font-mono bg-black/40 px-2 py-1 rounded">
                {Math.round(latencyMs)} ms/frame
              </span>
            )}
          </div>

          {status === "paused" && (
            <div className="relative z-10 flex flex-col items-center gap-2 text-slate-300">
              <Pause size={28} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
