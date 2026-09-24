"use client";

import { Select } from "@/components/ui/Controls";
import { priorityConfig, priorityOrder, damageTypeConfig, damageTypeOrder } from "@/lib/priorityConfig";
import { useRoadOptions } from "@/lib/hooks/useRoadOptions";

export interface AnalyticsFilterValue {
  dateRange: "7d" | "30d" | "90d";
  road: string;
  ward: string;
  damageType: string;
  priority: string;
}

export function AnalyticsFilters({
  value,
  onChange,
}: {
  value: AnalyticsFilterValue;
  onChange: (v: AnalyticsFilterValue) => void;
}) {
  const { roads, wards } = useRoadOptions();

  return (
    <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-2xl p-4">
      <Field label="Date Range">
        <Select value={value.dateRange} onChange={(e) => onChange({ ...value, dateRange: e.target.value as AnalyticsFilterValue["dateRange"] })}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </Select>
      </Field>
      <Field label="Road">
        <Select value={value.road} onChange={(e) => onChange({ ...value, road: e.target.value })}>
          <option value="all">All Roads</option>
          {roads.map((r) => (
            <option key={r.name} value={r.name}>{r.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Ward">
        <Select value={value.ward} onChange={(e) => onChange({ ...value, ward: e.target.value })}>
          <option value="all">All Wards</option>
          {wards.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </Select>
      </Field>
      <Field label="Damage Type">
        <Select value={value.damageType} onChange={(e) => onChange({ ...value, damageType: e.target.value })}>
          <option value="all">All Types</option>
          {damageTypeOrder.map((t) => (
            <option key={t} value={t}>{damageTypeConfig[t].label}</option>
          ))}
        </Select>
      </Field>
      <Field label="Priority">
        <Select value={value.priority} onChange={(e) => onChange({ ...value, priority: e.target.value })}>
          <option value="all">All Priorities</option>
          {priorityOrder.map((p) => (
            <option key={p} value={p}>{priorityConfig[p].fullLabel}</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="w-40">
      <label className="block text-[11px] font-medium text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
