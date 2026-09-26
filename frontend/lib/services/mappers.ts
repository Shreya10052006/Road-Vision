/**
 * API (snake_case) -> frontend type (camelCase) mapping.
 *
 * The database is the single source of truth for every page. These mappers are
 * the only place the backend's field names are translated, so the existing
 * components and their prop types keep working untouched.
 *
 * Records come back with `data_origin`: "demo" for seeded demonstration
 * inspections, "real" for output of the actual RoadVision pipeline. Both are
 * served by the same endpoints and both are shown by default.
 */

import type {
  DamageType,
  Detection,
  Inspection,
  InspectionSource,
  InspectionStatus,
  Priority,
} from "@/lib/types";

export type ApiInspection = {
  id: string;
  title: string | null;
  source_type: InspectionSource;
  data_origin?: string;
  status: InspectionStatus;
  road: string | null;
  area: string | null;
  city: string | null;
  ward: string | null;
  inspector_name: string | null;
  latitude: number | null;
  longitude: number | null;
  frame_sample_rate?: number;
  frames_processed: number;
  total_detections: number;
  duration_seconds: number | null;
  road_health_score: number | null;
  original_filename: string | null;
  created_at: string;
  completed_at: string | null;
};

export type ApiDetectionRow = {
  id: string;
  inspection_id: string;
  frame_number: number | null;
  frame_timestamp: string | null;
  /** Denormalised from the parent inspection by the API. */
  road?: string | null;
  area?: string | null;
  damage_type: string | null;
  confidence: number | null;
  bbox_x: number | null;
  bbox_y: number | null;
  bbox_width: number | null;
  bbox_height: number | null;
  priority: string | null;
  priority_confidence: number | null;
  priority_source?: string | null;
  model_version: string | null;
  features: {
    bbox_area_ratio: number | null;
    aspect_ratio: number | null;
    frame_damage_count: number | null;
    frame_damage_density: number | null;
    detector_confidence: number | null;
    frame_position_y: number | null;
  };
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export const emptyPriorityCounts = (): Record<Priority, number> => ({ P1: 0, P2: 0, P3: 0, P4: 0 });

export function mapInspection(
  api: ApiInspection,
  countByPriority: Record<Priority, number> = emptyPriorityCounts(),
): Inspection {
  const when = new Date(api.created_at);
  return {
    id: api.id,
    source: api.source_type,
    dataOrigin: api.data_origin === "demo" ? "demo" : "real",
    title: api.title,
    originalFilename: api.original_filename,
    frameSampleRate: api.frame_sample_rate ?? 1,
    lat: api.latitude,
    lng: api.longitude,
    road: api.road ?? api.title ?? "—",
    area: api.area ?? "—",
    city: api.city ?? "—",
    ward: api.ward ?? "—",
    inspectorName: api.inspector_name ?? "—",
    date: when.toISOString().slice(0, 10),
    time: when.toTimeString().slice(0, 5),
    durationSeconds: api.duration_seconds ?? 0,
    framesProcessed: api.frames_processed,
    totalDamages: api.total_detections,
    countByPriority,
    roadHealthScore: Math.round(api.road_health_score ?? 0),
    status: api.status,
  };
}

export function mapDetection(api: ApiDetectionRow, road = "—", area = "—"): Detection {
  const when = new Date(api.created_at);
  return {
    id: api.id,
    inspectionId: api.inspection_id,
    frameIndex: api.frame_number ?? 0,
    timestamp: api.frame_timestamp ?? when.toISOString().slice(11, 19),
    damageType: (api.damage_type ?? "pothole") as DamageType,
    priority: (api.priority ?? "P4") as Priority,
    confidence: api.confidence ?? 0,
    priorityConfidence: api.priority_confidence ?? 0,
    // Rule-derived priorities have no model version; show the provenance
    // instead of inventing one.
    modelVersion: api.model_version ?? api.priority_source ?? "rule",
    road,
    area,
    lat: api.latitude ?? 0,
    lng: api.longitude ?? 0,
    detectedAt: when.toISOString(),
    features: {
      bboxAreaRatio: api.features?.bbox_area_ratio ?? 0,
      aspectRatio: api.features?.aspect_ratio ?? 0,
      frameDamageCount: api.features?.frame_damage_count ?? 0,
      frameDamageDensity: api.features?.frame_damage_density ?? 0,
      detectorConfidence: api.features?.detector_confidence ?? api.confidence ?? 0,
      framePositionY: api.features?.frame_position_y ?? 0,
    },
  };
}

/** Roll detection rows up into per-inspection priority counts. */
export function countsByInspection(rows: ApiDetectionRow[]): Record<string, Record<Priority, number>> {
  const out: Record<string, Record<Priority, number>> = {};
  for (const row of rows) {
    const counts = (out[row.inspection_id] ??= emptyPriorityCounts());
    if (row.priority) counts[row.priority as Priority] += 1;
  }
  return out;
}
