"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OriginBadge, PriorityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { damageTypeConfig } from "@/lib/priorityConfig";
import type { DamageType, MapDetection } from "@/lib/types";

function damageLabel(value: string) {
  return (
    damageTypeConfig[value as DamageType]?.label ??
    value.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

/**
 * Details for the selected map marker. Every value shown is the persisted one
 * carried by the marker itself — nothing is re-derived or looked up.
 */
export function DamagePopup({
  detection,
  onViewDetection,
}: {
  detection: MapDetection | null;
  onViewDetection: () => void;
}) {
  const router = useRouter();

  return (
    <Card className="p-5 h-full">
      {!detection ? (
        <EmptyState
          icon={<MapPin size={20} />}
          title="No marker selected"
          description="Click any point on the map to see its detection details."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={detection.priority} />
            <OriginBadge origin={detection.dataOrigin} />
          </div>

          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {damageLabel(detection.damageType)}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {detection.road}
              {detection.area !== "—" ? `, ${detection.area}` : ""}
              {detection.ward !== "—" ? ` · ${detection.ward}` : ""}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field
              label="Confidence"
              value={detection.confidence != null ? `${(detection.confidence * 100).toFixed(1)}%` : "N/A"}
            />
            <Field label="Detection" value={detection.detectionId} />
            <Field label="Inspection" value={detection.inspectionId} />
            <Field label="Coordinates" value={`${detection.lat.toFixed(5)}, ${detection.lng.toFixed(5)}`} />
          </div>

          <p className="text-[11px] text-slate-400">
            P1–P4 are provisional rule-derived decision-support priorities, not dataset ground truth.
          </p>

          <div className="space-y-2">
            <Button className="w-full" onClick={() => router.push(`/inspections/${detection.inspectionId}`)}>
              View Inspection
            </Button>
            <Button variant="outline" className="w-full" onClick={onViewDetection}>
              View Detection
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-slate-800 dark:text-slate-100 break-all">{value}</div>
    </div>
  );
}
