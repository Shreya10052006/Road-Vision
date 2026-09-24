"use client";

import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { priorityConfig } from "@/lib/priorityConfig";
import type { Priority } from "@/lib/types";

const CHENNAI_CENTER: [number, number] = [13.0067, 80.2206];

export interface Cluster {
  road: string;
  lat: number;
  lng: number;
  count: number;
  dominant: Priority;
}

function bubbleIcon(count: number, color: string) {
  const size = 22 + Math.min(count, 12) * 2.2;
  return L.divIcon({
    className: "roadvision-cluster-icon",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};color:#fff;display:flex;align-items:center;justify-content:center;
      font-size:${size > 38 ? 13 : 11}px;font-weight:700;border:2px solid rgba(255,255,255,0.85);
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function HotspotMapInner({
  clusters,
  onSelectRoad,
}: {
  clusters: Cluster[];
  onSelectRoad: (road: string) => void;
}) {
  return (
    <MapContainer center={CHENNAI_CENTER} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {clusters.map((c) => {
        const color = priorityConfig[c.dominant].color;
        return (
          <Marker
            key={c.road}
            position={[c.lat, c.lng]}
            icon={bubbleIcon(c.count, color)}
            eventHandlers={{ click: () => onSelectRoad(c.road) }}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={1}>
              <span className="text-xs font-semibold">
                {c.road} — {c.count} detection{c.count !== 1 ? "s" : ""}
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
