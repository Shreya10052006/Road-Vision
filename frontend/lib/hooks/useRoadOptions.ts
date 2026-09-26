"use client";

/**
 * Road and ward filter options, derived from the inspections actually in the
 * database — so the dropdowns list real roads (seeded demo ones and roads from
 * real inspections) instead of a hardcoded list.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ApiInspection } from "@/lib/services/mappers";

export type RoadOption = { name: string; ward: string };

export function useRoadOptions() {
  const [roads, setRoads] = useState<RoadOption[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get<{ items: ApiInspection[] }>("/api/inspections?limit=200")
      .then((res) => {
        if (!active) return;
        const seen = new Map<string, RoadOption>();
        for (const i of res.items) {
          if (i.road && !seen.has(i.road)) seen.set(i.road, { name: i.road, ward: i.ward ?? "—" });
        }
        setRoads([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setRoads([]));
    return () => {
      active = false;
    };
  }, []);

  const wards = Array.from(new Set(roads.map((r) => r.ward))).filter((w) => w && w !== "—");
  return { roads, wards };
}
