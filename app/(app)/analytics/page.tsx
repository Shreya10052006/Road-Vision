"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Gauge, MapPinned, ShieldAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnalyticsFilters, type AnalyticsFilterValue } from "@/components/analytics/AnalyticsFilters";
import { TrendChart } from "@/components/analytics/TrendChart";
import { DistributionChart } from "@/components/analytics/DistributionChart";
import { RoadRanking } from "@/components/analytics/RoadRanking";
import { CardSkeleton } from "@/components/ui/States";
import { getAnalyticsData } from "@/lib/services/analyticsService";
import { damageTypeConfig, priorityConfig } from "@/lib/priorityConfig";
import type { AnalyticsData } from "@/lib/types";

const DEFAULT_FILTERS: AnalyticsFilterValue = { dateRange: "30d", road: "all", ward: "all", damageType: "all", priority: "all" };

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilterValue>(DEFAULT_FILTERS);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let active = true;
    getAnalyticsData().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
    // Filters are demo-only (mock dataset doesn't vary by filter combination yet) — kept
    // in the effect deps so wiring a real filtered endpoint later is a one-line change.
  }, [filters]);

  return (
    <>
      <Header title="Analytics" subtitle="Analyze road condition trends, damage patterns, and maintenance priorities" />
      <main className="flex-1 p-4 sm:p-8 space-y-5">
        <AnalyticsFilters value={filters} onChange={setFilters} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {!data ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-5">
                <CardSkeleton lines={2} />
              </Card>
            ))
          ) : (
            <>
              <StatCard label="Total Inspections" value={String(data.kpis.totalInspections)} icon={Activity} iconBg="bg-blue-50 dark:bg-blue-500/10" iconColor="text-blue-600" />
              <StatCard label="Total Damages" value={String(data.kpis.totalDamages)} icon={AlertTriangle} iconBg="bg-orange-50 dark:bg-orange-500/10" iconColor="text-orange-600" />
              <StatCard label="P1 Damages" value={String(data.kpis.p1Damages)} icon={ShieldAlert} iconBg="bg-red-50 dark:bg-red-500/10" iconColor="text-red-600" />
              <StatCard label="Avg Damages / km" value={data.kpis.avgDamagesPerKm.toFixed(2)} icon={MapPinned} iconBg="bg-purple-50 dark:bg-purple-500/10" iconColor="text-purple-600" />
              <StatCard label="Road Health Score" value={`${data.kpis.roadHealthScore}/100`} icon={Gauge} iconBg="bg-green-50 dark:bg-green-500/10" iconColor="text-green-600" ring={{ value: data.kpis.roadHealthScore, color: "#43A047" }} />
            </>
          )}
        </div>

        {!data ? (
          <Card className="p-8"><CardSkeleton lines={10} /></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TrendChart title="Damage Trend" data={data.damageTrend.map((d) => ({ date: d.date, count: d.count }))} dataKey="count" color="#5B5FEE" />
              <TrendChart title="Road Health Trend" data={data.roadHealthTrend.map((d) => ({ date: d.date, score: d.score }))} dataKey="score" color="#43A047" suffix="/100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <DistributionChart
                title="Damage Type Distribution"
                data={data.damageTypeDistribution.map((d, idx) => ({
                  label: damageTypeConfig[d.type].label,
                  count: d.count,
                  color: ["#5B5FEE", "#43A047", "#FB8C00", "#8E5BEE", "#0EA5E9", "#334155"][idx % 6],
                }))}
              />
              <DistributionChart
                title="Priority Distribution"
                data={data.priorityDistribution.map((d) => ({
                  label: priorityConfig[d.priority].fullLabel,
                  count: d.count,
                  color: priorityConfig[d.priority].color,
                }))}
              />
            </div>

            <RoadRanking data={data.mostAffectedRoads} />
          </>
        )}
      </main>
    </>
  );
}
