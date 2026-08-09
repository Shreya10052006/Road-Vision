"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { priorityConfig } from "@/lib/priorityConfig";
import type { MapDetection } from "@/lib/types";

const CHENNAI_CENTER: [number, number] = [13.0067, 80.2206];

export default function DamageMap({
  detections,
  onSelect,
}: {
  detections: MapDetection[];
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer center={CHENNAI_CENTER} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {detections.map((d) => {
        const color = priorityConfig[d.priority].color;
        return (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={8}
            pathOptions={{ color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.9 }}
            eventHandlers={{ click: () => onSelect(d.detectionId) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <span className="text-xs font-medium">
                {d.damageType.replace(/_/g, " ")} · {d.priority}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
