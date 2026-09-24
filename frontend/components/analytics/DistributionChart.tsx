"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export function DistributionChart({
  title,
  data,
}: {
  title: string;
  data: { label: string; count: number; color: string }[];
}) {
  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={0} outerRadius={80} stroke="none">
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E7E9F1" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
