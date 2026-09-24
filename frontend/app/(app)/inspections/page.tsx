"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { InspectionFilterBar } from "@/components/inspections/InspectionFilters";
import { InspectionTable } from "@/components/inspections/InspectionTable";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { Card } from "@/components/ui/Card";
import { getInspectionHistory, type InspectionFilters } from "@/lib/services/inspectionService";
import type { Inspection } from "@/lib/types";

const EMPTY_FILTERS: InspectionFilters = {
  search: "",
  source: "all",
  origin: "all",
  status: "all",
  priority: "all",
};

export default function InspectionHistoryPage() {
  const [filters, setFilters] = useState<InspectionFilters>(EMPTY_FILTERS);
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setInspections(null);
    setFailed(false);
    const t = setTimeout(() => {
      getInspectionHistory(filters)
        .then((data) => {
          if (active) setInspections(data);
        })
        .catch(() => {
          // No mock fallback: if the API is down the page says so, rather than
          // showing data that would make a broken backend look healthy.
          if (active) setFailed(true);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filters, reloadKey]);

  return (
    <>
      <Header title="Inspection History" subtitle="Review and compare previous road inspection runs" />
      <main className="flex-1 p-4 sm:p-8 space-y-4">
        <InspectionFilterBar filters={filters} onChange={setFilters} />
        {failed ? (
          <Card className="p-5">
            <ErrorState
              title="Could not load inspections from the API"
              onRetry={() => setReloadKey((k) => k + 1)}
            />
          </Card>
        ) : !inspections ? (
          <Card className="p-5">
            <TableSkeleton rows={6} />
          </Card>
        ) : (
          <InspectionTable inspections={inspections} onClearFilters={() => setFilters(EMPTY_FILTERS)} />
        )}
      </main>
    </>
  );
}
