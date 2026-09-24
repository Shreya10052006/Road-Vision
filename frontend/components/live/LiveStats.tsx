import { Card } from "@/components/ui/Card";
import { priorityConfig } from "@/lib/priorityConfig";
import type { Priority } from "@/lib/types";

export function LiveStats({
  framesProcessed,
  totalDamages,
  byPriority,
}: {
  framesProcessed: number;
  totalDamages: number;
  byPriority: Record<Priority, number>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="p-4">
        <div className="text-[11px] text-slate-400 mb-1">Frames Processed</div>
        <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
          {framesProcessed.toLocaleString()}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-[11px] text-slate-400 mb-1">Damages Detected</div>
        <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{totalDamages}</div>
      </Card>
      {(["P1", "P2"] as Priority[]).map((p) => (
        <Card key={p} className="p-4">
          <div className="text-[11px] text-slate-400 mb-1">{p}</div>
          <div className="text-xl font-bold tabular-nums" style={{ color: priorityConfig[p].color }}>
            {byPriority[p]}
          </div>
        </Card>
      ))}
    </div>
  );
}
