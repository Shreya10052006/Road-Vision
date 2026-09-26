/**
 * Analytics — aggregates the same database the Dashboard reads, so adding a
 * real inspection changes these charts immediately.
 */

import type { AnalyticsData, DamageType, Priority } from "@/lib/types";
import { api } from "@/lib/api";

type ApiAnalytics = {
  kpis: {
    total_inspections: number;
    total_damages: number;
    p1_damages: number;
    average_road_health_score: number | null;
  };
  damage_type_distribution: { damage_type: string; count: number }[];
  priority_distribution: { priority: string; count: number }[];
  most_affected_roads: { road: string; count: number }[];
};

type ApiTrends = {
  daily: { date: string; total: number; p1: number; p2: number; p3: number; p4: number }[];
};

export interface AnalyticsQuery {
  /** Trailing window in days; omit for all recorded inspections. */
  days?: number;
  road?: string;
  ward?: string;
  damageType?: string;
  priority?: string;
  origin?: string;
}

function toParams(q: AnalyticsQuery): string {
  const p = new URLSearchParams();
  if (q.days) p.set("days", String(q.days));
  if (q.road && q.road !== "all") p.set("road", q.road);
  if (q.ward && q.ward !== "all") p.set("ward", q.ward);
  if (q.damageType && q.damageType !== "all") p.set("damage_type", q.damageType);
  if (q.priority && q.priority !== "all") p.set("priority", q.priority);
  if (q.origin && q.origin !== "all") p.set("origin", q.origin);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function getAnalyticsData(query: AnalyticsQuery = {}): Promise<AnalyticsData> {
  // The trend charts are scoped the same way as the KPIs so the two halves of
  // the page always describe the same set of rows.
  const trendParams = new URLSearchParams({ days: String(query.days ?? 30) });
  if (query.road && query.road !== "all") trendParams.set("road", query.road);
  if (query.origin && query.origin !== "all") trendParams.set("origin", query.origin);

  const [analytics, trends] = await Promise.all([
    api.get<ApiAnalytics>(`/api/analytics${toParams(query)}`),
    api.get<ApiTrends>(`/api/dashboard/trends?${trendParams.toString()}`),
  ]);

  const health = analytics.kpis.average_road_health_score ?? 0;

  return {
    kpis: {
      totalInspections: analytics.kpis.total_inspections,
      totalDamages: analytics.kpis.total_damages,
      p1Damages: analytics.kpis.p1_damages,
      avgDamagesPerKm: analytics.kpis.total_inspections
        ? Number((analytics.kpis.total_damages / analytics.kpis.total_inspections).toFixed(2))
        : 0,
      roadHealthScore: Math.round(health),
    },
    damageTrend: trends.daily.map((d) => ({ date: d.date, count: d.total })),
    // Per-day health, from that day's own detection mix using the same
    // penalty weights as services/road_health.py on the backend.
    roadHealthTrend: trends.daily.map((d) => {
      const total = d.p1 + d.p2 + d.p3 + d.p4;
      if (total === 0) return { date: d.date, score: 100 };
      const severity = (12 * d.p1 + 6 * d.p2 + 3 * d.p3 + 1 * d.p4) / total;
      const volume = Math.min(1, total / 40);
      const score = 100 - (severity / 12) * 60 - volume * 40;
      return { date: d.date, score: Math.round(Math.max(0, Math.min(100, score))) };
    }),
    damageTypeDistribution: analytics.damage_type_distribution.map((d) => ({
      type: d.damage_type as DamageType,
      count: d.count,
    })),
    priorityDistribution: analytics.priority_distribution.map((d) => ({
      priority: d.priority as Priority,
      count: d.count,
    })),
    mostAffectedRoads: analytics.most_affected_roads,
  };
}
