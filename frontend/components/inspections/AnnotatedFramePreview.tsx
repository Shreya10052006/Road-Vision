"use client";

import { useState } from "react";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/Badge";
import { damageTypeConfig, priorityConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

export function AnnotatedFramePreview({ detections }: { detections: Detection[] }) {
  const [index, setIndex] = useState(0);
  if (detections.length === 0) return null;
  const d = detections[Math.min(index, detections.length - 1)];

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Annotated Frame Preview</CardTitle>
        <span className="text-xs text-slate-400">
          Frame {index + 1} of {detections.length}
        </span>
      </CardHeader>
      <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 flex items-center justify-center mb-4">
        <Camera size={28} className="text-slate-600" />
        <div
          className="absolute border-2 rounded"
          style={{ borderColor: priorityConfig[d.priority].color, left: "32%", top: "36%", width: "30%", height: "26%" }}
        />
        <span className="absolute top-3 left-3 flex items-center gap-2">
          <PriorityBadge priority={d.priority} />
          <span className="text-xs text-white bg-black/40 px-2 py-1 rounded">
            {damageTypeConfig[d.damageType].label}
          </span>
        </span>
        <span className="absolute bottom-3 right-3 text-xs text-white bg-black/40 px-2 py-1 rounded font-mono">
          {d.timestamp}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
          <ChevronLeft size={14} /> Previous Frame
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={index === detections.length - 1}
          onClick={() => setIndex((i) => Math.min(detections.length - 1, i + 1))}
        >
          Next Frame <ChevronRight size={14} />
        </Button>
      </div>
    </Card>
  );
}
