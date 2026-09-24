"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { priorityConfig } from "@/lib/priorityConfig";
import type { DashboardStats } from "@/lib/types";

export function DailyTrendChart({ data }: { data: DashboardStats["dailyTrend"] }) {
  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Daily Trend (Last 7 Days)</CardTitle>
      </CardHeader>
      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#EDEFF6" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short" })
              }
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              labelFormatter={(d) => new Date(String(d)).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
              contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E7E9F1" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
            />
            <Line type="monotone" dataKey="total" name="Total Damages" stroke="#5B5FEE" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="P1" name="P1 (Critical)" stroke={priorityConfig.P1.color} strokeWidth={2} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="P2" name="P2" stroke={priorityConfig.P2.color} strokeWidth={2} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="P3" name="P3" stroke={priorityConfig.P3.color} strokeWidth={2} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="P4" name="P4" stroke={priorityConfig.P4.color} strokeWidth={2} dot={{ r: 2.5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
