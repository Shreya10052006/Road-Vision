"use client";

import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Controls";
import { priorityConfig, priorityOrder, damageTypeConfig, damageTypeOrder } from "@/lib/priorityConfig";
import { useRoadOptions } from "@/lib/hooks/useRoadOptions";
import type { DetectionFilters } from "@/lib/services/detectionService";

export function DetectionFilterBar({
  filters,
  onChange,
}: {
  filters: DetectionFilters;
  onChange: (f: DetectionFilters) => void;
}) {
  const { roads } = useRoadOptions();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search detection ID, road..."
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="w-44">
        <Select value={filters.damageType ?? "all"} onChange={(e) => onChange({ ...filters, damageType: e.target.value as DetectionFilters["damageType"] })}>
          <option value="all">All Damage Types</option>
          {damageTypeOrder.map((t) => (
            <option key={t} value={t}>
              {damageTypeConfig[t].label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <Select value={filters.priority ?? "all"} onChange={(e) => onChange({ ...filters, priority: e.target.value as DetectionFilters["priority"] })}>
          <option value="all">All Priorities</option>
          {priorityOrder.map((p) => (
            <option key={p} value={p}>
              {priorityConfig[p].fullLabel}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-44">
        <Select value={filters.road ?? "all"} onChange={(e) => onChange({ ...filters, road: e.target.value })}>
          <option value="all">All Roads</option>
          {roads.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
