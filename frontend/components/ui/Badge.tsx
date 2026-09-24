import { cn } from "@/lib/utils";
import { priorityConfig } from "@/lib/priorityConfig";
import type { DataOrigin, InspectionSource, InspectionStatus, Priority } from "@/lib/types";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium", className)}>
      {children}
    </span>
  );
}

/**
 * Marks whether a record is a seeded demonstration inspection or real output
 * of the RoadVision pipeline. Both live in the same database and are served by
 * the same APIs; this only makes the distinction visible.
 */
export function OriginBadge({ origin }: { origin: DataOrigin }) {
  return (
    <Badge
      className={
        origin === "demo"
          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
      }
    >
      {origin === "demo" ? "Demo" : "Real"}
    </Badge>
  );
}

export function PriorityBadge({ priority, compact }: { priority: Priority; compact?: boolean }) {
  const cfg = priorityConfig[priority];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-white"
      style={{ backgroundColor: cfg.color }}
    >
      {compact ? priority : cfg.fullLabel}
    </span>
  );
}

export function PriorityDot({ priority, count }: { priority: Priority; count: number }) {
  const cfg = priorityConfig[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {count}
    </span>
  );
}

export function SourceBadge({ source }: { source: InspectionSource }) {
  return (
    <Badge
      className={
        source === "live"
          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
      }
    >
      {source === "live" ? "Live" : "Upload"}
    </Badge>
  );
}

const STATUS_STYLES: Record<InspectionStatus, string> = {
  completed: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  processing: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

export function StatusBadge({ status }: { status: InspectionStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}
