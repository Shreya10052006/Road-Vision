"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { priorityConfig } from "@/lib/priorityConfig";
import { timeAgo } from "@/lib/utils";
import { markAlertRead } from "@/lib/services/alertService";
import type { Alert } from "@/lib/types";

export function ActiveAlertsPanel({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();

  return (
    <Card className="p-5 flex flex-col">
      <CardHeader>
        <CardTitle>Active Alerts</CardTitle>
        <Link href="/inspections" className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </CardHeader>
      {alerts.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={22} />}
          title="No active alerts"
          description="P1–P3 detections will appear here as they're found."
        />
      ) : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const c = priorityConfig[alert.priority];
            return (
              <button
                key={alert.id}
                onClick={async () => {
                  await markAlertRead(alert.id);
                  router.push(`/inspections/${alert.inspectionId}`);
                }}
                className="w-full flex items-start gap-3 text-left px-2 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${c.color}1A`, color: c.color }}
                >
                  <AlertTriangle size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {alert.title}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                    {alert.road}, {alert.area}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 shrink-0 pt-0.5">{alert.createdAt ? timeAgo(alert.createdAt) : alert.relativeTime}</span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
