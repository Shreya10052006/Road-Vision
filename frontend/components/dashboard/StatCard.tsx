import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function StatCard({
  label,
  subtitle,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  iconBg,
  iconColor,
  ring,
}: {
  label: string;
  subtitle?: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  ring?: { value: number; color: string };
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
          {subtitle && <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>}
        </div>
        {ring ? (
          <div className="relative w-9 h-9 shrink-0">
            <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#E7E9F1" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke={ring.color}
                strokeWidth="4"
                strokeDasharray={`${(ring.value / 100) * 94.2} 94.2`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        ) : (
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon size={16} className={iconColor} />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
      {delta && (
        <div className="text-xs text-green-600 mt-1">
          {delta} {deltaLabel && <span className="text-slate-400">{deltaLabel}</span>}
        </div>
      )}
    </Card>
  );
}
