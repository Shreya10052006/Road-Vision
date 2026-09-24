"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { damageTypeConfig } from "@/lib/priorityConfig";
import { Radio } from "lucide-react";
import type { Detection } from "@/lib/types";

export function DetectionFeed({
  detections,
  onSelect,
}: {
  detections: Detection[];
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Live Detection Feed</CardTitle>
      </CardHeader>
      {detections.length === 0 ? (
        <EmptyState icon={<Radio size={20} />} title="No detections yet" description="Detected defects will stream in here as they happen." />
      ) : (
        <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
          {detections.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className="w-full flex items-center justify-between gap-3 text-left px-2 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors animate-in fade-in"
            >
              <span className="text-xs font-mono text-slate-400 shrink-0 w-16">{d.detectedAt}</span>
              <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {damageTypeConfig[d.damageType].label}
              </span>
              <PriorityBadge priority={d.priority} compact />
              <span className="text-[11px] text-green-600 shrink-0">Saved</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
