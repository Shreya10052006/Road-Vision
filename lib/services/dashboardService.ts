import type { DashboardStats, Inspection } from "@/lib/types";
import {
  aggregateByPriority,
  aggregateByType,
  last7DaysTrend,
  todaysDetections,
  todaysInspections,
  INSPECTIONS,
} from "@/lib/mock/generate";
import { damageTypeOrder, priorityOrder } from "@/lib/priorityConfig";
import { sleep } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CURRENT: local mock data, computed from the seeded mock dataset.
// FUTURE:  return api.get("/api/dashboard/stats") — swap the body only,
//          callers (the Dashboard page + widgets) never change.
// ---------------------------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  await sleep(300);

  const detections = todaysDetections();
  const total = detections.length;
  const byType = aggregateByType(detections);
  const byPriority = aggregateByPriority(detections);

  const damageByType = damageTypeOrder.map((type) => ({
    type,
    count: byType[type],
    percentage: total ? Number(((byType[type] / total) * 100).toFixed(1)) : 0,
  }));

  const damageByPriority = priorityOrder.map((priority) => ({
    priority,
    count: byPriority[priority],
    percentage: total ? Number(((byPriority[priority] / total) * 100).toFixed(1)) : 0,
  }));

  return {
    roadHealthScore: 68,
    roadHealthDelta: 8.5,
    totalInspectionsToday: todaysInspections().length,
    totalInspectionsDelta: 3,
    totalDamagesToday: total,
    totalDamagesDelta: 28,
    criticalP1Today: byPriority.P1,
    criticalP1Delta: 6,
    roadsInspectedKmToday: 42.6,
    roadsInspectedKmDelta: 5.4,
    damageByType,
    damageByPriority,
    totalDamages: total,
    dailyTrend: last7DaysTrend(),
    roadHealthDistribution: [
      { label: "Excellent", percentage: 16, color: "#43A047" },
      { label: "Good", percentage: 26, color: "#8BC34A" },
      { label: "Fair", percentage: 28, color: "#FDD835" },
      { label: "Poor", percentage: 18, color: "#FB8C00" },
      { label: "Very Poor", percentage: 12, color: "#E53935" },
    ],
  };
}

export async function getRecentInspections(limit = 5): Promise<Inspection[]> {
  await sleep(200);
  const byRecency = [...INSPECTIONS].sort((a, b) => {
    const na = Number(a.id.split("-").pop());
    const nb = Number(b.id.split("-").pop());
    return nb - na;
  });
  return byRecency.slice(0, limit);
}
