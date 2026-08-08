import type { Alert } from "@/lib/types";
import { ALERTS } from "@/lib/mock/generate";
import { sleep } from "@/lib/utils";

// In-memory mutable copy so "mark as read" has a visible effect in the demo
// without a real backend. Resets on full page reload.
const state: Alert[] = ALERTS.map((a) => ({ ...a }));

export async function getActiveAlerts(): Promise<Alert[]> {
  await sleep(250);
  return [...state].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getUnreadAlertCount(): Promise<number> {
  await sleep(100);
  return state.filter((a) => !a.isRead).length;
}

export async function markAlertRead(id: string): Promise<void> {
  await sleep(150);
  const alert = state.find((a) => a.id === id);
  if (alert) alert.isRead = true;
}

export async function markAllAlertsRead(): Promise<void> {
  await sleep(150);
  state.forEach((a) => (a.isRead = true));
}
