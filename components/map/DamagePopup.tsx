"use client";

import { Camera } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { damageTypeConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

export function DamagePopup({ detection, onViewDetails }: { detection: Detection | null; onViewDetails: () => void }) {
  return (
    <Card className="p-5 h-full">
      {!detection ? (
        <EmptyState
          icon={<Camera size={20} />}
          title="No marker selected"
          description="Click any point on the map to see detection details."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden aspect-video bg-slate-900 flex items-center justify-center">
            <Camera size={26} className="text-slate-600" />
          </div>
          <PriorityBadge priority={detection.priority} />
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {damageTypeConfig[detection.damageType].label}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {detection.road}, {detection.area}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Confidence</div>
              <div className="font-medium text-slate-800 dark:text-slate-100">
                {(detection.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Detected</div>
              <div className="font-medium text-slate-800 dark:text-slate-100">{detection.detectedAt}</div>
            </div>
          </div>
          <Button className="w-full" onClick={onViewDetails}>
            View Detection
          </Button>
        </div>
      )}
    </Card>
  );
}
