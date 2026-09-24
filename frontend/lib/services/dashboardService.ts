/**
 * Dashboard data — read from the database via the API.
 *
 * Every number on the Dashboard is an aggregate of persisted Inspection and
 * Detection rows: seeded demonstration records and real pipeline output alike.
 * Nothing here is generated in the browser.
 */

import type { DamageType, DashboardStats, Inspection, Priority } from "@/lib/types";
import { api } from "@/lib/api";
import {
  countsByInspection,
  emptyPriorityCounts,
  mapInspection,
  type ApiDetectionRow,
  type ApiInspection,
} from "@/lib/services/mappers";

type ApiStats = {
  road_health_score: number | null;
  road_health_distribution: { label: string; percentage: number; color: string }[];
  total_inspections_today: number;
  total_damages_today: number;
  critical_p1_today: number;
  roads_inspected_today: number;
  damage_by_type: { damage_type: string; count: number }[];
  damage_by_priority: { priority: string; count: number }[];
};

type ApiTrends = {
  daily: { date: string; total: number; p1: number; p2: number; p3: number; p4: number }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [stats, trends] = await Promise.all([
    api.get<ApiStats>("/api/dashboard/stats"),
    api.get<ApiTrends>("/api/dashboard/trends?days=7"),
  ]);

  return {
    roadHealthScore: Math.round(stats.road_health_score ?? 0),
    // Deltas need a like-for-like previous period to compare against; showing
    // a fabricated one would be worse than showing none.
    roadHealthDelta: 0,
    totalInspectionsToday: stats.total_inspections_today,
    totalInspectionsDelta: 0,
    totalDamagesToday: stats.total_damages_today,
    totalDamagesDelta: 0,
    criticalP1Today: stats.critical_p1_today,
    criticalP1Delta: 0,
    roadsInspectedKmToday: stats.roads_inspected_today,
    roadsInspectedKmDelta: 0,
    damageByType: stats.damage_by_type.map((d) => ({ type: d.damage_type as DamageType, count: d.count })),
    damageByPriority: stats.damage_by_priority.map((d) => ({
      priority: d.priority as Priority,
      count: d.count,
    })),
    dailyTrend: trends.daily.map((d) => ({
      date: d.date,
      total: d.total,
      P1: d.p1,
      P2: d.p2,
      P3: d.p3,
      P4: d.p4,
    })),
    roadHealthDistribution: stats.road_health_distribution,
  };
}

export async function getRecentInspections(limit = 5): Promise<Inspection[]> {
  const [recent, detections] = await Promise.all([
    api.get<{ items: ApiInspection[] }>(`/api/dashboard/recent-inspections?limit=${limit}`),
    api.get<{ items: ApiDetectionRow[] }>("/api/detections?limit=500"),
  ]);
  const counts = countsByInspection(detections.items);
  return recent.items.map((i) => mapInspection(i, counts[i.id] ?? emptyPriorityCounts()));
}
