/**
 * Active Alerts — derived from persisted P1/P2/P3 detections, newest first.
 * There is no separate alerts table and no fabricated alert content: each one
 * names a real detection, its inspection, and the road it was found on.
 */

import type { Alert, Priority } from "@/lib/types";
import { api } from "@/lib/api";

type ApiAlert = {
  id: string;
  inspection_id: string;
  detection_id: string;
  priority: string;
  title: string;
  road: string | null;
  area: string | null;
  created_at: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

const readAlerts = new Set<string>();

export async function getActiveAlerts(): Promise<Alert[]> {
  const rows = await api.get<ApiAlert[]>("/api/dashboard/alerts");
  return rows.map((a) => ({
    id: a.id,
    inspectionId: a.inspection_id,
    detectionId: a.detection_id,
    priority: a.priority as Priority,
    title: a.title,
    road: a.road ?? "—",
    area: a.area ?? "—",
    createdAt: a.created_at,
    relativeTime: relativeTime(a.created_at),
    isRead: readAlerts.has(a.id),
  }));
}

/** Read state is a UI concern only — the backend has no alerts table to mark. */
export async function markAlertRead(id: string): Promise<Alert | null> {
  readAlerts.add(id);
  const alerts = await getActiveAlerts();
  return alerts.find((a) => a.id === id) ?? null;
}

export async function markAllAlertsRead(): Promise<void> {
  const alerts = await getActiveAlerts();
  for (const a of alerts) {
    readAlerts.add(a.id);
  }
}
