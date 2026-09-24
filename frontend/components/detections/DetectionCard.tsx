import { Camera } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/Badge";
import { priorityConfig, damageTypeConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

export function DetectionCard({ detection, onView }: { detection: Detection; onView: () => void }) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
        <Camera size={22} className="text-slate-600" />
        <div
          className="absolute border-2 rounded"
          style={{ borderColor: priorityConfig[detection.priority].color, left: "30%", top: "34%", width: "34%", height: "28%" }}
        />
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {damageTypeConfig[detection.damageType].label}
          </span>
          <PriorityBadge priority={detection.priority} compact />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {(detection.confidence * 100).toFixed(0)}% confidence
        </span>
        <span className="text-xs text-slate-400">
          {detection.road} · {detection.detectedAt}
        </span>
        <Button variant="outline" size="sm" className="mt-2" onClick={onView}>
          View Details
        </Button>
      </div>
    </Card>
  );
}
