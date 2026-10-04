"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  Pause,
  SwitchCamera,
  Flashlight,
  FlashlightOff,
  FlipHorizontal,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityConfig, damageTypeConfig } from "@/lib/priorityConfig";
import type { ApiDetection } from "@/lib/api";
import type { CameraFacingMode, DamageType } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function damageLabel(value: string) {
  return (
    damageTypeConfig[value as DamageType]?.label ??
    value.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

export function CameraPreview({
  status,
  elapsedSeconds,
  videoRef,
  boxes,
  frameSize,
  latencyMs,
  facingMode,
  isMirrored,
  hasTorch,
  torchActive,
  potholeAlert,
  onFlipCamera,
  onToggleTorch,
  onToggleMirror,
}: {
  status: "idle" | "running" | "paused";
  elapsedSeconds: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  boxes: ApiDetection[];
  frameSize: { width: number; height: number } | null;
  latencyMs?: number | null;
  facingMode?: CameraFacingMode;
  isMirrored?: boolean;
  hasTorch?: boolean;
  torchActive?: boolean;
  potholeAlert?: boolean;
  onFlipCamera?: () => void;
  onToggleTorch?: () => void;
  onToggleMirror?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderBox, setRenderBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>({ left: 0, top: 0, width: 0, height: 0 });

  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = Math.floor(elapsedSeconds % 60);

  // Measure exact displayed video rect to avoid letterbox/pillarbox offset on phones
  const updateRenderBox = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;
    const vWidth = video?.videoWidth || frameSize?.width || 1280;
    const vHeight = video?.videoHeight || frameSize?.height || 720;

    if (!cWidth || !cHeight || !vWidth || !vHeight) return;

    const videoAspect = vWidth / vHeight;
    const containerAspect = cWidth / cHeight;

    let width: number;
    let height: number;
    let left: number;
    let top: number;

    if (containerAspect > videoAspect) {
      height = cHeight;
      width = cHeight * videoAspect;
      top = 0;
      left = (cWidth - width) / 2;
    } else {
      width = cWidth;
      height = cWidth / videoAspect;
      left = 0;
      top = (cHeight - height) / 2;
    }

    setRenderBox({ left, top, width, height });
  }, [frameSize, videoRef]);

  useEffect(() => {
    updateRenderBox();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      updateRenderBox();
    });
    observer.observe(container);
    window.addEventListener("resize", updateRenderBox);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateRenderBox);
    };
  }, [updateRenderBox]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        /* fullscreen error */
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch {
        /* exit error */
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      updateRenderBox();
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, [updateRenderBox]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 flex items-center justify-center select-none shadow-xl border border-slate-800/80",
        isFullscreen ? "w-screen h-screen rounded-none" : "aspect-video min-h-[260px] sm:min-h-[380px]",
      )}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        onLoadedMetadata={updateRenderBox}
        className={cn(
          "absolute inset-0 w-full h-full object-contain transition-opacity duration-200",
          status === "idle" && "opacity-0",
          isMirrored && "scale-x-[-1]",
        )}
      />

      {status === "idle" ? (
        <div className="relative z-10 flex flex-col items-center gap-3 text-slate-400 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 shadow-inner">
            <Camera size={32} />
          </div>
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-200">Camera Preview Ready</div>
            <div className="text-xs text-slate-400 max-w-sm">
              Press <span className="font-semibold text-primary">Start Inspection</span> to stream from phone or webcam with live road defect detection.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Bounding Box Overlay positioned exactly matching the rendered video */}
          {frameSize && renderBox.width > 0 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${renderBox.left}px`,
                top: `${renderBox.top}px`,
                width: `${renderBox.width}px`,
                height: `${renderBox.height}px`,
              }}
            >
              {boxes.map((d, i) => {
                const color = priorityConfig[d.priority].color;
                const isPothole = d.damage_type === "pothole";
                const leftPct = isMirrored
                  ? ((frameSize.width - d.bbox.x - d.bbox.width) / frameSize.width) * 100
                  : (d.bbox.x / frameSize.width) * 100;
                const topPct = (d.bbox.y / frameSize.height) * 100;
                const widthPct = (d.bbox.width / frameSize.width) * 100;
                const heightPct = (d.bbox.height / frameSize.height) * 100;

                return (
                  <div
                    key={`${i}-${d.damage_type}-${d.bbox.x}-${d.bbox.y}`}
                    className={cn(
                      "absolute border-2 rounded-lg transition-all duration-75",
                      isPothole && "ring-2 ring-red-400/50 shadow-lg shadow-red-500/20 animate-pulse",
                    )}
                    style={{
                      borderColor: color,
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      backgroundColor: `${color}15`,
                    }}
                  >
                    {/* Bounding Box Tag Label */}
                    <div
                      className="absolute -top-7 left-0 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md text-white whitespace-nowrap shadow-md"
                      style={{ backgroundColor: color }}
                    >
                      {isPothole && <AlertTriangle size={11} className="shrink-0 animate-bounce" />}
                      <span>{damageLabel(d.damage_type)}</span>
                      <span className="opacity-80">·</span>
                      <span>{d.priority}</span>
                      <span className="opacity-80">·</span>
                      <span>{(d.confidence * 100).toFixed(0)}%</span>
                    </div>

                    {/* Corner Crosshairs */}
                    <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white/80" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white/80" />
                    <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white/80" />
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white/80" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Realtime Pothole Hazard Warning Banner */}
          {potholeAlert && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-red-600/90 text-white font-bold text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-lg backdrop-blur flex items-center gap-2 animate-bounce border border-red-400">
              <AlertTriangle size={16} />
              <span>POTHOLE DETECTED</span>
            </div>
          )}

          {/* Top Status Bar: Live badge, Timer, Latency, Camera Info */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1.5 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur",
                  status === "running" ? "bg-red-600/90" : "bg-slate-700/90",
                )}
              >
                <span
                  className={cn("w-2 h-2 rounded-full bg-white", status === "running" && "animate-pulse")}
                />
                {status === "running" ? "LIVE DETECTION" : "PAUSED"}
              </span>

              <span className="text-white text-xs font-mono bg-black/60 backdrop-blur px-2.5 py-1 rounded-full shadow-md">
                {pad(h)}:{pad(m)}:{pad(s)}
              </span>

              {latencyMs != null && status === "running" && (
                <span className="hidden sm:inline-block text-white/90 text-[11px] font-mono bg-black/60 backdrop-blur px-2.5 py-1 rounded-full shadow-md">
                  {Math.round(latencyMs)} ms
                </span>
              )}
            </div>

            {/* Camera Switch & Quick Action Controls Overlay */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {onFlipCamera && (
                <button
                  type="button"
                  onClick={onFlipCamera}
                  className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-xs font-medium"
                  title="Flip between Front and Back Camera"
                  aria-label="Flip Camera"
                >
                  <SwitchCamera size={16} />
                  <span className="hidden sm:inline">
                    {facingMode === "user" ? "Front (Cabin)" : "Back (Road)"}
                  </span>
                </button>
              )}

              {hasTorch && onToggleTorch && (
                <button
                  type="button"
                  onClick={onToggleTorch}
                  className={cn(
                    "p-2 rounded-full backdrop-blur shadow-md transition-all active:scale-95",
                    torchActive ? "bg-amber-500 text-black" : "bg-black/60 hover:bg-black/80 text-white",
                  )}
                  title={torchActive ? "Turn Flashlight Off" : "Turn Flashlight On"}
                  aria-label="Toggle Flashlight"
                >
                  {torchActive ? <FlashlightOff size={16} /> : <Flashlight size={16} />}
                </button>
              )}

              {onToggleMirror && (
                <button
                  type="button"
                  onClick={onToggleMirror}
                  className={cn(
                    "hidden sm:flex p-2 rounded-full backdrop-blur shadow-md transition-all active:scale-95",
                    isMirrored ? "bg-blue-600/90 text-white" : "bg-black/60 hover:bg-black/80 text-white",
                  )}
                  title={isMirrored ? "Mirroring Enabled" : "Mirroring Disabled"}
                  aria-label="Toggle Mirror Preview"
                >
                  <FlipHorizontal size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur shadow-md transition-all active:scale-95"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Paused state overlay */}
          {status === "paused" && (
            <div className="relative z-10 flex flex-col items-center gap-2 text-slate-200 bg-black/40 backdrop-blur-sm px-6 py-4 rounded-2xl">
              <Pause size={32} className="text-amber-400" />
              <span className="text-sm font-semibold">Inspection Paused</span>
              <span className="text-xs text-slate-300">Click Resume to continue live detection</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
