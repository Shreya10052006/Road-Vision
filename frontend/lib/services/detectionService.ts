/**
 * Detection Explorer — reads persisted Detection rows: seeded demonstration
 * detections plus real image, video and live-camera output.
 */

import type { DamageType, Detection, Priority } from "@/lib/types";
import { api } from "@/lib/api";
import { mapDetection, type ApiDetectionRow } from "@/lib/services/mappers";

export interface DetectionFilters {
  search?: string;
  damageType?: DamageType | "all";
  priority?: Priority | "all";
  road?: string | "all";
}

export async function getDetections(filters: DetectionFilters = {}): Promise<Detection[]> {
  const params = new URLSearchParams({ limit: "500" });
  if (filters.damageType && filters.damageType !== "all") params.set("damage_type", filters.damageType);
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);

  const rows = await api.get<{ items: ApiDetectionRow[]; total: number }>(
    `/api/detections?${params.toString()}`,
  );
  let results = rows.items.map((row) => mapDetection(row, row.road ?? "—", row.area ?? "—"));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter((d) => d.id.toLowerCase().includes(q) || d.road.toLowerCase().includes(q));
  }
  if (filters.road && filters.road !== "all") {
    results = results.filter((d) => d.road === filters.road);
  }

  return results.sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1));
}

export async function getDetectionDetails(id: string): Promise<Detection | null> {
  try {
    const row = await api.get<ApiDetectionRow>(`/api/detections/${id}`);
    return mapDetection(row, row.road ?? "—", row.area ?? "—");
  } catch {
    return null;
  }
}
