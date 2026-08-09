"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { InspectionFilterBar } from "@/components/inspections/InspectionFilters";
import { InspectionTable } from "@/components/inspections/InspectionTable";
import { TableSkeleton } from "@/components/ui/States";
import { Card } from "@/components/ui/Card";
import { getInspectionHistory, type InspectionFilters } from "@/lib/services/inspectionService";
import type { Inspection } from "@/lib/types";

const EMPTY_FILTERS: InspectionFilters = { search: "", source: "all", status: "all", priority: "all" };

export default function InspectionHistoryPage() {
  const [filters, setFilters] = useState<InspectionFilters>(EMPTY_FILTERS);
  const [inspections, setInspections] = useState<Inspection[] | null>(null);

  useEffect(() => {
    let active = true;
    setInspections(null);
    const t = setTimeout(() => {
      getInspectionHistory(filters).then((data) => {
        if (active) setInspections(data);
      });
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filters]);

  return (
    <>
      <Header title="Inspection History" subtitle="Review and compare previous road inspection runs" />
      <main className="flex-1 p-4 sm:p-8 space-y-4">
        <InspectionFilterBar filters={filters} onChange={setFilters} />
        {!inspections ? (
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
