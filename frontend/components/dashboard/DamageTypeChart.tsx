"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { damageTypeConfig, damageTypeOrder } from "@/lib/priorityConfig";
import type { DashboardStats } from "@/lib/types";

const TYPE_COLORS = ["#5B5FEE", "#43A047", "#FB8C00", "#8E5BEE", "#0EA5E9", "#334155"];

export function DamageTypeChart({ data }: { data: DashboardStats["damageByType"] }) {
  const total = data.reduce((a, b) => a + b.count, 0);
  const chartData = damageTypeOrder.map((type, idx) => {
    const row = data.find((d) => d.type === type);
    const count = row?.count ?? 0;
    const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
    return {
      type,
      label: damageTypeConfig[type]?.label ?? type,
      count,
      percentage,
      color: TYPE_COLORS[idx % TYPE_COLORS.length],
    };
  });

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Damage by Type</CardTitle>
        <Link href="/detections" className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </CardHeader>
      <div className="flex items-center gap-4">
        <div className="relative w-[130px] h-[130px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.type} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} detections`, String(name)]}
                contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E7E9F1" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-slate-900 dark:text-white">{total}</span>
            <span className="text-[10px] text-slate-400">Total</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {chartData.map((entry) => (
            <div key={entry.type} className="flex items-center justify-between text-xs gap-2">
              <span className="flex items-center gap-1.5 min-w-0 text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="truncate">{entry.label}</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0">
                {entry.count} ({entry.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
