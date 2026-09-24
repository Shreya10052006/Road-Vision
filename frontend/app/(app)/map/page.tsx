"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { MapFilterBar } from "@/components/map/MapFilters";
import { DamagePopup } from "@/components/map/DamagePopup";
import { DetectionDetailsDrawer } from "@/components/detections/DetectionDetailsDrawer";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/States";
import { MapPin } from "lucide-react";
import { priorityConfig, priorityOrder } from "@/lib/priorityConfig";
import { getMapDetections, type MapFilters } from "@/lib/services/mapService";
import type { MapDetection, Priority } from "@/lib/types";

const DamageMap = dynamic(() => import("@/components/map/DamageMarker"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-50 dark:bg-slate-800/40 animate-pulse" />,
});

const EMPTY_FILTERS: MapFilters = { priority: "all", damageType: "all", origin: "all", road: "all" };

export default function MapPage() {
  const [filters, setFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [detections, setDetections] = useState<MapDetection[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<MapDetection | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDetections(null);
    setFailed(false);
    setSelected(null);
    getMapDetections(appliedFilters)
      .then((d) => {
        if (active) setDetections(d);
      })
      .catch(() => {
        // No mock fallback: an unreachable API shows an error, never markers.
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [appliedFilters, reloadKey]);

  // The marker already carries every persisted value the panel shows, so
  // selecting one needs no second request.
  const handleSelectMarker = (marker: MapDetection) => setSelected(marker);

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
            setFilters(EMPTY_FILTERS);
            setAppliedFilters(EMPTY_FILTERS);
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 flex-1 min-h-[560px]">
          <Card className="p-0 relative overflow-hidden">
            <div className="absolute z-[500] top-4 left-4 flex gap-2">
              <StatPill label="Total" value={total} />
              {priorityOrder.map((p) => (
                <StatPill key={p} label={p} value={counts[p]} color={priorityConfig[p].color} />
              ))}
            </div>
            {failed ? (
              <div className="p-8">
                <ErrorState
                  title="Could not load map data from the API"
                  onRetry={() => setReloadKey((k) => k + 1)}
                />
              </div>
            ) : !detections ? (
              <div className="p-8">
                <CardSkeleton lines={8} />
              </div>
            ) : detections.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<MapPin size={22} />}
                  title="No mapped inspections available"
                  description="No persisted detection matches these filters with stored coordinates. Records without coordinates still appear in History and Analytics."
                />
              </div>
            ) : (
              <DamageMap detections={detections} onSelect={handleSelectMarker} />
            )}
          </Card>

          <DamagePopup
            detection={selected}
            onViewDetection={() => selected && setDrawerId(selected.detectionId)}
          />
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
