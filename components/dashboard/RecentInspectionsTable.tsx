"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PriorityDot, SourceBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ClipboardList } from "lucide-react";
import type { Inspection } from "@/lib/types";

export function RecentInspectionsTable({ inspections }: { inspections: Inspection[] }) {
  const router = useRouter();

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Recent Inspections</CardTitle>
        <Link href="/inspections" className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </CardHeader>
      {inspections.length === 0 ? (
        <EmptyState icon={<ClipboardList size={22} />} title="No inspections yet" description="Start a live or upload inspection to see results here." />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="font-medium px-1 pb-2">Inspection ID</th>
                <th className="font-medium px-1 pb-2">Source</th>
                <th className="font-medium px-1 pb-2">Road / Area</th>
                <th className="font-medium px-1 pb-2">Time</th>
                <th className="font-medium px-1 pb-2">Damages</th>
                <th className="font-medium px-1 pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((ins) => (
                <tr
                  key={ins.id}
                  onClick={() => router.push(`/inspections/${ins.id}`)}
                  className="cursor-pointer border-t border-border hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-1 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{ins.id}</td>
                  <td className="px-1 py-2.5"><SourceBadge source={ins.source} /></td>
                  <td className="px-1 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{ins.road}</td>
                  <td className="px-1 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{ins.time}</td>
                  <td className="px-1 py-2.5 whitespace-nowrap">
                    <span className="text-slate-700 dark:text-slate-200 mr-1.5">{ins.totalDamages}</span>
                    <PriorityDot priority="P1" count={ins.countByPriority.P1} />
                  </td>
                  <td className="px-1 py-2.5"><StatusBadge status={ins.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
