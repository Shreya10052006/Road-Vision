import type { DamageType, Priority } from "@/lib/types";

export const priorityOrder: Priority[] = ["P1", "P2", "P3", "P4"];

export const priorityConfig: Record<Priority, { label: string; fullLabel: string; color: string }> = {
  P1: { label: "P1", fullLabel: "P1 - Immediate", color: "#E53935" },
  P2: { label: "P2", fullLabel: "P2 - Within 7 Days", color: "#FB8C00" },
  P3: { label: "P3", fullLabel: "P3 - Scheduled", color: "#FDD835" },
  P4: { label: "P4", fullLabel: "P4 - Monitor Only", color: "#43A047" },
};

/**
 * The damage classes the trained model actually emits. Filter dropdowns and
 * charts iterate this list. The label map below still carries the older
 * RDD2022-style names so any historical record renders with a readable label,
 * but those classes are no longer offered as filters.
 */
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
