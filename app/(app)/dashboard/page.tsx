"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Gauge, MapPinned, ShieldAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { DamageTypeChart } from "@/components/dashboard/DamageTypeChart";
import { PriorityChart } from "@/components/dashboard/PriorityChart";
import { ActiveAlertsPanel } from "@/components/dashboard/ActiveAlertsPanel";
import { HotspotMap } from "@/components/dashboard/HotspotMap";
import { RecentInspectionsTable } from "@/components/dashboard/RecentInspectionsTable";
import { DailyTrendChart } from "@/components/dashboard/DailyTrendChart";
import { RoadHealthDistribution } from "@/components/dashboard/RoadHealthDistribution";
import { CardSkeleton } from "@/components/ui/States";
import { Card } from "@/components/ui/Card";
import { getDashboardStats, getRecentInspections } from "@/lib/services/dashboardService";
import { getActiveAlerts } from "@/lib/services/alertService";
import { getMapDetections } from "@/lib/services/mapService";
import { formatDelta } from "@/lib/utils";
import type { Alert, DashboardStats, Inspection, MapDetection } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [mapDetections, setMapDetections] = useState<MapDetection[] | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getDashboardStats(), getRecentInspections(5), getActiveAlerts(), getMapDetections({ scope: "today" })]).then(
      ([s, i, a, m]) => {
        if (!active) return;
        setStats(s);
        setInspections(i);
        setAlerts(a);
        setMapDetections(m);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const loading = !stats || !inspections || !alerts || !mapDetections;

  return (
    <>
      <Header title="Dashboard" subtitle="Real-time overview of road inspection and maintenance" />
      <main className="flex-1 p-4 sm:p-8 space-y-5">
        {/* Row 1 — KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-5">
                <CardSkeleton lines={2} />
              </Card>
            ))
          ) : (
            <>
              <StatCard
                label="Road Health Score"
                value={`${stats.roadHealthScore} / 100`}
                delta={formatDelta(stats.roadHealthDelta, "%")}
                deltaLabel="vs last week"
                icon={Gauge}
                iconBg="bg-green-50 dark:bg-green-500/10"
                iconColor="text-green-600"
                ring={{ value: stats.roadHealthScore, color: "#43A047" }}
              />
              <StatCard
                label="Total Inspections"
                subtitle="Today"
                value={String(stats.totalInspectionsToday)}
                delta={formatDelta(stats.totalInspectionsDelta)}
                deltaLabel="vs yesterday"
                icon={Activity}
                iconBg="bg-blue-50 dark:bg-blue-500/10"
                iconColor="text-blue-600"
              />
              <StatCard
                label="Total Damages Detected"
                subtitle="Today"
                value={String(stats.totalDamagesToday)}
                delta={formatDelta(stats.totalDamagesDelta)}
                deltaLabel="vs yesterday"
                icon={AlertTriangle}
                iconBg="bg-orange-50 dark:bg-orange-500/10"
                iconColor="text-orange-600"
              />
              <StatCard
                label="Critical (P1) Damages"
                subtitle="Today"
                value={String(stats.criticalP1Today)}
                delta={formatDelta(stats.criticalP1Delta)}
                deltaLabel="vs yesterday"
                icon={ShieldAlert}
                iconBg="bg-red-50 dark:bg-red-500/10"
                iconColor="text-red-600"
              />
              <StatCard
                label="Roads Inspected"
                subtitle="Today"
                value={`${stats.roadsInspectedKmToday} km`}
                delta={formatDelta(stats.roadsInspectedKmDelta, " km")}
                deltaLabel="vs yesterday"
                icon={MapPinned}
                iconBg="bg-purple-50 dark:bg-purple-500/10"
                iconColor="text-purple-600"
              />
            </>
          )}
        </div>

        {/* Row 2 — Damage by Type | Damage by Priority | Active Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {loading ? (
            <>
              <Card className="p-5"><CardSkeleton lines={6} /></Card>
              <Card className="p-5"><CardSkeleton lines={6} /></Card>
              <Card className="p-5"><CardSkeleton lines={6} /></Card>
            </>
          ) : (
            <>
              <DamageTypeChart data={stats.damageByType} />
              <PriorityChart data={stats.damageByPriority} />
              <ActiveAlertsPanel alerts={alerts} />
            </>
          )}
        </div>

        {/* Row 3 — Map | Recent Inspections */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          {loading ? (
            <>
              <Card className="p-5"><CardSkeleton lines={8} /></Card>
              <Card className="p-5"><CardSkeleton lines={8} /></Card>
            </>
          ) : (
            <>
              <HotspotMap detections={mapDetections} />
              <RecentInspectionsTable inspections={inspections} />
            </>
          )}
        </div>

        {/* Row 4 — Daily Trend | Road Health Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          {loading ? (
            <>
              <Card className="p-5"><CardSkeleton lines={6} /></Card>
              <Card className="p-5"><CardSkeleton lines={4} /></Card>
            </>
          ) : (
            <>
              <DailyTrendChart data={stats.dailyTrend} />
              <RoadHealthDistribution
                distribution={stats.roadHealthDistribution}
                score={stats.roadHealthScore}
                delta={stats.roadHealthDelta}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
