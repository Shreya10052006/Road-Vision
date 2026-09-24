/**
 * Reports — content computed from persisted database rows.
 *
 * A report is a saved *scope* (date range, road, priority), not a stored
 * document: previewing one replays that scope against the same endpoints the
 * Dashboard and Analytics use, so a report never drifts from the database.
 * The list of generated reports is per-session; there is no reports table, and
 * inventing one would be more architecture than this page needs.
 */

import type {
  Priority,
  Report,
  ReportFilters,
  ReportFormat,
  ReportPreviewData,
  ReportType,
} from "@/lib/types";
import { api } from "@/lib/api";
import { mapDetection, type ApiDetectionRow } from "@/lib/services/mappers";

const TYPE_LABELS: Record<ReportType, string> = {
  inspection_summary: "Inspection Summary",
  priority_backlog: "Priority Backlog",
  ward_summary: "Ward Summary",
  trend_report: "Trend Report",
};

let REPORTS: Report[] = [];
let counter = 1043;

export async function getReports(): Promise<Report[]> {
  return [...REPORTS];
}

export async function generateReport(params: {
  type: ReportType;
  dateRange: string;
  scope: string;
  format: ReportFormat;
  filters?: ReportFilters;
}): Promise<Report> {
  const report: Report = {
    id: `RPT-${counter++}`,
    type: params.type,
    typeLabel: TYPE_LABELS[params.type],
    createdAt: new Date().toISOString(),
    scope: params.scope,
    generatedBy: "Municipal Engineer",
    format: params.format,
    status: "ready",
    filters: params.filters,
  };
  REPORTS = [report, ...REPORTS];
  return report;
}

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

export async function getReportPreview(reportId: string): Promise<ReportPreviewData> {
  const report = REPORTS.find((r) => r.id === reportId);
  const f = report?.filters ?? {};

  // Same scope for both calls, so the headline numbers and the listed
  // detections always describe the same rows.
  const analyticsParams = new URLSearchParams();
  if (f.days) analyticsParams.set("days", String(f.days));
  if (f.road && f.road !== "all" && f.road !== "All Roads") analyticsParams.set("road", f.road);
  if (f.priority && f.priority !== "all") analyticsParams.set("priority", f.priority);

  const detectionParams = new URLSearchParams({ limit: "500" });
  if (f.priority && f.priority !== "all") detectionParams.set("priority", f.priority);

  const [analytics, rows] = await Promise.all([
    api.get<ApiAnalytics>(`/api/analytics${analyticsParams.toString() ? `?${analyticsParams}` : ""}`),
    api.get<{ items: ApiDetectionRow[]; total: number }>(`/api/detections?${detectionParams}`),
  ]);

  const scopedRows =
    f.road && f.road !== "all" && f.road !== "All Roads"
      ? rows.items.filter((r) => r.road === f.road)
      : rows.items;

  const counts: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const d of analytics.priority_distribution) counts[d.priority as Priority] = d.count;

  const critical = scopedRows
    .filter((r) => r.priority === "P1")
    .slice(0, 5)
    .map((r) => mapDetection(r, r.road ?? "—", r.area ?? "—"));

  const worstRoads = analytics.most_affected_roads.slice(0, 2).map((r) => r.road).join(" and ");

  return {
    title: report?.typeLabel ?? "Inspection Summary",
    dateRange: report?.filters?.days ? `Last ${report.filters.days} days` : "All recorded inspections",
    roadHealthScore: Math.round(analytics.kpis.average_road_health_score ?? 0),
    totalDamages: analytics.kpis.total_damages,
    countByPriority: counts,
    topCriticalDetections: critical,
    recommendations: [
      counts.P1 > 0
        ? `Dispatch repair crews to the ${counts.P1} P1 (Immediate) detection${counts.P1 === 1 ? "" : "s"} within 48 hours${worstRoads ? `, starting with ${worstRoads}` : ""}.`
        : "No P1 (Immediate) detections fall within this report's scope.",
      `Schedule the ${counts.P2} P2 defect${counts.P2 === 1 ? "" : "s"} into the next weekly work order to prevent escalation.`,
      `Continue monitoring the ${counts.P4} P4 defect${counts.P4 === 1 ? "" : "s"} on the next routine pass rather than dispatching crews now.`,
    ],
  };
}

/**
 * Build the report's CSV from live database rows, scoped exactly as the report
 * was. Returns the file contents; the caller triggers the browser download.
 */
export async function buildReportCsv(report: Report): Promise<string> {
  const f = report.filters ?? {};
  const params = new URLSearchParams({ limit: "500" });
  if (f.priority && f.priority !== "all") params.set("priority", f.priority);

  const rows = await api.get<{ items: ApiDetectionRow[] }>(`/api/detections?${params}`);
  const scoped =
    f.road && f.road !== "all" && f.road !== "All Roads"
      ? rows.items.filter((r) => r.road === f.road)
      : rows.items;

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = [
    "detection_id", "inspection_id", "road", "area", "damage_type", "priority",
    "priority_source", "confidence", "frame_number", "frame_timestamp",
    "latitude", "longitude", "detected_at",
  ];

  const lines = [
    `# RoadVision ${report.typeLabel} — ${report.scope} — generated ${new Date().toISOString()}`,
    "# P1-P4 are provisional rule-derived decision-support priorities, not dataset ground truth.",
    header.join(","),
    ...scoped.map((r) =>
      [
        r.id, r.inspection_id, r.road, r.area, r.damage_type, r.priority,
        r.priority_source ?? "rule", r.confidence, r.frame_number, r.frame_timestamp,
        r.latitude, r.longitude, r.created_at,
      ].map(escape).join(","),
    ),
  ];
  return lines.join("\n");
}
