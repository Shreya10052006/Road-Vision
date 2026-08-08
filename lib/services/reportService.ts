import type { Report, ReportFormat, ReportPreviewData, ReportType } from "@/lib/types";
import { DETECTIONS, INSPECTIONS, aggregateByPriority } from "@/lib/mock/generate";
import { sleep } from "@/lib/utils";

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  inspection_summary: "Inspection Summary",
  priority_backlog: "Priority Backlog",
  ward_summary: "Ward Summary",
  trend_report: "Trend Report",
};

const MOCK_REPORTS: Report[] = [
  {
    id: "RPT-2025-041",
    type: "inspection_summary",
    typeLabel: "Inspection Summary",
    dateRange: "Last 7 Days",
    scope: "All Roads",
    generatedBy: "Municipal Engineer",
    format: "pdf",
    status: "ready",
    createdAt: "2025-05-24T09:12:00Z",
  },
  {
    id: "RPT-2025-040",
    type: "priority_backlog",
    typeLabel: "Priority Backlog",
    dateRange: "Last 30 Days",
    scope: "P1 & P2 only",
    generatedBy: "Municipal Engineer",
    format: "csv",
    status: "ready",
    createdAt: "2025-05-22T14:03:00Z",
  },
  {
    id: "RPT-2025-039",
    type: "ward_summary",
    typeLabel: "Ward Summary",
    dateRange: "Last 30 Days",
    scope: "Ward 118 — Teynampet",
    generatedBy: "S. Priya",
    format: "pdf",
    status: "ready",
    createdAt: "2025-05-19T11:47:00Z",
  },
  {
    id: "RPT-2025-038",
    type: "trend_report",
    typeLabel: "Trend Report",
    dateRange: "Last 90 Days",
    scope: "All Roads",
    generatedBy: "R. Muthu",
    format: "pdf",
    status: "ready",
    createdAt: "2025-05-10T08:30:00Z",
  },
];

export async function getReports(): Promise<Report[]> {
  await sleep(250);
  return [...MOCK_REPORTS].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function generateReport(params: {
  type: ReportType;
  dateRange: string;
  scope: string;
  format: ReportFormat;
}): Promise<Report> {
  await sleep(900);
  const report: Report = {
    id: `RPT-2025-${String(42 + MOCK_REPORTS.length).padStart(3, "0")}`,
    type: params.type,
    typeLabel: REPORT_TYPE_LABELS[params.type],
    dateRange: params.dateRange,
    scope: params.scope,
    generatedBy: "Municipal Engineer",
    format: params.format,
    status: "ready",
    createdAt: new Date().toISOString(),
  };
  MOCK_REPORTS.unshift(report);
  return report;
}

export async function getReportPreview(id: string): Promise<ReportPreviewData | null> {
  await sleep(300);
  const report = MOCK_REPORTS.find((r) => r.id === id);
  if (!report) return null;

  const byPriority = aggregateByPriority(DETECTIONS);
  const topCritical = [...DETECTIONS]
    .filter((d) => d.priority === "P1")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return {
    title: `${report.typeLabel} — ${report.scope}`,
    dateRange: report.dateRange,
    roadHealthScore: 68,
    totalDamages: DETECTIONS.length,
    countByPriority: byPriority,
    topCriticalDetections: topCritical,
    recommendations: [
      `Dispatch repair crews to the ${byPriority.P1} P1 (Immediate) defects before the next inspection cycle.`,
      `Schedule the ${byPriority.P2} P2 (Within 7 Days) defects into this week's short-term work order.`,
      `Fold the ${byPriority.P3} P3 (Scheduled Maintenance) defects into the next routine maintenance pass.`,
      `Continue monitoring the ${byPriority.P4} P4 (Monitor Only) defects on the next inspection run.`,
    ],
  };
}

export function totalInspectionCount() {
  return INSPECTIONS.length;
}
