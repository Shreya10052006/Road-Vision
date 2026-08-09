"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { CardSkeleton, EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { SourceBadge, StatusBadge } from "@/components/ui/Badge";
import { InspectionSummary } from "@/components/inspections/InspectionSummary";
import { InspectionTimeline } from "@/components/inspections/InspectionTimeline";
import { AnnotatedFramePreview } from "@/components/inspections/AnnotatedFramePreview";
import { InspectionDetectionTable } from "@/components/inspections/InspectionDetectionTable";
import { DamageDistributionChart } from "@/components/inspections/DamageDistributionChart";
import { DetectionDetailsDrawer } from "@/components/detections/DetectionDetailsDrawer";
import { getInspectionDetails } from "@/lib/services/inspectionService";
import { FileSearch } from "lucide-react";
import type { Detection, Inspection } from "@/lib/types";

export default function InspectionDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ inspection: Inspection; detections: Detection[] } | null | undefined>(undefined);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getInspectionDetails(params.id).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <>
      <Header
        title={data ? `Inspection ${data.inspection.id}` : `Inspection ${params.id}`}
        subtitle={data ? `${data.inspection.road}, ${data.inspection.area} — ${data.inspection.date}` : undefined}
      />
      <main className="flex-1 p-4 sm:p-8 space-y-5">
        {data === undefined ? (
          <Card className="p-8">
            <CardSkeleton lines={10} />
          </Card>
        ) : data === null ? (
          <Card className="p-8">
            <EmptyState
              icon={<FileSearch size={22} />}
              title="Inspection not found"
              description="This inspection ID doesn't match any record in the mock dataset."
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
                <Field label="Road" value={data.inspection.road} />
                <Field label="Area" value={data.inspection.area} />
                <Field label="Ward" value={data.inspection.ward} />
                <Field label="Inspector" value={data.inspection.inspectorName} />
                <Field label="Date" value={`${data.inspection.date} · ${data.inspection.time}`} />
                <Field label="Status"><StatusBadge status={data.inspection.status} /></Field>
              </div>
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

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{label}</div>
      {children ?? <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</div>}
    </div>
  );
}
