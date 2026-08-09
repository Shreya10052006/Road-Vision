"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/States";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { ReportTable } from "@/components/reports/ReportTable";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { generateReport, getReportPreview, getReports } from "@/lib/services/reportService";
import { useToast } from "@/contexts/ToastContext";
import type { Report, ReportFormat, ReportPreviewData, ReportType } from "@/lib/types";

export default function ReportsPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReportPreviewData | null>(null);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  useEffect(() => {
    if (!previewId) return;
    getReportPreview(previewId).then(setPreview);
  }, [previewId]);

  const handleGenerate = async (params: { type: ReportType; dateRange: string; scope: string; format: ReportFormat }) => {
    setGenerating(true);
    const report = await generateReport(params);
    setReports((prev) => (prev ? [report, ...prev] : [report]));
    setGenerating(false);
    showToast(`${report.typeLabel} report generated`, "success");
    setPreviewId(report.id);
  };

  const handleDownload = (report: Report) => {
    showToast(`Downloading ${report.id}.${report.format}…`, "info");
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

        {previewId && preview && <ReportPreview data={preview} />}
      </main>
    </>
  );
}
