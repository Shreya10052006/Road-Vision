"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { CardSkeleton, ErrorState } from "@/components/ui/States";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { ReportTable } from "@/components/reports/ReportTable";
import { ReportPreview } from "@/components/reports/ReportPreview";
import {
  buildReportCsv,
  generateReport,
  getReportPreview,
  getReports,
} from "@/lib/services/reportService";
import { useToast } from "@/contexts/ToastContext";
import type { Report, ReportFilters, ReportFormat, ReportPreviewData, ReportType } from "@/lib/types";

export default function ReportsPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReportPreviewData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  useEffect(() => {
    if (!previewId) return;
    setPreview(null);
    setFailed(false);
    getReportPreview(previewId)
      .then(setPreview)
      .catch(() => setFailed(true)); // never substitute invented figures
  }, [previewId]);

  const handleGenerate = async (params: {
    type: ReportType;
    dateRange: string;
    scope: string;
    format: ReportFormat;
    filters: ReportFilters;
  }) => {
    setGenerating(true);
    const report = await generateReport(params);
    setReports((prev) => (prev ? [report, ...prev] : [report]));
    setGenerating(false);
    showToast(`${report.typeLabel} report generated`, "success");
    setPreviewId(report.id);
  };

  /**
   * CSV is built from live database rows scoped to this report. PDF uses the
   * browser's own print-to-PDF on the rendered preview rather than pulling in a
   * PDF library the project does not otherwise need.
   */
  const handleDownload = async (report: Report) => {
    if (report.format === "pdf") {
      setPreviewId(report.id);
      showToast("Opening print dialog — choose \u201cSave as PDF\u201d", "info");
      setTimeout(() => window.print(), 600);
      return;
    }
    try {
      const csv = await buildReportCsv(report);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`${report.id}.csv downloaded`, "success");
    } catch {
      showToast("Could not build the report — the API is unavailable", "error");
    }
  };

  return (
    <>
      <Header title="Reports" subtitle="Generate and review road inspection reports" />
      <main className="flex-1 p-4 sm:p-8 space-y-5">
        <ReportBuilder onGenerate={handleGenerate} generating={generating} />

        {!reports ? (
          <Card className="p-5"><CardSkeleton lines={6} /></Card>
        ) : (
          <ReportTable reports={reports} onPreview={setPreviewId} onDownload={handleDownload} />
        )}

        {previewId && failed && (
          <Card className="p-8">
            <ErrorState title="Could not build this report from the API" />
          </Card>
        )}
        {previewId && !failed && !preview && (
          <Card className="p-8">
            <CardSkeleton lines={8} />
          </Card>
        )}
        {previewId && preview && <ReportPreview data={preview} />}
      </main>
    </>
  );
}
