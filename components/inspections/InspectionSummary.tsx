import { Card } from "@/components/ui/Card";
import { priorityConfig, priorityOrder } from "@/lib/priorityConfig";
import type { Inspection } from "@/lib/types";

export function InspectionSummary({ inspection }: { inspection: Inspection }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      <SummaryCard label="Frames Processed" value={inspection.framesProcessed.toLocaleString()} />
      <SummaryCard label="Damages Detected" value={String(inspection.totalDamages)} />
      {priorityOrder.map((p) => (
        <SummaryCard key={p} label={p} value={String(inspection.countByPriority[p])} color={priorityConfig[p].color} />
      ))}
      <SummaryCard label="Road Health Score" value={`${inspection.roadHealthScore}/100`} color="#43A047" />
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
    </Card>
  );
}
