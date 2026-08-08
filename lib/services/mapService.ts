import type { DamageType, MapDetection, Priority } from "@/lib/types";
import { DETECTIONS, todaysDetections } from "@/lib/mock/generate";
import { sleep } from "@/lib/utils";

export interface MapFilters {
  priority?: Priority | "all";
  damageType?: DamageType | "all";
  road?: string | "all";
  scope?: "today" | "all";
}

export async function getMapDetections(filters: MapFilters = {}): Promise<MapDetection[]> {
  await sleep(300);
  let results = filters.scope === "today" ? todaysDetections() : DETECTIONS;

  if (filters.priority && filters.priority !== "all") {
    results = results.filter((d) => d.priority === filters.priority);
  }
  if (filters.damageType && filters.damageType !== "all") {
    results = results.filter((d) => d.damageType === filters.damageType);
  }
  if (filters.road && filters.road !== "all") {
    results = results.filter((d) => d.road === filters.road);
  }

  return results.map((d) => ({
    id: `MAP-${d.id}`,
    detectionId: d.id,
    inspectionId: d.inspectionId,
    lat: d.lat,
    lng: d.lng,
    priority: d.priority,
    damageType: d.damageType,
    road: d.road,
    confidence: d.confidence,
    detectedAt: d.detectedAt,
  }));
}
