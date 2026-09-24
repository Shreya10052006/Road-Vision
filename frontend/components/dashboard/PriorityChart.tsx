"use client";

import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { priorityConfig, priorityOrder } from "@/lib/priorityConfig";
import type { DashboardStats } from "@/lib/types";

export function PriorityChart({ data }: { data: DashboardStats["damageByPriority"] }) {
  const total = data.reduce((a, b) => a + b.count, 0);
  const chartData = priorityOrder.map((p) => {
    const row = data.find((d) => d.priority === p);
    return { priority: p, label: priorityConfig[p].fullLabel, count: row?.count ?? 0, color: priorityConfig[p].color };
  });

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Damage by Priority</CardTitle>
        <Link href="/detections" className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </CardHeader>
      <div className="flex items-center gap-4">
        <div className="relative w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="count" nameKey="label" innerRadius={32} outerRadius={54} stroke="none">
                {chartData.map((d) => (
                  <Cell key={d.priority} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} detections`, String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-slate-900 dark:text-white">{total}</span>
            <span className="text-[10px] text-slate-400">Total</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {chartData.map((d) => (
            <div key={d.priority} className="flex items-center justify-between text-xs gap-2">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                {d.label}
              </span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0">
                {d.count} ({total ? ((d.count / total) * 100).toFixed(1) : "0.0"}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
