"use client";

import { useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Eye, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/Badge";
import { damageTypeConfig, priorityConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

export function AnnotatedFramePreview({ detections }: { detections: Detection[] }) {
  const [index, setIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  if (detections.length === 0) return null;
  const currentIndex = Math.min(index, detections.length - 1);
  const d = detections[currentIndex];

  const handlePrev = () => {
    setImgError(false);
    setIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setImgError(false);
    setIndex((i) => Math.min(detections.length - 1, i + 1));
  };

  const selectFrame = (idx: number) => {
    setImgError(false);
    setIndex(idx);
  };

  return (
    <Card className="p-5">
      <CardHeader>
        <div>
          <CardTitle>Annotated Frame Snapshots</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            Key video frames where road damage was detected with bounding boxes and priority tags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Damage {currentIndex + 1} of {detections.length}
          </span>
        </div>
      </CardHeader>

      <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 flex items-center justify-center mb-4 border border-border group shadow-inner">
        {d.imageUrl && !imgError ? (
          <img
            src={d.imageUrl}
            alt={`${damageTypeConfig[d.damageType]?.label ?? d.damageType} at frame ${d.frameIndex}`}
            className="w-full h-full object-contain bg-black"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Camera size={36} className="text-slate-600 mb-2 animate-pulse" />
            <span className="text-sm font-medium text-slate-400">Frame Snapshot #{d.frameIndex}</span>
            <span className="text-xs text-slate-500 mt-1">
              Timestamp {d.timestamp} · {damageTypeConfig[d.damageType]?.label ?? d.damageType}
            </span>
            <div
              className="mt-3 px-3 py-1.5 rounded-md border text-xs font-mono"
              style={{ borderColor: priorityConfig[d.priority]?.color, color: priorityConfig[d.priority]?.color }}
            >
              Priority: {d.priority} ({priorityConfig[d.priority]?.label}) · {(d.confidence * 100).toFixed(1)}% Confidence
            </div>
          </div>
        )}

        {/* Overlay HUD Tags */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none">
          <PriorityBadge priority={d.priority} />
          <span className="text-xs font-semibold text-white bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 shadow-sm">
            {damageTypeConfig[d.damageType]?.label ?? d.damageType}
          </span>
          <span className="text-xs text-emerald-400 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono shadow-sm">
            {(d.confidence * 100).toFixed(1)}% conf
          </span>
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
          <span className="text-xs text-slate-200 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono shadow-sm">
            ⏱ {d.timestamp}
          </span>
          <span className="text-xs text-slate-300 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono shadow-sm">
            Frame #{d.frameIndex}
          </span>
        </div>
      </div>

      {/* Frame thumbnails strip */}
      {detections.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 scrollbar-thin">
          {detections.map((det, idx) => (
            <button
              key={det.id || idx}
              type="button"
              onClick={() => selectFrame(idx)}
              className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all p-1 text-left ${
                idx === currentIndex
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-slate-400 opacity-70 hover:opacity-100"
              }`}
              style={{ width: "90px" }}
            >
              <div className="h-12 bg-slate-900 rounded flex items-center justify-center overflow-hidden">
                {det.imageUrl ? (
                  <img src={det.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">#{det.frameIndex}</span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] px-0.5">
                <span className="font-semibold" style={{ color: priorityConfig[det.priority]?.color }}>
                  {det.priority}
                </span>
                <span className="text-slate-400 truncate max-w-[50px]">
                  {det.timestamp.slice(3)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <Button variant="outline" size="sm" disabled={currentIndex === 0} onClick={handlePrev}>
          <ChevronLeft size={14} className="mr-1" /> Previous Damage
        </Button>
        <div className="text-xs text-slate-400 hidden sm:block">
          Use buttons or thumbnails above to inspect each detected defect
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === detections.length - 1}
          onClick={handleNext}
        >
          Next Damage <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </Card>
  );
}
