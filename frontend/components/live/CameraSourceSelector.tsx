"use client";

import { useState } from "react";
import { Radio, SwitchCamera, Smartphone, HelpCircle, X, Check, Camera } from "lucide-react";
import { Select } from "@/components/ui/Controls";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { CameraFacingMode, CameraSource } from "@/lib/types";

const SOURCE_LABELS: Record<CameraSource, string> = {
  phone_back: "Phone Back Camera (Road)",
  phone_front: "Phone Front Camera (Cabin)",
  webcam: "Built-in / Laptop Webcam",
  usb_camera: "External USB Camera",
  ip_camera: "Phone IP / RTSP Stream",
  dashboard_camera: "Dashboard Camera",
  demo_video: "Demo Sample Video",
};

export function CameraSourceSelector({
  source,
  onChange,
  facingMode,
  onFacingModeChange,
  availableDevices = [],
  selectedDeviceId,
  onDeviceChange,
  onFlipCamera,
  connected,
  disabled,
}: {
  source: CameraSource;
  onChange: (s: CameraSource) => void;
  facingMode?: CameraFacingMode;
  onFacingModeChange?: (m: CameraFacingMode) => void;
  availableDevices?: MediaDeviceInfo[];
  selectedDeviceId?: string | null;
  onDeviceChange?: (deviceId: string) => void;
  onFlipCamera?: () => void;
  connected: boolean;
  disabled?: boolean;
}) {
  const [showPhoneHelp, setShowPhoneHelp] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Camera Source Selector */}
          <div className="w-56 sm:w-64">
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

          {/* Specific Device Selector if multiple video devices are found */}
          {availableDevices.length > 1 && onDeviceChange && (
            <div className="w-48 sm:w-56">
              <Select
                value={selectedDeviceId || ""}
                disabled={disabled}
                onChange={(e) => onDeviceChange(e.target.value)}
                aria-label="Select specific camera device"
              >
                <option value="">Default Camera</option>
                {availableDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Quick Flip Camera Button */}
          {onFlipCamera && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFlipCamera}
              className="flex items-center gap-1.5"
              title="Toggle between Front and Back Camera"
            >
              <SwitchCamera size={15} />
              <span className="hidden sm:inline">Flip Camera</span>
            </Button>
          )}

          {/* Front / Back Toggle Pills */}
          {onFacingModeChange && (
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onFacingModeChange("environment")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  facingMode === "environment"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                )}
              >
                Back (Road)
              </button>
              <button
                type="button"
                onClick={() => onFacingModeChange("user")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  facingMode === "user"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                )}
              >
                Front (Cabin)
              </button>
            </div>
          )}
        </div>

        {/* Status indicator & Phone connection instructions modal trigger */}
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setShowPhoneHelp(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <Smartphone size={14} />
            <span>Use Phone as Camera</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                connected ? "bg-green-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600",
              )}
            />
            <span className={cn("font-medium text-xs", connected ? "text-green-600 dark:text-green-400" : "text-slate-400")}>
              {connected ? "Active" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Phone Connection Help Dialog */}
      {showPhoneHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base">
                <Smartphone className="text-primary" size={20} />
                <span>How to use Phone Camera with RoadVision</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneHelp(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">Open on your Phone's Browser</div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect your phone to the same Wi-Fi and open this site (e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono text-[11px]">http://&lt;your-computer-ip&gt;:3000/live</code>).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">Grant Camera Permission</div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    When prompted by Chrome / Safari on your phone, tap <strong>Allow</strong> to let RoadVision access your Back & Front cameras.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">Switch Front & Back Cameras with 1 Tap</div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Use the <strong>Flip Camera</strong> button to switch to the Back camera (for inspecting road potholes) or Front camera (for in-cabin/selfie view).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowPhoneHelp(false)}>
                <Check size={16} /> Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
