"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Controls";
import { VideoDropzone } from "@/components/upload/VideoDropzone";
import { InspectionDetailsForm, type InspectionDetailsValue } from "@/components/upload/InspectionDetailsForm";
import { ProcessingSettings, type ProcessingSettingsValue } from "@/components/upload/ProcessingSettings";
import { ProcessingProgress, type ProcessingStep } from "@/components/upload/ProcessingProgress";
import { PriorityBadge } from "@/components/ui/Badge";
import { AnnotatedFramePreview } from "@/components/inspections/AnnotatedFramePreview";
import { useToast } from "@/contexts/ToastContext";
import {
  API_BASE_URL,
  detectImage,
  detectVideo,
  type ApiDetection,
  type DetectImageResponse,
  type DetectVideoResponse,
} from "@/lib/api";
import type { DamageType, Detection, Priority } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/upload/LocationPicker"), {
  ssr: false,
  loading: () => <div className="rounded-xl border border-border h-[320px] bg-slate-50 dark:bg-slate-800/40 animate-pulse" />,
});

const STEP_LABELS = [
  "Uploading",
  "Frame Extraction",
  "Road Damage Detection",
  "Feature Extraction",
  "Priority Prediction",
  "Generating Results",
];

/** Turns the API's snake_case class name into a readable label. */
const formatDamageType = (value: string) =>
  value.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const isImageFile = (f: File) =>
  f.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp)$/i.test(f.name);

export default function UploadPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [details, setDetails] = useState<InspectionDetailsValue>({
    inspectionName: "",
    roadName: "",
    city: "Chennai",
    ward: "",
    inspectorName: "",
  });
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [settings, setSettings] = useState<ProcessingSettingsValue>({ frameSamplingFps: 2, detectionConfidence: 0.5 });
  const [processing, setProcessing] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [result, setResult] = useState<DetectImageResponse | null>(null);
  const [videoResult, setVideoResult] = useState<DetectVideoResponse | null>(null);

  const canStart = !!file && !!details.roadName && !!position;

  /** Real pipeline: frontend -> FastAPI -> YOLO best.pt -> features -> priority. */
  const runRealInspection = async (imageFile: File) => {
    setResult(null);
    setProcessing(true);
    setStepIndex(0);
    try {
      setStepIndex(2); // Road Damage Detection
      const data = await detectImage(imageFile, {
        save: true,
        title: details.inspectionName || undefined,
        road: details.roadName || undefined,
        city: details.city || undefined,
        ward: details.ward || undefined,
        inspector_name: details.inspectorName || undefined,
        latitude: position?.[0],
        longitude: position?.[1],
      });
      setStepIndex(4); // Priority Prediction
      setResult(data);
      setStepIndex(STEP_LABELS.length);
      showToast(
        data.detection_count > 0
          ? `${data.detection_count} damage${data.detection_count === 1 ? "" : "s"} detected${data.inspection_id ? ` — saved as ${data.inspection_id}` : ""}`
          : "No damage detected in this image",
        "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Detection failed", "error");
      setStepIndex(-1);
    } finally {
      setProcessing(false);
    }
  };

  /** Real video pipeline: OpenCV sampling -> YOLO -> features -> priority -> saved inspection. */
  const runVideoInspection = async (videoFile: File) => {
    setResult(null);
    setVideoResult(null);
    setProcessing(true);
    try {
      const data = await detectVideo(videoFile, {
        title: details.inspectionName || undefined,
        road: details.roadName || undefined,
        city: details.city || undefined,
        ward: details.ward || undefined,
        inspector_name: details.inspectorName || undefined,
        latitude: position?.[0],
        longitude: position?.[1],
        target_fps: settings.frameSamplingFps,
      });
      setVideoResult(data);
      showToast(
        `${data.summary.unique_damages} damage${data.summary.unique_damages === 1 ? "" : "s"} across ${data.video.processed_frames} frames — saved as ${data.inspection_id}`,
        "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Video processing failed", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleStart = () => {
    if (!canStart) {
      showToast("Add a video, road name, and map location first", "error");
      return;
    }
    if (file && isImageFile(file)) {
      void runRealInspection(file);
      return;
    }
    if (file) void runVideoInspection(file);
  };

  // Video processing is one real backend call with no intermediate progress to
  // report, so it shows a single honest step rather than a simulated sequence.
  const steps: ProcessingStep[] =
    stepIndex < 0
      ? [{ label: "Sampling frames → YOLOv8n → features → priority", status: "active" }]
      : STEP_LABELS.map((label, idx) => ({
          label,
          status: idx < stepIndex ? "done" : idx === stepIndex ? "active" : "pending",
        }));

  return (
    <>
      <Header title="Upload Inspection" subtitle="Upload road footage and set its inspection location" />
      <main className="flex-1 p-4 sm:p-8 space-y-5 max-w-4xl">
        {processing ? (
          <Card className="p-8">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Processing Inspection</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {file?.name} — running the real pipeline: frame sampling, YOLOv8n detection, feature
              extraction, and priority assignment. Larger videos take longer.
            </p>
            <ProcessingProgress steps={steps} />
          </Card>
        ) : (
          <>
            {videoResult && (
              <Card className="p-6">
                <CardHeader>
                  <div>
                    <CardTitle>Video Inspection Results</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Saved as {videoResult.inspection_id} · {videoResult.video.duration} ·{" "}
                      {videoResult.video.processed_frames} of {videoResult.video.total_frames} frames processed
                      (every {videoResult.video.frame_stride}
                      {videoResult.video.frame_stride % 10 === 1 && videoResult.video.frame_stride % 100 !== 11
                        ? "st"
                        : videoResult.video.frame_stride % 10 === 2 && videoResult.video.frame_stride % 100 !== 12
                          ? "nd"
                          : videoResult.video.frame_stride % 10 === 3 && videoResult.video.frame_stride % 100 !== 13
                            ? "rd"
                            : "th"}{" "}
                      frame at{" "}
                      {videoResult.video.fps} fps)
                    </p>
                  </div>
                </CardHeader>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Unique damages", value: videoResult.summary.unique_damages },
                    { label: "Raw detections", value: videoResult.summary.total_detections },
                    {
                      label: "Avg. confidence",
                      value: `${(videoResult.summary.average_confidence * 100).toFixed(1)}%`,
                    },
                    { label: "Video duration", value: videoResult.video.duration },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border px-4 py-3">
                      <div className="text-[11px] text-slate-400">{stat.label}</div>
                      <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">By damage type</div>
                    <div className="space-y-1.5">
                      {Object.entries(videoResult.summary.counts_by_damage_type).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">{formatDamageType(type)}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-100">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">By priority</div>
                    <div className="space-y-1.5">
                      {(["P1", "P2", "P3", "P4"] as const).map((p) => (
                        <div key={p} className="flex items-center justify-between text-sm">
                          <PriorityBadge priority={p} />
                          <span className="font-medium text-slate-800 dark:text-slate-100">
                            {videoResult.summary.counts_by_priority[p] ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {videoResult.damages.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No road damage detected above the configured confidence threshold.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {/* Visual Annotated Frame Snapshots */}
                    <AnnotatedFramePreview
                      detections={videoResult.damages.map((d, idx) => ({
                        id: `vid-${idx}`,
                        inspectionId: videoResult.inspection_id,
                        frameIndex: d.frame_number ?? idx + 1,
                        timestamp: d.first_seen ?? d.timestamp ?? "00:00:00",
                        damageType: (d.damage_type ?? "pothole") as DamageType,
                        priority: (d.priority ?? "P4") as Priority,
                        confidence: d.confidence ?? 0,
                        priorityConfidence: d.priority_confidence ?? 0,
                        modelVersion: d.model_version ?? d.priority_source ?? "rule",
                        road: details.roadName || "Road Corridor",
                        area: details.city || "Chennai",
                        lat: position?.[0] ?? 0,
                        lng: position?.[1] ?? 0,
                        detectedAt: new Date().toISOString(),
                        imagePath: d.image_path,
                        imageUrl: d.image_url
                          ? d.image_url.startsWith("http")
                            ? d.image_url
                            : `${API_BASE_URL}${d.image_url.startsWith("/") ? "" : "/"}${d.image_url}`
                          : null,
                        features: {
                          bboxAreaRatio: d.features?.bbox_area_ratio ?? 0,
                          aspectRatio: d.features?.aspect_ratio ?? 0,
                          frameDamageCount: d.features?.frame_damage_count ?? 0,
                          frameDamageDensity: d.features?.frame_damage_density ?? 0,
                          detectorConfidence: d.features?.detector_confidence ?? d.confidence ?? 0,
                          framePositionY: d.features?.frame_position_y ?? 0,
                        },
                      }))}
                    />

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Damage Inventory List
                      </div>
                      {videoResult.damages.map((d, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
                        >
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {formatDamageType(d.damage_type)}
                          </span>
                          <PriorityBadge priority={d.priority} compact />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {(d.confidence * 100).toFixed(1)}% confidence
                          </span>
                          <span className="text-xs text-slate-400">
                            first seen {d.first_seen} · frame {d.frame_number} · {d.frame_count} frame
                            {d.frame_count === 1 ? "" : "s"}
                          </span>
                          <span className="ml-auto text-[11px] text-slate-400">
                            priority source: {d.priority_source}
                          </span>
                        </div>
                      ))}
                      <p className="text-[11px] text-slate-400 pt-1">
                        Repeated sightings of the same defect across nearby frames are merged by damage type and
                        bounding-box overlap, so each row is one physical damage. Priorities marked &quot;rule&quot;
                        are provisional decision-support labels, not dataset ground truth.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button variant="secondary" onClick={() => router.push(`/inspections/${videoResult.inspection_id}`)}>
                    Open inspection record
                  </Button>
                </div>
              </Card>
            )}

            {result && (
              <Card className="p-6">
                <CardHeader>
                  <div>
                    <CardTitle>Detection Results</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {result.detection_count} detection{result.detection_count === 1 ? "" : "s"} ·{" "}
                      {result.image_width}×{result.image_height}px · YOLOv8n (best.pt)
                    </p>
                  </div>
                </CardHeader>
                {result.detection_count === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No road damage detected above the configured confidence threshold.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {/* Visual Annotated Frame Preview */}
                    <AnnotatedFramePreview
                      detections={result.detections.map((d: ApiDetection, idx: number) => ({
                        id: `img-${idx}`,
                        inspectionId: result.inspection_id ?? "TEMP",
                        frameIndex: 1,
                        timestamp: "00:00:00",
                        damageType: (d.damage_type ?? "pothole") as DamageType,
                        priority: (d.priority ?? "P4") as Priority,
                        confidence: d.confidence ?? 0,
                        priorityConfidence: d.priority_confidence ?? 0,
                        modelVersion: d.model_version ?? d.priority_source ?? "rule",
                        road: details.roadName || "Road Corridor",
                        area: details.city || "Chennai",
                        lat: position?.[0] ?? 0,
                        lng: position?.[1] ?? 0,
                        detectedAt: new Date().toISOString(),
                        imagePath: d.image_path ?? result.image_url,
                        imageUrl: (d.image_url ?? result.image_url)
                          ? (d.image_url ?? result.image_url)!.startsWith("http")
                            ? (d.image_url ?? result.image_url)!
                            : `${API_BASE_URL}${(d.image_url ?? result.image_url)!.startsWith("/") ? "" : "/"}${d.image_url ?? result.image_url}`
                          : null,
                        features: {
                          bboxAreaRatio: d.features?.bbox_area_ratio ?? 0,
                          aspectRatio: d.features?.aspect_ratio ?? 0,
                          frameDamageCount: d.features?.frame_damage_count ?? 0,
                          frameDamageDensity: d.features?.frame_damage_density ?? 0,
                          detectorConfidence: d.features?.detector_confidence ?? d.confidence ?? 0,
                          framePositionY: d.features?.frame_position_y ?? 0,
                        },
                      }))}
                    />

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Detected Damage Details
                      </div>
                      {result.detections.map((d: ApiDetection, i: number) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
                        >
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {formatDamageType(d.damage_type)}
                          </span>
                          <PriorityBadge priority={d.priority} compact />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {(d.confidence * 100).toFixed(1)}% confidence
                          </span>
                          <span className="text-xs text-slate-400">
                            bbox {d.bbox.x.toFixed(0)}, {d.bbox.y.toFixed(0)} · {d.bbox.width.toFixed(0)}×
                            {d.bbox.height.toFixed(0)}
                          </span>
                          <span className="ml-auto text-[11px] text-slate-400">
                            priority source: {d.priority_source}
                          </span>
                        </div>
                      ))}
                      <p className="text-[11px] text-slate-400 pt-1">
                        Priorities marked &quot;rule&quot; are provisional decision-support labels derived from the
                        documented heuristic, not dataset ground truth.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-6">
              <CardHeader>
                <CardTitle>Video</CardTitle>
              </CardHeader>
              <VideoDropzone file={file} onFileSelected={setFile} onRemove={() => setFile(null)} />
            </Card>

            <Card className="p-6">
              <CardHeader>
                <CardTitle>Inspection Details</CardTitle>
              </CardHeader>
              <InspectionDetailsForm value={details} onChange={setDetails} />
            </Card>

            <Card className="p-6">
              <CardHeader>
                <div>
                  <CardTitle>Inspection Location</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">Select the inspection location by dropping a pin on the map.</p>
                </div>
              </CardHeader>
              <LocationPicker position={position} onPick={(lat, lng) => setPosition([lat, lng])} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label>Latitude</Label>
                  <Input readOnly value={position ? position[0].toFixed(4) : ""} placeholder="13.0827" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input readOnly value={position ? position[1].toFixed(4) : ""} placeholder="80.2707" />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  {position ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pb-2.5">
                      <MapPin size={13} className="text-primary" />
                      Selected Location: {details.roadName || "Chennai"}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 pb-2.5">Click the map to set a location</span>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <CardHeader>
                <CardTitle>Processing Settings</CardTitle>
              </CardHeader>
              <ProcessingSettings value={settings} onChange={setSettings} />
            </Card>

            <Button size="lg" className="w-full" onClick={handleStart} disabled={!canStart}>
              Start Inspection
            </Button>
          </>
        )}
      </main>
    </>
  );
}
