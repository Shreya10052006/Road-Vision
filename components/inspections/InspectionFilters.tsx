import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Controls";
import { priorityConfig, priorityOrder } from "@/lib/priorityConfig";
import type { InspectionFilters } from "@/lib/services/inspectionService";

export function InspectionFilterBar({
  filters,
  onChange,
}: {
  filters: InspectionFilters;
  onChange: (f: InspectionFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search road, inspection ID..."
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="w-36">
        <Select value={filters.source ?? "all"} onChange={(e) => onChange({ ...filters, source: e.target.value as InspectionFilters["source"] })}>
          <option value="all">All Sources</option>
          <option value="live">Live</option>
          <option value="upload">Upload</option>
        </Select>
      </div>
      <div className="w-40">
        <Select value={filters.status ?? "all"} onChange={(e) => onChange({ ...filters, status: e.target.value as InspectionFilters["status"] })}>
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </Select>
      </div>
      <div className="w-44">
        <Select value={filters.priority ?? "all"} onChange={(e) => onChange({ ...filters, priority: e.target.value as InspectionFilters["priority"] })}>
          <option value="all">All Priorities</option>
          {priorityOrder.map((p) => (
            <option key={p} value={p}>
              {priorityConfig[p].fullLabel}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
