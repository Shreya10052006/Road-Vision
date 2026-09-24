"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export function RoadRanking({ data }: { data: { road: string; count: number }[] }) {
  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Most Affected Roads</CardTitle>
      </CardHeader>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
            <CartesianGrid stroke="#EDEFF6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="road" width={140} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E7E9F1" }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16} fill="#5B5FEE" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
