import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProcessingStep {
  label: string;
  status: "pending" | "active" | "done";
}

export function ProcessingProgress({ steps }: { steps: ProcessingStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-3">
          <span
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              step.status === "done" && "bg-green-500 text-white",
              step.status === "active" && "bg-primary/10 text-primary",
              step.status === "pending" && "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}
          >
            {step.status === "done" ? (
              <Check size={13} />
            ) : step.status === "active" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
            )}
          </span>
          <span
            className={cn(
              "text-sm",
              step.status === "pending" ? "text-slate-400" : "text-slate-800 dark:text-slate-100 font-medium"
            )}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
