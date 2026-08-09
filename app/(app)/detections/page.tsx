"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, TableSkeleton } from "@/components/ui/States";
import { DetectionFilterBar } from "@/components/detections/DetectionFilters";
import { DetectionCard } from "@/components/detections/DetectionCard";
import { DetectionTable } from "@/components/detections/DetectionTable";
import { DetectionDetailsDrawer } from "@/components/detections/DetectionDetailsDrawer";
import { getDetections, type DetectionFilters } from "@/lib/services/detectionService";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Detection } from "@/lib/types";

const EMPTY_FILTERS: DetectionFilters = { search: "", damageType: "all", priority: "all", road: "all" };

export default function DetectionExplorerPage() {
  const [filters, setFilters] = useState<DetectionFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [detections, setDetections] = useState<Detection[] | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDetections(null);
    const t = setTimeout(() => {
      getDetections(filters).then((d) => {
        if (active) setDetections(d.slice(0, 60));
      });
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filters]);

  return (
    <>
      <Header title="Detection Explorer" subtitle="Explore individual road damage detections and model predictions" />
      <main className="flex-1 p-4 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DetectionFilterBar filters={filters} onChange={setFilters} />
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shrink-0">
            <ToggleButton active={view === "grid"} onClick={() => setView("grid")} icon={<LayoutGrid size={15} />} label="Grid" />
            <ToggleButton active={view === "table"} onClick={() => setView("table")} icon={<List size={15} />} label="Table" />
          </div>
        </div>

        {!detections ? (
          <Card className="p-5">
            <TableSkeleton rows={6} />
          </Card>
        ) : detections.length === 0 ? (
          <Card className="p-5">
            <EmptyState
              icon={<SearchX size={22} />}
              title="No detections found"
              description="Try adjusting or clearing your filters."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear Filters
                </Button>
              }
            />
          </Card>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {detections.map((d) => (
              <DetectionCard key={d.id} detection={d} onView={() => setDrawerId(d.id)} />
            ))}
          </div>
        ) : (
          <DetectionTable detections={detections} onView={setDrawerId} />
        )}
      </main>

      <DetectionDetailsDrawer detectionId={drawerId} onClose={() => setDrawerId(null)} />
    </>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label} view`}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
        active ? "bg-primary text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
