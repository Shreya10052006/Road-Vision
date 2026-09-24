import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDelta } from "@/lib/utils";
import type { DashboardStats } from "@/lib/types";

export function RoadHealthDistribution({
  distribution,
  score,
  delta,
}: {
  distribution: DashboardStats["roadHealthDistribution"];
  score: number;
  delta: number;
}) {
  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Road Health Distribution</CardTitle>
        <Link href="/analytics" className="text-xs font-medium text-primary hover:underline">
          View details →
        </Link>
      </CardHeader>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {distribution.map((d) => (
          <div
            key={d.label}
            className="rounded-xl px-3 py-4 text-white flex flex-col gap-1"
            style={{ backgroundColor: d.color }}
          >
            <span className="text-[11px] font-medium opacity-90">{d.label}</span>
            <span className="text-xl font-bold">{d.percentage}%</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Road Health Score: <span className="font-bold text-green-600">{score} / 100</span>
        </span>
        <span className="text-xs font-medium text-green-600">{formatDelta(delta, "%")} vs last week</span>
      </div>
    </Card>
  );
}
