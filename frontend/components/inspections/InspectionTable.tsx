"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { OriginBadge, PriorityDot, SourceBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { ClipboardList, Radio, Upload } from "lucide-react";
import type { Inspection } from "@/lib/types";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function InspectionTable({
  inspections,
  onClearFilters,
}: {
  inspections: Inspection[];
  onClearFilters?: () => void;
}) {
  const router = useRouter();

  if (inspections.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<ClipboardList size={22} />}
          title="No inspections found"
          description="There are no inspection runs matching your filters. Start a live inspection or upload road footage to begin."
          action={
            <div className="flex gap-2">
              {onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Clear Filters
                </Button>
              )}
              <Button size="sm" onClick={() => router.push("/live")}>
                <Radio size={14} /> Start Live Inspection
              </Button>
              <Button variant="secondary" size="sm" onClick={() => router.push("/upload")}>
                <Upload size={14} /> Upload Inspection
              </Button>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="font-medium px-2 pb-2">Inspection ID</th>
              <th className="font-medium px-2 pb-2">Source</th>
              <th className="font-medium px-2 pb-2">Origin</th>
              <th className="font-medium px-2 pb-2">Road</th>
              <th className="font-medium px-2 pb-2">Date</th>
              <th className="font-medium px-2 pb-2">Duration</th>
              <th className="font-medium px-2 pb-2">Frames</th>
              <th className="font-medium px-2 pb-2">Damages</th>
              <th className="font-medium px-2 pb-2">P1</th>
              <th className="font-medium px-2 pb-2">Status</th>
              <th className="font-medium px-2 pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((ins) => (
              <tr key={ins.id} className="border-t border-border hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-2 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{ins.id}</td>
                <td className="px-2 py-2.5"><SourceBadge source={ins.source} /></td>
                <td className="px-2 py-2.5"><OriginBadge origin={ins.dataOrigin} /></td>
                <td className="px-2 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{ins.road}</td>
                <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{ins.date}</td>
                <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDuration(ins.durationSeconds)}</td>
                <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{ins.framesProcessed.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-slate-700 dark:text-slate-200">{ins.totalDamages}</td>
                <td className="px-2 py-2.5"><PriorityDot priority="P1" count={ins.countByPriority.P1} /></td>
                <td className="px-2 py-2.5"><StatusBadge status={ins.status} /></td>
                <td className="px-2 py-2.5 text-right">
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/inspections/${ins.id}`)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
