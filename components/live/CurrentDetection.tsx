import { ScanSearch } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { damageTypeConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

export function CurrentDetection({ detection }: { detection: Detection | null }) {
  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Current Detection</CardTitle>
      </CardHeader>
      {!detection ? (
        <EmptyState
          icon={<ScanSearch size={20} />}
          title="Scanning for damage"
          description="The next detected defect will appear here."
        />
      ) : (
        <div className="space-y-3">
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {damageTypeConfig[detection.damageType].label}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">Confidence</div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {(detection.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">Frame</div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{detection.frameIndex}</div>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Priority</div>
            <PriorityBadge priority={detection.priority} />
          </div>
        </div>
      )}
    </Card>
  );
}
