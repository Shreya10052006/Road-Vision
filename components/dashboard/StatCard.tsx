import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  subtitle,
  delta,
  deltaLabel,
  icon: Icon,
  iconBg,
  iconColor,
  ring,
}: {
  label: string;
  value: string;
  subtitle?: string;
  delta?: string;
  deltaLabel?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  ring?: { value: number; color: string };
}) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
          </div>
          {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
        </div>
        <div
          className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}
        >
          {ring ? <RingIcon value={ring.value} color={ring.color} /> : <Icon size={18} className={iconColor} />}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-[26px] font-bold text-slate-900 dark:text-white leading-none">{value}</span>
      </div>
      {delta && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-green-600 font-medium">{delta}</span>
          {deltaLabel && <span className="text-slate-400">{deltaLabel}</span>}
        </div>
      )}
    </Card>
  );
}

function RingIcon({ value, color }: { value: number; color: string }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={radius} fill="none" stroke="#E7E9F1" strokeWidth="4" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}
