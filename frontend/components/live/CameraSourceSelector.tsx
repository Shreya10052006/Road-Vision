"use client";

import { Radio, Video } from "lucide-react";
import { Select } from "@/components/ui/Controls";
import { cn } from "@/lib/utils";
import type { CameraSource } from "@/lib/types";

const SOURCE_LABELS: Record<CameraSource, string> = {
  webcam: "Laptop Webcam",
  usb_camera: "USB Camera",
  ip_camera: "Phone IP Camera",
  dashboard_camera: "Dashboard Camera",
  demo_video: "Demo Video",
};

export function CameraSourceSelector({
  source,
  onChange,
  connected,
  disabled,
}: {
  source: CameraSource;
  onChange: (s: CameraSource) => void;
  connected: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="w-52">
        <Select
          value={source}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as CameraSource)}
          aria-label="Camera source"
        >
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            connected ? "bg-green-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
          )}
        />
        <span className={cn("font-medium", connected ? "text-green-600" : "text-slate-400")}>
          {connected ? "Connected" : "Not Connected"}
        </span>
        {connected && (
          <span className="flex items-center gap-1 text-[11px] text-slate-400 ml-1">
            <Radio size={12} /> any OpenCV-compatible source
          </span>
        )}
      </div>
    </div>
  );
}

export { Video };
