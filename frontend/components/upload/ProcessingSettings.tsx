import { Label, Select, Slider } from "@/components/ui/Controls";

export interface ProcessingSettingsValue {
  frameSamplingFps: 1 | 2 | 5 | 10;
  detectionConfidence: number;
}

export function ProcessingSettings({
  value,
  onChange,
}: {
  value: ProcessingSettingsValue;
  onChange: (v: ProcessingSettingsValue) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <Label>Frame Sampling Rate</Label>
        <Select
          value={value.frameSamplingFps}
          onChange={(e) => onChange({ ...value, frameSamplingFps: Number(e.target.value) as ProcessingSettingsValue["frameSamplingFps"] })}
        >
          <option value={1}>1 FPS</option>
          <option value={2}>2 FPS</option>
          <option value={5}>5 FPS</option>
          <option value={10}>10 FPS</option>
        </Select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="mb-0">Detection Confidence</Label>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {value.detectionConfidence.toFixed(2)}
          </span>
        </div>
        <Slider
          value={value.detectionConfidence}
          min={0.25}
          max={0.95}
          step={0.05}
          onChange={(v) => onChange({ ...value, detectionConfidence: v })}
        />
      </div>
    </div>
  );
}
