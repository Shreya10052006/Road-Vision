"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { priorityConfig, priorityOrder } from "@/lib/priorityConfig";
import type { MapDetection, Priority } from "@/lib/types";
import type { Cluster } from "@/components/dashboard/HotspotMapInner";

const HotspotMapInner = dynamic(() => import("@/components/dashboard/HotspotMapInner"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-50 dark:bg-slate-800/40 animate-pulse" />,
});

function clusterByRoad(detections: MapDetection[]): Cluster[] {
  const byRoad = new Map<string, MapDetection[]>();
  for (const d of detections) {
    const list = byRoad.get(d.road) ?? [];
    list.push(d);
    byRoad.set(d.road, list);
  }
  const clusters: Cluster[] = [];
  for (const [road, list] of byRoad) {
    // The cluster sits at the mean of its detections' own stored coordinates,
    // so every road in the database appears — nothing is looked up in a
    // hardcoded list, and markers never move between page loads.
    const points = list.filter((d) => d.lat !== 0 || d.lng !== 0);
    if (points.length === 0) continue;
    const lat = points.reduce((sum, d) => sum + d.lat, 0) / points.length;
    const lng = points.reduce((sum, d) => sum + d.lng, 0) / points.length;

    const counts: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    for (const d of list) counts[d.priority]++;
    const dominant = priorityOrder.reduce((best, p) => (counts[p] > counts[best] ? p : best), "P4" as Priority);
    clusters.push({ road, lat, lng, count: list.length, dominant });
  }
  return clusters;
}

export function HotspotMap({ detections }: { detections: MapDetection[] }) {
  const router = useRouter();
  const [visible, setVisible] = useState<Record<Priority, boolean>>({ P1: true, P2: true, P3: true, P4: true });

  const clusters = useMemo(() => {
    const filtered = detections.filter((d) => visible[d.priority]);
    return clusterByRoad(filtered);
  }, [detections, visible]);

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Damage Hotspot Map</CardTitle>
        <Link href="/map" className="text-xs font-medium text-primary hover:underline">
          View full map →
        </Link>
      </CardHeader>

      <div className="relative rounded-xl overflow-hidden border border-border h-[320px]">
        <div className="absolute z-[500] top-2.5 left-2.5 bg-white/95 dark:bg-slate-900/95 rounded-lg border border-border px-3 py-2 space-y-1 text-xs shadow-sm">
          {priorityOrder.map((p) => (
            <label key={p} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visible[p]}
                onChange={() => setVisible((v) => ({ ...v, [p]: !v[p] }))}
                className="accent-current"
                style={{ accentColor: priorityConfig[p].color }}
              />
              <span className="text-slate-700 dark:text-slate-200">{priorityConfig[p].fullLabel}</span>
            </label>
          ))}
        </div>

        <HotspotMapInner clusters={clusters} onSelectRoad={(road) => router.push(`/map?road=${encodeURIComponent(road)}`)} />
      </div>
    </Card>
  );
}
