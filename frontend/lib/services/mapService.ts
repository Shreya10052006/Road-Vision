/**
 * Damage Map — every marker is a persisted, geotagged detection.
 *
 * Coordinates come from the stored latitude/longitude columns. Nothing is
 * geocoded from a road name, nothing is looked up in a road table, and nothing
 * is generated, so markers sit in the same place on every load. Detections
 * without coordinates or without a priority are excluded by the API; they still
 * appear in History, Analytics and the Detection Explorer.
 *
 * Seeded demonstration records and real pipeline output are returned together
 * unless the origin filter narrows it.
 */

import type { DamageType, DataOrigin, MapDetection, Priority } from "@/lib/types";
import { api } from "@/lib/api";

export interface MapFilters {
  priority?: Priority | "all";
  damageType?: DamageType | "all";
  origin?: DataOrigin | "all";
  road?: string | "all";
  scope?: "today" | "all";
}

type ApiMapDetection = {
  id: string;
  inspection_id: string;
  latitude: number;
  longitude: number;
  road: string | null;
  area: string | null;
  ward: string | null;
  damage_type: string | null;
  priority: string | null;
  confidence: number | null;
  data_origin: string;
};

export async function getMapDetections(filters: MapFilters = {}): Promise<MapDetection[]> {
  const params = new URLSearchParams();
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.damageType && filters.damageType !== "all") params.set("damage_type", filters.damageType);
  if (filters.origin && filters.origin !== "all") params.set("origin", filters.origin);
  if (filters.road && filters.road !== "all") params.set("road", filters.road);

  const query = params.toString();
  const rows = await api.get<ApiMapDetection[]>(`/api/map/detections${query ? `?${query}` : ""}`);

  return rows
    // Defensive: never plot a row whose coordinates are missing or unusable.
    .filter(
      (d) =>
        typeof d.latitude === "number" &&
        typeof d.longitude === "number" &&
        Number.isFinite(d.latitude) &&
        Number.isFinite(d.longitude) &&
        Math.abs(d.latitude) <= 90 &&
        Math.abs(d.longitude) <= 180,
    )
    .map((d) => ({
      id: `MAP-${d.id}`,
      detectionId: d.id,
      inspectionId: d.inspection_id,
      lat: d.latitude,
      lng: d.longitude,
      road: d.road ?? "—",
      area: d.area ?? "—",
      ward: d.ward ?? "—",
      damageType: (d.damage_type ?? "pothole") as DamageType,
      priority: (d.priority ?? "P4") as Priority,
      confidence: d.confidence,
      dataOrigin: d.data_origin === "demo" ? "demo" : "real",
    }));
}
