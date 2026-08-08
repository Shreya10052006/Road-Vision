import { cn } from "@/lib/utils";
import { priorityConfig } from "@/lib/priorityConfig";
import type { InspectionSource, InspectionStatus, Priority } from "@/lib/types";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority, compact = false }: { priority: Priority; compact?: boolean }) {
  const c = priorityConfig[priority];
  return (
    <Badge className={cn(c.bg, c.text)}>
      {compact ? `${priority}: ` : ""}
      {compact ? "" : c.fullLabel}
      {compact && <span className="font-semibold">{priority}</span>}
    </Badge>
  );
}

export function PriorityDot({ priority, count }: { priority: Priority; count?: number }) {
  const c = priorityConfig[priority];
  return (
    <Badge className={cn(c.bg, c.text, "font-semibold")}>
      {priority}
      {typeof count === "number" ? `: ${count}` : ""}
    </Badge>
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

export function StatusBadge({ status }: { status: InspectionStatus }) {
  const styles: Record<InspectionStatus, string> = {
    completed: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    processing: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    pending: "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300",
    failed: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };
  const labels: Record<InspectionStatus, string> = {
    completed: "Completed",
    processing: "Processing",
    pending: "Pending",
    failed: "Failed",
  };
  return <Badge className={styles[status]}>{labels[status]}</Badge>;
}
