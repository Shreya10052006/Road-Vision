"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { OriginBadge, SourceBadge, StatusBadge } from "@/components/ui/Badge";
import { InspectionSummary } from "@/components/inspections/InspectionSummary";
import { InspectionTimeline } from "@/components/inspections/InspectionTimeline";
import { AnnotatedFramePreview } from "@/components/inspections/AnnotatedFramePreview";
import { InspectionDetectionTable } from "@/components/inspections/InspectionDetectionTable";
import { DamageDistributionChart } from "@/components/inspections/DamageDistributionChart";
import { DetectionDetailsDrawer } from "@/components/detections/DetectionDetailsDrawer";
import { getInspectionDetails } from "@/lib/services/inspectionService";
import { FileSearch } from "lucide-react";
import { damageTypeConfig } from "@/lib/priorityConfig";
import type { DamageType, Detection, Inspection, Priority } from "@/lib/types";

export default function InspectionDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ inspection: Inspection; detections: Detection[] } | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(undefined);
    setFailed(false);
    getInspectionDetails(params.id)
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        // The API is unreachable. Show the error state rather than any
        // fallback data, so a broken backend can never look like a working one.
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [params.id, reloadKey]);

  // Everything below is computed from the persisted detections of THIS
  // inspection — never from frontend state or a hardcoded table.
  const detections = data?.detections ?? [];
  const byPriority = { P1: 0, P2: 0, P3: 0, P4: 0 } as Record<Priority, number>;
  const byType: Record<string, number> = {};
  for (const d of detections) {
    byPriority[d.priority] += 1;
    byType[d.damageType] = (byType[d.damageType] ?? 0) + 1;
  }
  const averageConfidence = detections.length
    ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
    : null;
  const prioritySources = Array.from(new Set(detections.map((d) => d.modelVersion)));
  const prioritySource = prioritySources.length === 1 ? prioritySources[0] : prioritySources.join(", ");

  return (
    <>
      <Header
        title={data ? `Inspection ${data.inspection.id}` : `Inspection ${params.id}`}
        subtitle={data ? `${data.inspection.road}, ${data.inspection.area} — ${data.inspection.date}` : undefined}
      />
      <main className="flex-1 p-4 sm:p-8 space-y-5">
        {failed ? (
          <Card className="p-8">
            <ErrorState
              title="Could not load this inspection from the API"
              onRetry={() => setReloadKey((k) => k + 1)}
            />
          </Card>
        ) : data === undefined ? (
          <Card className="p-8">
            <CardSkeleton lines={10} />
          </Card>
        ) : data === null ? (
          <Card className="p-8">
            <EmptyState
              icon={<FileSearch size={22} />}
              title="Inspection not found"
              description={`No inspection with ID "${params.id}" exists in the database.`}
              action={
                <Button size="sm" onClick={() => router.push("/inspections")}>
                  Back to Inspection History
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <Card className="p-5">
              <div className="flex flex-wrap gap-x-10 gap-y-3">
                <Field label="Source"><SourceBadge source={data.inspection.source} /></Field>
                <Field label="Origin"><OriginBadge origin={data.inspection.dataOrigin} /></Field>
                <Field label="Road" value={data.inspection.road} />
                <Field label="Area" value={data.inspection.area} />
                <Field label="City" value={data.inspection.city} />
                <Field label="Ward" value={data.inspection.ward} />
                <Field label="Inspector" value={data.inspection.inspectorName} />
                <Field label="Date" value={`${data.inspection.date} · ${data.inspection.time}`} />
                <Field label="Status"><StatusBadge status={data.inspection.status} /></Field>
                <Field
                  label="Location"
                  value={
                    data.inspection.lat != null && data.inspection.lng != null
                      ? `${data.inspection.lat.toFixed(4)}, ${data.inspection.lng.toFixed(4)}`
                      : "N/A"
                  }
                />
                {data.inspection.source === "upload" && (
                  <Field label="File" value={data.inspection.originalFilename ?? "N/A"} />
                )}
                {(data.inspection.source === "upload" || data.inspection.source === "live") && (
                  <>
                    <Field
                      label="Duration"
                      value={
                        data.inspection.durationSeconds
                          ? `${Math.floor(data.inspection.durationSeconds / 60)}m ${data.inspection.durationSeconds % 60}s`
                          : "N/A"
                      }
                    />
                    <Field label="Frames Processed" value={String(data.inspection.framesProcessed)} />
                    <Field
                      label="Frame Sampling"
                      value={
                        data.inspection.frameSampleRate > 1
                          ? `every ${ordinal(data.inspection.frameSampleRate)} frame`
                          : "every frame"
                      }
                    />
                  </>
                )}
                <Field
                  label="Avg. Confidence"
                  value={averageConfidence != null ? `${(averageConfidence * 100).toFixed(1)}%` : "N/A"}
                />
                <Field label="Priority Source" value={prioritySource || "N/A"} />
              </div>
              <p className="text-[11px] text-slate-400 mt-4">
                {detections.length} detection{detections.length === 1 ? "" : "s"} persisted ·{" "}
                {Object.entries(byType)
                  .map(([type, count]) => `${damageTypeConfig[type as DamageType]?.label ?? type}: ${count}`)
                  .join(" · ") || "no damage recorded"}{" "}
                · P1 {byPriority.P1} · P2 {byPriority.P2} · P3 {byPriority.P3} · P4 {byPriority.P4}. P1–P4 are
                provisional rule-derived decision-support priorities, not dataset ground truth.
              </p>
            </Card>

            <InspectionSummary inspection={data.inspection} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <DamageDistributionChart detections={data.detections} />
              <InspectionTimeline detections={data.detections} onSelect={setDrawerId} />
            </div>

            <AnnotatedFramePreview detections={data.detections} />

            <InspectionDetectionTable detections={data.detections} onView={setDrawerId} />
          </>
        )}
      </main>

      <DetectionDetailsDrawer detectionId={drawerId} onClose={() => setDrawerId(null)} />
    </>
  );
}

function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{label}</div>
      {children ?? <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</div>}
    </div>
  );
}
