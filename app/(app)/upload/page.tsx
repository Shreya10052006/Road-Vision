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
import { useToast } from "@/contexts/ToastContext";

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
  const [settings, setSettings] = useState<ProcessingSettingsValue>({ frameSamplingFps: 1, detectionConfidence: 0.5 });
  const [processing, setProcessing] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);

  const canStart = !!file && !!details.roadName && !!position;

  const handleStart = () => {
    if (!canStart) {
      showToast("Add a video, road name, and map location first", "error");
      return;
    }
    setProcessing(true);
    setStepIndex(0);
    let i = 0;
    const advance = () => {
      i++;
      if (i < STEP_LABELS.length) {
        setStepIndex(i);
        setTimeout(advance, 700 + Math.random() * 400);
      } else {
        setTimeout(() => {
          showToast("Inspection processed successfully", "success");
          router.push("/inspections/INSP-2025-124");
        }, 500);
      }
    };
    setTimeout(advance, 700);
  };

  const steps: ProcessingStep[] = STEP_LABELS.map((label, idx) => ({
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
              {file?.name} — this simulates the full CV/ML pipeline for the demo build.
            </p>
            <ProcessingProgress steps={steps} />
          </Card>
        ) : (
          <>
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
