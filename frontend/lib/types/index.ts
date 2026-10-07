export type Priority = "P1" | "P2" | "P3" | "P4";

export type DamageType =
  | "pothole"
  // The trained 3-class model emits: crack | pothole | surface_erosion.
  | "crack"
  | "surface_erosion"
  | "longitudinal_crack"
  | "transverse_crack"
  | "alligator_crack"
  | "surface_wear"
  | "patch";

export type InspectionSource = "live" | "upload";

export type InspectionStatus = "pending" | "processing" | "completed" | "failed";

export type CameraFacingMode = "environment" | "user";

export type CameraSource =
  | "phone_back"
  | "phone_front"
  | "webcam"
  | "usb_camera"
  | "ip_camera"
  | "dashboard_camera"
  | "demo_video";

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
  timestamp: string;
  damageType: DamageType;
  priority: Priority;
  confidence: number;
  priorityConfidence: number;
  modelVersion: string;
  road: string;
  area: string;
  lat: number;
  lng: number;
  detectedAt: string;
  features: DetectionFeatures;
  imagePath?: string | null;
  imageUrl?: string | null;
  bbox?: { x: number; y: number; width: number; height: number };
}

export type DataOrigin = "demo" | "real";

export interface Inspection {
  id: string;
  source: InspectionSource;
  /** "demo" = seeded demonstration record, "real" = RoadVision pipeline output. */
  dataOrigin: DataOrigin;
  title: string | null;
  originalFilename: string | null;
  frameSampleRate: number;
  /** Null when the inspection has no stored map pin. */
  lat: number | null;
  lng: number | null;
  road: string;
  area: string;
  city: string;
  ward: string;
  inspectorName: string;
  date: string;
  time: string;
  durationSeconds: number;
  framesProcessed: number;
  totalDamages: number;
  countByPriority: Record<Priority, number>;
  roadHealthScore: number;
  status: InspectionStatus;
}

export interface Alert {
  id: string;
  inspectionId: string;
  detectionId?: string;
  priority: Priority;
  title: string;
  road: string;
  area: string;
  createdAt: string;
  relativeTime: string;
  isRead: boolean;
}

export interface MapDetection {
  id: string;
  detectionId: string;
  inspectionId: string;
  lat: number;
  lng: number;
  road: string;
  area: string;
  ward: string;
  damageType: DamageType;
  priority: Priority;
  confidence: number | null;
  dataOrigin: DataOrigin;
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
  damageByType: { type: DamageType; count: number }[];
  damageByPriority: { priority: Priority; count: number }[];
  dailyTrend: { date: string; total: number; P1: number; P2: number; P3: number; P4: number }[];
  roadHealthDistribution: { label: string; percentage: number; color: string }[];
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
  roadHealthTrend: { date: string; score: number }[];
  damageTypeDistribution: { type: DamageType; count: number }[];
  priorityDistribution: { priority: Priority; count: number }[];
  mostAffectedRoads: { road: string; count: number }[];
}

export type ReportType = "inspection_summary" | "priority_backlog" | "ward_summary" | "trend_report";
export type ReportFormat = "pdf" | "csv";

export interface ReportFilters {
  /** Trailing window in days, from the builder's date range. */
  days?: number;
  road?: string;
  priority?: Priority | "all";
}

export interface Report {
  id: string;
  type: ReportType;
  typeLabel: string;
  createdAt: string;
  scope: string;
  generatedBy: string;
  format: ReportFormat;
  status: "ready" | "generating";
  /** What the report was scoped to — replayed against the API on preview. */
  filters?: ReportFilters;
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
