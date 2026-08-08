import type { DamageType, Detection, Priority } from "@/lib/types";
import { DETECTIONS, detectionById } from "@/lib/mock/generate";
import { sleep } from "@/lib/utils";

export interface DetectionFilters {
  search?: string;
  damageType?: DamageType | "all";
  priority?: Priority | "all";
  road?: string | "all";
  minConfidence?: number;
  inspectionId?: string;
}

export async function getDetections(filters: DetectionFilters = {}): Promise<Detection[]> {
  await sleep(300);
  let results = [...DETECTIONS];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter((d) => d.road.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
  }
  if (filters.damageType && filters.damageType !== "all") {
    results = results.filter((d) => d.damageType === filters.damageType);
  }
  if (filters.priority && filters.priority !== "all") {
    results = results.filter((d) => d.priority === filters.priority);
  }
  if (filters.road && filters.road !== "all") {
    results = results.filter((d) => d.road === filters.road);
  }
  if (typeof filters.minConfidence === "number") {
    results = results.filter((d) => d.confidence >= filters.minConfidence!);
  }
  if (filters.inspectionId) {
    results = results.filter((d) => d.inspectionId === filters.inspectionId);
  }

  return results.sort((a, b) => (a.id < b.id ? 1 : -1));
}

export async function getDetectionDetails(id: string): Promise<Detection | null> {
  await sleep(200);
  return detectionById(id) ?? null;
}
