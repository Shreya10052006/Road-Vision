"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { MapFilterBar } from "@/components/map/MapFilters";
import { DamagePopup } from "@/components/map/DamagePopup";
import { DetectionDetailsDrawer } from "@/components/detections/DetectionDetailsDrawer";
import { CardSkeleton } from "@/components/ui/States";
import { priorityConfig, priorityOrder } from "@/lib/priorityConfig";
import { getMapDetections, type MapFilters } from "@/lib/services/mapService";
import { getDetectionDetails } from "@/lib/services/detectionService";
import type { Detection, MapDetection, Priority } from "@/lib/types";

const DamageMap = dynamic(() => import("@/components/map/DamageMarker"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-50 dark:bg-slate-800/40 animate-pulse" />,
});

export default function MapPage() {
  const [filters, setFilters] = useState<MapFilters>({ priority: "all", damageType: "all", road: "all" });
  const [appliedFilters, setAppliedFilters] = useState<MapFilters>(filters);
  const [detections, setDetections] = useState<MapDetection[] | null>(null);
  const [selected, setSelected] = useState<Detection | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDetections(null);
    getMapDetections(appliedFilters).then((d) => {
      if (active) setDetections(d);
    });
    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const handleSelectMarker = async (detectionId: string) => {
    const d = await getDetectionDetails(detectionId);
    setSelected(d);
  };

  const counts: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  detections?.forEach((d) => counts[d.priority]++);
  const total = detections?.length ?? 0;

  return (
    <>
      <Header title="Damage Map" subtitle="Geographic view of detected road damage and maintenance priorities" />
      <main className="flex-1 p-4 sm:p-8 space-y-4 flex flex-col">
        <MapFilterBar
          filters={filters}
          onChange={setFilters}
          onApply={() => setAppliedFilters(filters)}
          onReset={() => {
            const reset: MapFilters = { priority: "all", damageType: "all", road: "all" };
            setFilters(reset);
            setAppliedFilters(reset);
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 flex-1 min-h-[560px]">
          <Card className="p-0 relative overflow-hidden">
            {/* Stats overlay */}
            <div className="absolute z-[500] top-4 left-4 flex gap-2">
              <StatPill label="Total" value={total} />
              {priorityOrder.map((p) => (
                <StatPill key={p} label={p} value={counts[p]} color={priorityConfig[p].color} />
              ))}
            </div>
            {!detections ? (
              <div className="p-8">
                <CardSkeleton lines={8} />
              </div>
            ) : (
              <DamageMap detections={detections} onSelect={handleSelectMarker} />
            )}
          </Card>

          <DamagePopup detection={selected} onViewDetails={() => selected && setDrawerId(selected.id)} />
        </div>
      </main>

      <DetectionDetailsDrawer detectionId={drawerId} onClose={() => setDrawerId(null)} />
    </>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 rounded-xl border border-border px-3 py-2 shadow-sm">
      <div className="text-[10px] font-medium" style={{ color: color ?? "#94A3B8" }}>
        {label}
      </div>
      <div className="text-base font-bold text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}
