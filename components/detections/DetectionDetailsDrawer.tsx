"use client";

import { useEffect, useState } from "react";
import { Camera, Layers, Sparkles } from "lucide-react";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, PriorityBadge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/States";
import { damageTypeConfig } from "@/lib/priorityConfig";
import { priorityConfig } from "@/lib/priorityConfig";
import { getDetectionDetails } from "@/lib/services/detectionService";
import type { Detection } from "@/lib/types";

export function DetectionDetailsDrawer({
  detectionId,
  detection: providedDetection,
  onClose,
}: {
  detectionId?: string | null;
  detection?: Detection | null;
  onClose: () => void;
}) {
  const [detection, setDetection] = useState<Detection | null>(providedDetection ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (providedDetection) {
      setDetection(providedDetection);
      return;
    }
    if (!detectionId) return;
    let active = true;
    setLoading(true);
    getDetectionDetails(detectionId).then((d) => {
      if (active) {
        setDetection(d);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [detectionId, providedDetection]);

  const open = !!detectionId || !!providedDetection;

  return (
    <Drawer open={open} onClose={onClose} title="Detection Details" widthClass="max-w-lg">
      {loading || !detection ? (
        <CardSkeleton lines={8} />
      ) : (
        <div className="space-y-6">
          {/* Annotated image */}
          <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 flex items-center justify-center">
            <Camera size={28} className="text-slate-600" />
            <div
              className="absolute border-2 rounded"
              style={{
                borderColor: priorityConfig[detection.priority].color,
                left: "30%",
                top: "35%",
                width: "34%",
                height: "28%",
              }}
            />
            <span className="absolute top-2 left-2">
              <PriorityBadge priority={detection.priority} />
            </span>
          </div>

          {/* Core info */}
          <div className="grid grid-cols-2 gap-4">
            <Info label="Damage Type" value={damageTypeConfig[detection.damageType].label} />
            <Info label="Priority" value={priorityConfig[detection.priority].fullLabel} />
            <Info label="Confidence" value={`${(detection.confidence * 100).toFixed(1)}%`} />
            <Info label="Frame" value={String(detection.frameIndex)} />
            <Info label="Timestamp" value={detection.timestamp} />
            <Info label="Road" value={`${detection.road}, ${detection.area}`} />
          </div>

          {/* ML feature section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers size={15} className="text-primary" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Model Input Features</h3>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <FeatureRow label="Bounding Box Area Ratio" value={detection.features.bboxAreaRatio.toFixed(3)} />
              <FeatureRow label="Aspect Ratio" value={detection.features.aspectRatio.toFixed(2)} />
              <FeatureRow label="Frame Damage Count" value={String(detection.features.frameDamageCount)} />
              <FeatureRow label="Frame Damage Density" value={detection.features.frameDamageDensity.toFixed(3)} />
              <FeatureRow label="Detector Confidence" value={detection.features.detectorConfidence.toFixed(3)} />
              <FeatureRow label="Frame Position Y" value={detection.features.framePositionY.toFixed(2)} last />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Locked V1 feature vector — see the ML Pipeline document. Frame Position X, road type, and timestamp are
              intentionally excluded from the model input.
            </p>
          </div>

          {/* Prediction */}
          <div className="rounded-xl border border-border p-4 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={15} className="text-primary" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Random Forest Prediction</h3>
            </div>
            <div className="flex items-center justify-between">
              <PriorityBadge priority={detection.priority} />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Confidence <span className="font-semibold text-slate-700 dark:text-slate-200">{(detection.priorityConfidence * 100).toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Model Version</span>
              <Badge className="bg-white dark:bg-slate-900 border border-border">{detection.modelVersion}</Badge>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

function FeatureRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 text-sm ${!last ? "border-b border-border" : ""}`}>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}
