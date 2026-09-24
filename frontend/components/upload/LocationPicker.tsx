"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];

const pinIcon = L.divIcon({
  className: "roadvision-pin-icon",
  html: `<div style="
    width:30px;height:30px;transform:translate(-50%,-100%);position:relative;
  ">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8 2 5 5.2 5 9.2C5 14.7 12 22 12 22C12 22 19 14.7 19 9.2C19 5.2 16 2 12 2Z" fill="#5B5FEE"/>
      <circle cx="12" cy="9.2" r="3" fill="white"/>
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  position,
  onPick,
}: {
  position: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-border h-[320px]">
      <MapContainer center={position ?? CHENNAI_CENTER} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickCapture onPick={onPick} />
        {position && <Marker position={position} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
