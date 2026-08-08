import type { Inspection, InspectionSource, InspectionStatus, Priority } from "@/lib/types";
import { detectionsForInspection, INSPECTIONS, inspectionById } from "@/lib/mock/generate";
import { sleep } from "@/lib/utils";

export interface InspectionFilters {
  search?: string;
  source?: InspectionSource | "all";
  status?: InspectionStatus | "all";
  priority?: Priority | "all";
}

export async function getInspectionHistory(filters: InspectionFilters = {}): Promise<Inspection[]> {
  await sleep(300);
  let results = [...INSPECTIONS].sort((a, b) => {
    const na = Number(a.id.split("-").pop());
    const nb = Number(b.id.split("-").pop());
    return nb - na;
  });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (i) => i.road.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.area.toLowerCase().includes(q)
    );
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

  return results;
}

export async function getInspectionDetails(id: string) {
  await sleep(300);
  const inspection = inspectionById(id);
  if (!inspection) return null;
  const detections = detectionsForInspection(id);
  return { inspection, detections };
}
