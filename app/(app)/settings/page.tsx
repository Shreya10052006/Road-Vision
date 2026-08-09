"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SettingsSection, SettingRow } from "@/components/settings/SettingsSection";
import { Select, Slider } from "@/components/ui/Controls";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useCamera } from "@/contexts/CameraContext";
import { useToast } from "@/contexts/ToastContext";
import type { CameraSource } from "@/lib/types";

const SOURCE_LABELS: Record<CameraSource, string> = {
  webcam: "Laptop Webcam",
  usb_camera: "USB Camera",
  ip_camera: "Phone IP Camera",
  dashboard_camera: "Dashboard Camera",
  demo_video: "Demo Video",
};

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { source, setSource } = useCamera();
  const { showToast } = useToast();

  const [confidence, setConfidence] = useState(0.5);
  const [samplingFps, setSamplingFps] = useState<1 | 2 | 5 | 10>(1);
  const [mapCity, setMapCity] = useState("Chennai");
  const [mapZoom, setMapZoom] = useState(11);

  const handleSave = () => showToast("Settings saved", "success");

  return (
    <>
      <Header title="Settings" subtitle="Configure RoadVision preferences and inspection behavior" />
      <main className="flex-1 p-4 sm:p-8 space-y-5 max-w-3xl">
        <SettingsSection title="Detection Settings" description="Applies to both Live Inspection Center and Upload Inspection.">
          <SettingRow label="Confidence Threshold" description="Detections below this confidence are discarded.">
            <div className="flex items-center gap-3">
              <Slider value={confidence} min={0.25} max={0.95} step={0.05} onChange={setConfidence} />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-9 text-right">
                {confidence.toFixed(2)}
              </span>
            </div>
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Processing Settings" description="Default sampling rate for uploaded video.">
          <SettingRow label="Frame Sampling Rate">
            <Select value={samplingFps} onChange={(e) => setSamplingFps(Number(e.target.value) as typeof samplingFps)}>
              <option value={1}>1 FPS</option>
              <option value={2}>2 FPS</option>
              <option value={5}>5 FPS</option>
              <option value={10}>10 FPS</option>
            </Select>
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Camera Settings" description="Default source for Live Inspection Center.">
          <SettingRow label="Camera Source">
            <Select value={source} onChange={(e) => setSource(e.target.value as CameraSource)}>
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Appearance">
          <SettingRow label="Theme" description="Applies across the whole application.">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit ml-auto">
              <ThemeButton active={theme === "light"} onClick={() => theme === "dark" && toggleTheme()} icon={<Sun size={14} />} label="Light" />
              <ThemeButton active={theme === "dark"} onClick={() => theme === "light" && toggleTheme()} icon={<Moon size={14} />} label="Dark" />
            </div>
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Map Settings">
          <SettingRow label="Default City">
            <Select value={mapCity} onChange={(e) => setMapCity(e.target.value)}>
              <option value="Chennai">Chennai</option>
            </Select>
          </SettingRow>
          <SettingRow label="Default Map Zoom">
            <div className="flex items-center gap-3">
              <Slider value={mapZoom} min={8} max={16} step={1} onChange={setMapZoom} />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-6 text-right">{mapZoom}</span>
            </div>
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Application">
          <SettingRow label="Version">
            <span className="text-sm text-slate-500 dark:text-slate-400">RoadVision v1.0</span>
          </SettingRow>
          <SettingRow label="Frontend Architecture">
            <span className="text-sm text-slate-500 dark:text-slate-400">Mock service layer</span>
          </SettingRow>
        </SettingsSection>

        <Button size="lg" className="w-full" onClick={handleSave}>
          Save Settings
        </Button>
      </main>
    </>
  );
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
        active ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100" : "text-slate-400"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
