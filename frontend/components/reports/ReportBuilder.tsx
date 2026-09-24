"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Controls";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { FileText, Loader2 } from "lucide-react";
import { useRoadOptions } from "@/lib/hooks/useRoadOptions";
import type { Priority, ReportFilters, ReportFormat, ReportType } from "@/lib/types";

const TYPE_LABELS: Record<ReportType, string> = {
  inspection_summary: "Inspection Summary",
  priority_backlog: "Priority Backlog",
  ward_summary: "Ward Summary",
  trend_report: "Trend Report",
};

const DATE_RANGE_DAYS: Record<string, number> = {
  "Last 7 Days": 7,
  "Last 30 Days": 30,
  "Last 90 Days": 90,
};

export function ReportBuilder({
  onGenerate,
  generating,
}: {
  onGenerate: (params: {
    type: ReportType;
    dateRange: string;
    scope: string;
    format: ReportFormat;
    filters: ReportFilters;
  }) => void;
  generating: boolean;
}) {
  const { roads } = useRoadOptions();
  const [type, setType] = useState<ReportType>("inspection_summary");
  const [dateRange, setDateRange] = useState("Last 7 Days");
  const [scope, setScope] = useState("All Roads");
  const [priority, setPriority] = useState("all");
  const [format, setFormat] = useState<ReportFormat>("pdf");

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Report Builder</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Report Type</label>
          <Select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Date Range</label>
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
          </Select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Road / Area</label>
          <Select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option>All Roads</option>
            {roads.map((r) => (
              <option key={r.name}>{r.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Priority</label>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All</option>
            <option value="P1">P1 — Immediate</option>
            <option value="P2">P2 — Within 7 Days</option>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Select className="w-32" value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)}>
          <option value="pdf">PDF</option>
          <option value="csv">CSV</option>
        </Select>
        <Button
          onClick={() =>
            onGenerate({
              type,
              dateRange,
              scope: priority !== "all" ? `${scope} · ${priority} only` : scope,
              format,
              // The structured version of the same choices — this is what the
              // preview and the CSV export actually query the database with.
              filters: {
                days: DATE_RANGE_DAYS[dateRange] ?? undefined,
                road: scope,
                priority: priority as Priority | "all",
              },
            })
          }
          disabled={generating}
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          Generate Report
        </Button>
      </div>
    </Card>
  );
}
