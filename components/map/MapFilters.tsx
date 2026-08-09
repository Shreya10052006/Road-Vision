import { Select } from "@/components/ui/Controls";
import { Button } from "@/components/ui/Button";
import { priorityConfig, priorityOrder, damageTypeConfig, damageTypeOrder } from "@/lib/priorityConfig";
import { ROADS } from "@/lib/mock/roads";
import type { MapFilters } from "@/lib/services/mapService";

export function MapFilterBar({
  filters,
  onChange,
  onApply,
  onReset,
}: {
  filters: MapFilters;
  onChange: (f: MapFilters) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-2xl p-4">
      <Field label="Priority">
        <Select value={filters.priority ?? "all"} onChange={(e) => onChange({ ...filters, priority: e.target.value as MapFilters["priority"] })}>
          <option value="all">All</option>
          {priorityOrder.map((p) => (
            <option key={p} value={p}>
              {priorityConfig[p].fullLabel}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Damage Type">
        <Select value={filters.damageType ?? "all"} onChange={(e) => onChange({ ...filters, damageType: e.target.value as MapFilters["damageType"] })}>
          <option value="all">All</option>
          {damageTypeOrder.map((t) => (
            <option key={t} value={t}>
              {damageTypeConfig[t].label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Road / Area">
        <Select value={filters.road ?? "all"} onChange={(e) => onChange({ ...filters, road: e.target.value })}>
          <option value="all">All</option>
          {ROADS.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Button size="sm" onClick={onApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="w-44">
      <label className="block text-[11px] font-medium text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
