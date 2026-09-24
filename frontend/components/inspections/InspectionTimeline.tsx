import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import { damageTypeConfig, priorityConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

export function InspectionTimeline({ detections, onSelect }: { detections: Detection[]; onSelect: (id: string) => void }) {
  const sorted = [...detections].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Detection Timeline</CardTitle>
      </CardHeader>
      <div className="relative pl-4 border-l-2 border-border space-y-4 max-h-[420px] overflow-y-auto">
        {sorted.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className="relative flex items-center gap-3 w-full text-left group"
          >
            <span
              className="absolute -left-[21px] w-3 h-3 rounded-full border-2 border-card"
              style={{ backgroundColor: priorityConfig[d.priority].color }}
            />
            <span className="text-xs font-mono text-slate-400 w-16 shrink-0">{d.timestamp}</span>
            <span className="text-sm text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
              {damageTypeConfig[d.damageType].label}
            </span>
            <PriorityBadge priority={d.priority} compact />
          </button>
        ))}
      </div>
    </Card>
  );
}
