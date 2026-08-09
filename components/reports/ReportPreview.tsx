import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import { damageTypeConfig, priorityConfig, priorityOrder } from "@/lib/priorityConfig";
import type { ReportPreviewData } from "@/lib/types";

export function ReportPreview({ data }: { data: ReportPreviewData }) {
  return (
    <Card className="p-8 max-w-3xl">
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">RoadVision</div>
          <div className="text-xs text-slate-400">Smart Road Monitoring — Inspection Report</div>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>{data.dateRange}</div>
        </div>
      </div>

      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">{data.title}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryStat label="Road Health Score" value={`${data.roadHealthScore}/100`} />
        <SummaryStat label="Total Damages" value={String(data.totalDamages)} />
        {priorityOrder.slice(0, 2).map((p) => (
          <SummaryStat key={p} label={priorityConfig[p].fullLabel} value={String(data.countByPriority[p])} color={priorityConfig[p].color} />
        ))}
      </div>

      <div className="rounded-xl border border-border h-40 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center gap-2 text-slate-400 mb-6">
        <MapPin size={16} />
        <span className="text-xs">Map snapshot placeholder</span>
      </div>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Top Critical Detections</h3>
      <div className="space-y-2 mb-6">
        {data.topCriticalDetections.map((d) => (
          <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
            <span className="text-slate-700 dark:text-slate-200">{damageTypeConfig[d.damageType].label}</span>
            <span className="text-slate-500 dark:text-slate-400">{d.road}, {d.area}</span>
            <PriorityBadge priority={d.priority} compact />
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Recommendations</h3>
      <ul className="space-y-1.5">
        {data.recommendations.map((r, i) => (
          <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex gap-2">
            <span className="text-primary">•</span>
            {r}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400 mb-0.5">{label}</div>
      <div className="text-lg font-bold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
