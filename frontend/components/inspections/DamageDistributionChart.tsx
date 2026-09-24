"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { damageTypeConfig, damageTypeOrder } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

const TYPE_COLORS = ["#5B5FEE", "#43A047", "#FB8C00", "#8E5BEE", "#0EA5E9", "#334155"];

export function DamageDistributionChart({ detections }: { detections: Detection[] }) {
  const data = damageTypeOrder.map((type, idx) => ({
    label: damageTypeConfig[type].label,
    count: detections.filter((d) => d.damageType === type).length,
    color: TYPE_COLORS[idx % TYPE_COLORS.length],
  }));

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Damage Distribution</CardTitle>
      </CardHeader>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke="#EDEFF6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E7E9F1" }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
