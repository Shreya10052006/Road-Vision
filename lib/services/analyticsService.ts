import type { AnalyticsData } from "@/lib/types";
import { DETECTIONS, INSPECTIONS, aggregateByPriority, aggregateByType } from "@/lib/mock/generate";
import { damageTypeOrder, priorityOrder } from "@/lib/priorityConfig";
import { sleep } from "@/lib/utils";

export async function getAnalyticsData(): Promise<AnalyticsData> {
  await sleep(350);

  const byType = aggregateByType(DETECTIONS);
  const byPriority = aggregateByPriority(DETECTIONS);

  const dateBuckets = new Map<string, number>();
  const healthByDate = new Map<string, number[]>();
  INSPECTIONS.forEach((i) => {
    dateBuckets.set(i.date, (dateBuckets.get(i.date) ?? 0) + i.totalDamages);
    const arr = healthByDate.get(i.date) ?? [];
    arr.push(i.roadHealthScore);
    healthByDate.set(i.date, arr);
  });

  const sortedDates = [...dateBuckets.keys()].sort();
  const damageTrend = sortedDates.map((date) => ({
    date: new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
    count: dateBuckets.get(date) ?? 0,
  }));

  const roadHealthTrend = sortedDates.map((date) => {
    const scores = healthByDate.get(date) ?? [];
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { date: new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short" }), score: avg };
  });

  const roadTotals = new Map<string, number>();
  INSPECTIONS.forEach((i) => roadTotals.set(i.road, (roadTotals.get(i.road) ?? 0) + i.totalDamages));
  const mostAffectedRoads = [...roadTotals.entries()]
    .map(([road, count]) => ({ road, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const totalKm = 312.4; // demo constant — no per-run distance field is modeled yet
  const totalDamages = DETECTIONS.length;

  return {
    kpis: {
      totalInspections: INSPECTIONS.length,
      totalDamages,
      p1Damages: byPriority.P1,
      avgDamagesPerKm: Number((totalDamages / totalKm).toFixed(2)),
      roadHealthScore: 68,
    },
    damageTrend,
    damageTypeDistribution: damageTypeOrder.map((type) => ({ type, count: byType[type] })),
    priorityDistribution: priorityOrder.map((priority) => ({ priority, count: byPriority[priority] })),
    roadHealthTrend,
    mostAffectedRoads,
  };
}
