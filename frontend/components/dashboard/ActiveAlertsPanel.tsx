"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { priorityConfig } from "@/lib/priorityConfig";
import type { Alert } from "@/lib/types";

export function ActiveAlertsPanel({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Active Alerts</CardTitle>
        <Link href="/inspections" className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </CardHeader>
      {alerts.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={20} />} title="No active alerts" description="You're all caught up." />
      ) : (
        <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const color = priorityConfig[alert.priority].color;
            return (
              <button
                key={alert.id}
                onClick={() => router.push(`/inspections/${alert.inspectionId}`)}
                className="w-full flex items-start gap-3 text-left px-2 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}1A`, color }}
                >
                  <AlertTriangle size={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{alert.title}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {alert.road}, {alert.area}
                  </div>
                </span>
                <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">{alert.relativeTime}</span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
