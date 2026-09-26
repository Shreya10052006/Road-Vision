/**
 * Inspection History and Inspection Details — read from the database.
 * Contains both seeded demonstration inspections (DEMO-INS-###) and real
 * pipeline output (INSP-YYYY-####), newest first.
 */

import type {
  DataOrigin,
  Detection,
  Inspection,
  InspectionSource,
  InspectionStatus,
  Priority,
} from "@/lib/types";
import { api } from "@/lib/api";
import {
  countsByInspection,
  emptyPriorityCounts,
  mapDetection,
  mapInspection,
  type ApiDetectionRow,
  type ApiInspection,
} from "@/lib/services/mappers";

export interface InspectionFilters {
  search?: string;
  origin?: DataOrigin | "all";
  source?: InspectionSource | "all";
  status?: InspectionStatus | "all";
  priority?: Priority | "all";
}

export async function getInspectionHistory(filters: InspectionFilters = {}): Promise<Inspection[]> {
  const [list, detections] = await Promise.all([
    api.get<{ items: ApiInspection[]; total: number }>("/api/inspections?limit=200"),
    api.get<{ items: ApiDetectionRow[] }>("/api/detections?limit=500"),
  ]);

  const counts = countsByInspection(detections.items);
  let results = list.items.map((i) => mapInspection(i, counts[i.id] ?? emptyPriorityCounts()));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter((i) => i.id.toLowerCase().includes(q) || i.road.toLowerCase().includes(q));
  }
  if (filters.origin && filters.origin !== "all") {
    results = results.filter((i) => i.dataOrigin === filters.origin);
  }
  if (filters.source && filters.source !== "all") {
    results = results.filter((i) => i.source === filters.source);
  }
  if (filters.status && filters.status !== "all") {
    results = results.filter((i) => i.status === filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    results = results.filter((i) => i.countByPriority[filters.priority as Priority] > 0);
  }

  return results.sort((a, b) =>
    a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1,
  );
}

export async function getInspectionDetails(
  id: string,
): Promise<{ inspection: Inspection; detections: Detection[] } | null> {
  try {
    const [apiInspection, rows] = await Promise.all([
      api.get<ApiInspection>(`/api/inspections/${id}`),
      api.get<{ items: ApiDetectionRow[] }>(`/api/inspections/${id}/detections?limit=500`),
    ]);

    const counts = emptyPriorityCounts();
    for (const row of rows.items) if (row.priority) counts[row.priority as Priority] += 1;

    const inspection = mapInspection(apiInspection, counts);
    const detections = rows.items.map((row) =>
      mapDetection(row, inspection.road, inspection.area),
    );
    return { inspection, detections };
  } catch {
    return null;
  }
}
