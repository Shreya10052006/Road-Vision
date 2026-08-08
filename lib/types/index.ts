// ---------------------------------------------------------------------------
// RoadVision — shared domain types
// These mirror the locked Database Design document so the mock layer and the
// future FastAPI integration speak the same shape of data.
// ---------------------------------------------------------------------------

export type Priority = "P1" | "P2" | "P3" | "P4";

export type DamageType =
  | "pothole"
  | "longitudinal_crack"
  | "transverse_crack"
  | "alligator_crack"
  | "surface_wear"
  | "patch";

export type InspectionSource = "live" | "upload";

export type InspectionStatus = "pending" | "processing" | "completed" | "failed";

export type CameraSource =
  | "webcam"
  | "usb_camera"
  | "ip_camera"
  | "dashboard_camera"
  | "demo_video";

export interface PriorityMeta {
  code: Priority;
  label: string; // e.g. "Immediate"
  fullLabel: string; // e.g. "P1 — Immediate"
  description: string;
  color: string; // hex
  bg: string; // tailwind-safe soft background
  text: string; // tailwind-safe text color
}

export interface DamageTypeMeta {
  code: DamageType;
  label: string;
}

export interface Road {
  id: string;
  name: string;
  ward: string;
  city: string;
}

export interface Inspection {
  id: string; // e.g. INSP-2025-124
  source: InspectionSource;
  status: InspectionStatus;
  road: string;
  area: string;
  city: string;
  ward: string;
  inspectorName: string;
  date: string; // ISO date
  time: string; // display time e.g. "10:35 AM"
  durationSeconds: number;
  framesProcessed: number;
  totalDamages: number;
  countByPriority: Record<Priority, number>;
  roadHealthScore: number;
  lat: number;
  lng: number;
}

export interface DetectionFeatures {
  bboxAreaRatio: number;
  aspectRatio: number;
  frameDamageCount: number;
  frameDamageDensity: number;
  detectorConfidence: number;
  framePositionY: number;
}

export interface Detection {
  id: string;
  inspectionId: string;
  frameIndex: number;
  timestamp: string; // e.g. "00:13:24"
  damageType: DamageType;
  priority: Priority;
  confidence: number; // 0-1, detector confidence
  priorityConfidence: number; // 0-1, RF prediction confidence
  modelVersion: string;
  road: string;
  area: string;
  lat: number;
  lng: number;
  detectedAt: string; // display time e.g. "10:42 AM"
  imageUrl?: string;
  features: DetectionFeatures;
}

export interface Alert {
  id: string;
  priority: Priority;
  title: string;
  road: string;
  area: string;
  inspectionId: string;
  detectionId?: string;
  isAggregate: boolean;
  createdAt: string; // ISO timestamp
  isRead: boolean;
}

export interface DashboardStats {
  roadHealthScore: number;
  roadHealthDelta: number;
  totalInspectionsToday: number;
  totalInspectionsDelta: number;
  totalDamagesToday: number;
  totalDamagesDelta: number;
  criticalP1Today: number;
  criticalP1Delta: number;
  roadsInspectedKmToday: number;
  roadsInspectedKmDelta: number;
  damageByType: { type: DamageType; count: number; percentage: number }[];
  damageByPriority: { priority: Priority; count: number; percentage: number }[];
  totalDamages: number;
  dailyTrend: {
    date: string;
    total: number;
    P1: number;
    P2: number;
    P3: number;
    P4: number;
  }[];
  roadHealthDistribution: { label: string; percentage: number; color: string }[];
}

export interface MapDetection {
  id: string;
  detectionId: string;
  inspectionId: string;
  lat: number;
  lng: number;
  priority: Priority;
  damageType: DamageType;
  road: string;
  confidence: number;
  detectedAt: string;
  imageUrl?: string;
}

export interface AnalyticsData {
  kpis: {
    totalInspections: number;
    totalDamages: number;
    p1Damages: number;
    avgDamagesPerKm: number;
    roadHealthScore: number;
  };
  damageTrend: { date: string; count: number }[];
  damageTypeDistribution: { type: DamageType; count: number }[];
  priorityDistribution: { priority: Priority; count: number }[];
  roadHealthTrend: { date: string; score: number }[];
  mostAffectedRoads: { road: string; count: number }[];
}

export type ReportType =
  | "inspection_summary"
  | "priority_backlog"
  | "ward_summary"
  | "trend_report";

export type ReportFormat = "pdf" | "csv";
export type ReportStatus = "ready" | "generating" | "failed";

export interface Report {
  id: string;
  type: ReportType;
  typeLabel: string;
  dateRange: string;
  scope: string;
  generatedBy: string;
  format: ReportFormat;
  status: ReportStatus;
  createdAt: string;
}

export interface ReportPreviewData {
  title: string;
  dateRange: string;
  roadHealthScore: number;
  totalDamages: number;
  countByPriority: Record<Priority, number>;
  topCriticalDetections: Detection[];
  recommendations: string[];
}
