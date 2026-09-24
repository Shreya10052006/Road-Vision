import { cn } from "@/lib/utils";

export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn("h-3.5 rounded bg-slate-100 dark:bg-slate-800", i === 0 ? "w-1/2" : "w-full")} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-10 px-4">
      {icon && (
        <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {description && <p className="text-xs text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-10 px-4">
      <h3 className="text-sm font-semibold text-red-600">{title}</h3>
      <p className="text-xs text-slate-400">Please try again.</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-xs font-medium text-primary hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}
