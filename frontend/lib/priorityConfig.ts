import type { DamageType, Priority } from "@/lib/types";

export interface PriorityMeta {
  code: Priority;
  label: string;
  fullLabel: string;
  description: string;
  color: string;
  bg: string;
  text: string;
}

// Single source of truth for priority colors/labels.
export const priorityConfig: Record<Priority, PriorityMeta> = {
  P1: {
    code: "P1",
    label: "Immediate",
    fullLabel: "P1 – Immediate",
    description: "Safety hazard – repair as soon as possible",
    color: "#E53935",
    bg: "bg-red-50",
    text: "text-red-600",
  },
  P2: {
    code: "P2",
    label: "Within 7 Days",
    fullLabel: "P2 – Within 7 Days",
    description: "Schedule in the current short-term work order",
    color: "#FB8C00",
    bg: "bg-orange-50",
    text: "text-orange-600",
  },
  P3: {
    code: "P3",
    label: "Scheduled",
    fullLabel: "P3 – Scheduled Maintenance",
    description: "Suitable for the next routine maintenance cycle",
    color: "#F2C400",
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
  P4: {
    code: "P4",
    label: "Monitor Only",
    fullLabel: "P4 – Monitor Only",
    description: "Log and re-check on the next inspection pass",
    color: "#43A047",
    bg: "bg-green-50",
    text: "text-green-600",
  },
};

export const priorityOrder: Priority[] = ["P1", "P2", "P3", "P4"];

export function priorityBadgeClasses(p: Priority) {
  const c = priorityConfig[p];
  return `${c.bg} ${c.text}`;
}

export const damageTypeOrder: DamageType[] = ["pothole", "crack", "surface_erosion"];

export const damageTypeConfig: Record<DamageType, { label: string }> = {
  pothole: { label: "Pothole" },
  crack: { label: "Crack" },
  surface_erosion: { label: "Surface Erosion" },
  longitudinal_crack: { label: "Longitudinal Crack" },
  transverse_crack: { label: "Transverse Crack" },
  alligator_crack: { label: "Alligator Crack" },
  surface_wear: { label: "Surface Wear" },
  patch: { label: "Patch / Repair" },
};
