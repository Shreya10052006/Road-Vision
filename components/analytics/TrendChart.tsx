"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export function TrendChart({
  title,
  data,
  dataKey,
  color,
  suffix = "",
}: {
  title: string;
  data: { date: string; [key: string]: string | number }[];
  dataKey: string;
  color: string;
  suffix?: string;
}) {
  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="h-[220px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#EDEFF6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              formatter={(value) => [`${value}${suffix}`, title]}
              contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E7E9F1" }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
