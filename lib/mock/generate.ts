import type {
  Alert,
  Detection,
  DetectionFeatures,
  DamageType,
  Inspection,
  InspectionSource,
  Priority,
} from "@/lib/types";
import { ROADS, type MockRoad } from "@/lib/mock/roads";
import { mulberry32, pick, randFloat, randInt } from "@/lib/mock/random";
import { damageTypeOrder } from "@/lib/priorityConfig";

const rand = mulberry32(1337);

// A stable "now" for the whole mock dataset, computed once when the server
// module loads. Keeps relative dates ("2 min ago") sensible for a demo run
// without needing per-request regeneration.
const NOW = new Date();

function daysAgo(n: number, hour = 9, minute = 0) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function displayTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function jitter(base: number, spread: number, r: () => number = rand) {
  return base + (r() - 0.5) * spread;
}

function makeFeatures(priority: Priority, r: () => number = rand): DetectionFeatures {
  // Loosely reverse-engineered from the priority so P1s look "bigger/denser"
  // than P4s, matching the rule-derived label logic in the ML Pipeline doc.
  const base = { P1: 0.85, P2: 0.6, P3: 0.35, P4: 0.15 }[priority];
  return {
    bboxAreaRatio: Math.max(0.01, jitter(base * 0.18, 0.08, r)),
    aspectRatio: Number(randFloat(0.6, 2.4, r).toFixed(2)),
    frameDamageCount: randInt(1, priority === "P1" ? 6 : 4, r),
    frameDamageDensity: Math.max(0.01, jitter(base * 0.15, 0.06, r)),
    detectorConfidence: Math.min(0.99, Math.max(0.42, jitter(base, 0.25, r))),
    framePositionY: Math.max(0.1, Math.min(0.95, jitter(base, 0.3, r))),
  };
}

interface InspectionSeed {
  id: string;
  source: InspectionSource;
  road: MockRoad;
  date: Date;
  totalDamages: number;
  p1: number;
  status?: Inspection["status"];
}

// The five rows shown exactly in the approved Dashboard mockup, plus seven
// more "today" runs (not individually listed in the top-5 widget, but real
// records) so the dashboard's headline totals are genuine aggregates rather
// than hardcoded numbers: 12 inspections today, 358 damages, 37 of them P1.
const TODAY_FEATURED: InspectionSeed[] = [
  { id: "INSP-2025-124", source: "live", road: ROADS[0], date: daysAgo(0, 10, 35), totalDamages: 28, p1: 5 },
  { id: "INSP-2025-123", source: "live", road: ROADS[1], date: daysAgo(0, 10, 20), totalDamages: 42, p1: 7 },
  { id: "INSP-2025-122", source: "upload", road: ROADS[2], date: daysAgo(0, 9, 45), totalDamages: 35, p1: 3 },
  { id: "INSP-2025-121", source: "upload", road: ROADS[3], date: daysAgo(0, 9, 10), totalDamages: 19, p1: 2 },
  { id: "INSP-2025-120", source: "live", road: ROADS[4], date: daysAgo(0, 8, 50), totalDamages: 31, p1: 6 },
];

const TODAY_EXTRA: InspectionSeed[] = [
  { id: "INSP-2025-119", source: "upload", road: ROADS[5], date: daysAgo(0, 8, 15), totalDamages: 25, p1: 2 },
  { id: "INSP-2025-118", source: "live", road: ROADS[6], date: daysAgo(0, 7, 40), totalDamages: 30, p1: 2 },
  { id: "INSP-2025-117", source: "upload", road: ROADS[7], date: daysAgo(0, 7, 5), totalDamages: 33, p1: 3 },
  { id: "INSP-2025-116", source: "live", road: ROADS[8], date: daysAgo(0, 6, 30), totalDamages: 22, p1: 1 },
  { id: "INSP-2025-115", source: "upload", road: ROADS[9], date: daysAgo(0, 6, 0), totalDamages: 28, p1: 2 },
  { id: "INSP-2025-114", source: "live", road: ROADS[10], date: daysAgo(0, 5, 25), totalDamages: 31, p1: 2 },
  { id: "INSP-2025-113", source: "upload", road: ROADS[11], date: daysAgo(0, 4, 50), totalDamages: 34, p1: 2 },
];

const FEATURED = [...TODAY_FEATURED, ...TODAY_EXTRA];

// Extra historical runs so Inspection History / Analytics have real depth.
function buildHistorical(): InspectionSeed[] {
  const seeds: InspectionSeed[] = [];
  let n = 112;
  for (let day = 1; day <= 13; day++) {
    const runsThatDay = randInt(1, 3);
    for (let i = 0; i < runsThatDay; i++) {
      const road = pick(ROADS);
      const source: InspectionSource = rand() > 0.45 ? "live" : "upload";
      const total = randInt(8, 48);
      const p1 = randInt(0, Math.max(1, Math.round(total * 0.18)));
      seeds.push({
        id: `INSP-2025-${n}`,
        source,
        road,
        date: daysAgo(day, randInt(7, 17)),
        totalDamages: total,
        p1,
        status: rand() > 0.94 ? "failed" : "completed",
      });
      n--;
    }
  }
  return seeds;
}

const ALL_SEEDS = [...FEATURED, ...buildHistorical()];

function splitPriorities(total: number, p1: number) {
  const remaining = total - p1;
  const p2 = Math.round(remaining * 0.42);
  const p3 = Math.round(remaining * 0.4);
  const p4 = Math.max(0, remaining - p2 - p3);
  return { P1: p1, P2: p2, P3: p3, P4: p4 } as Record<Priority, number>;
}

function buildInspections(): Inspection[] {
  return ALL_SEEDS.map((seed) => {
    const countByPriority = splitPriorities(seed.totalDamages, seed.p1);
    const healthPenalty = (countByPriority.P1 * 4 + countByPriority.P2 * 1.5) / Math.max(1, seed.totalDamages);
    const roadHealthScore = Math.max(20, Math.min(97, Math.round(92 - healthPenalty * 10 - randInt(0, 8))));
    return {
      id: seed.id,
      source: seed.source,
      status: seed.status ?? "completed",
      road: seed.road.name,
      area: seed.road.area,
      city: seed.road.city,
      ward: seed.road.ward,
      inspectorName: pick(["A. Karthik", "S. Priya", "R. Muthu", "V. Lakshmi", "N. Suresh"]),
      date: isoDate(seed.date),
      time: displayTime(seed.date),
      durationSeconds: seed.source === "live" ? randInt(180, 900) : randInt(300, 1800),
      framesProcessed: randInt(seed.totalDamages * 8, seed.totalDamages * 20 + 200),
      totalDamages: seed.totalDamages,
      countByPriority,
      roadHealthScore,
      lat: jitter(seed.road.lat, 0.01),
      lng: jitter(seed.road.lng, 0.01),
    };
  });
}

export const INSPECTIONS: Inspection[] = buildInspections();

function buildDetectionsForInspection(inspection: Inspection): Detection[] {
  const detections: Detection[] = [];
  const priorities: Priority[] = [];
  (Object.keys(inspection.countByPriority) as Priority[]).forEach((p) => {
    for (let i = 0; i < inspection.countByPriority[p]; i++) priorities.push(p);
  });

  priorities.forEach((priority, idx) => {
    const type = weightedDamageType(priority);
    const frameIndex = randInt(1, inspection.framesProcessed);
    const secondsIn = randInt(0, inspection.durationSeconds);
    const ts = new Date(0);
    ts.setSeconds(secondsIn);
    const detectedAt = new Date(new Date(`${inspection.date}T00:00:00`).getTime());
    detectedAt.setHours(0, 0, 0, 0);
    const base = new Date(`${inspection.date}T${inspection.time.includes("AM") || inspection.time.includes("PM") ? "09:00:00" : "09:00:00"}`);
    const shown = new Date(base.getTime() + secondsIn * 1000);

    detections.push({
      id: `${inspection.id}-D${String(idx + 1).padStart(3, "0")}`,
      inspectionId: inspection.id,
      frameIndex,
      timestamp: ts.toISOString().substring(11, 19),
      damageType: type,
      priority,
      confidence: Number(Math.min(0.99, Math.max(0.4, jitter(0.85, 0.3))).toFixed(3)),
      priorityConfidence: Number(Math.min(0.98, Math.max(0.55, jitter(0.85, 0.25))).toFixed(2)),
      modelVersion: "RF-v1.0",
      road: inspection.road,
      area: inspection.area,
      lat: jitter(inspection.lat, 0.006),
      lng: jitter(inspection.lng, 0.006),
      detectedAt: displayTime(shown),
      features: makeFeatures(priority),
    });
  });

  return detections;
}

function weightedDamageType(priority: Priority): DamageType {
  // Inverse of priorityForDamage: sample a plausible type given the priority.
  const urgent: DamageType[] = ["pothole", "alligator_crack"];
  const mid: DamageType[] = ["longitudinal_crack", "transverse_crack"];
  const minor: DamageType[] = ["surface_wear", "patch"];
  if (priority === "P1") return pick(rand() > 0.2 ? urgent : mid);
  if (priority === "P2") return pick([...urgent, ...mid]);
  if (priority === "P3") return pick([...mid, ...minor]);
  return pick(rand() > 0.3 ? minor : mid);
}

export const DETECTIONS: Detection[] = INSPECTIONS.flatMap(buildDetectionsForInspection);

export function detectionsForInspection(inspectionId: string) {
  return DETECTIONS.filter((d) => d.inspectionId === inspectionId);
}

export function inspectionById(id: string) {
  return INSPECTIONS.find((i) => i.id === id);
}

export function detectionById(id: string) {
  return DETECTIONS.find((d) => d.id === id);
}

// ---------------------------------------------------------------------------
// Alerts — the four featured in the approved mockup, plus a couple more for
// a realistic scrollable feed. Every alert references a real inspection.
// ---------------------------------------------------------------------------
function minutesAgoIso(mins: number) {
  return new Date(NOW.getTime() - mins * 60000).toISOString();
}

export const ALERTS: Alert[] = [
  {
    id: "ALERT-1",
    priority: "P1",
    title: "P1 Repair Required",
    road: "Anna Salai",
    area: "Teynampet",
    inspectionId: "INSP-2025-124",
    detectionId: detectionsForInspection("INSP-2025-124").find((d) => d.priority === "P1")?.id,
    isAggregate: false,
    createdAt: minutesAgoIso(2),
    isRead: false,
  },
  {
    id: "ALERT-2",
    priority: "P2",
    title: "P2 Repair Recommended",
    road: "GST Road",
    area: "Chromepet",
    inspectionId: "INSP-2025-123",
    detectionId: detectionsForInspection("INSP-2025-123").find((d) => d.priority === "P2")?.id,
    isAggregate: false,
    createdAt: minutesAgoIso(6),
    isRead: false,
  },
  {
    id: "ALERT-3",
    priority: "P3",
    title: "P3 Scheduled Maintenance",
    road: "OMR Road",
    area: "Sholinganallur",
    inspectionId: "INSP-2025-122",
    detectionId: detectionsForInspection("INSP-2025-122").find((d) => d.priority === "P3")?.id,
    isAggregate: false,
    createdAt: minutesAgoIso(12),
    isRead: false,
  },
  {
    id: "ALERT-4",
    priority: "P1",
    title: "Multiple Critical Damages",
    road: "Mount Road",
    area: "Egmore",
    inspectionId: "INSP-2025-121",
    isAggregate: true,
    createdAt: minutesAgoIso(15),
    isRead: false,
  },
  {
    id: "ALERT-5",
    priority: "P1",
    title: "P1 Repair Required",
    road: "ECR Road",
    area: "Neelankarai",
    inspectionId: "INSP-2025-120",
    detectionId: detectionsForInspection("INSP-2025-120").find((d) => d.priority === "P1")?.id,
    isAggregate: false,
    createdAt: minutesAgoIso(22),
    isRead: true,
  },
  {
    id: "ALERT-6",
    priority: "P2",
    title: "P2 Repair Recommended",
    road: "North Usman Road",
    area: "T. Nagar",
    inspectionId: INSPECTIONS[7]?.id ?? "INSP-2025-119",
    isAggregate: false,
    createdAt: minutesAgoIso(38),
    isRead: true,
  },
];

export { damageTypeOrder };

// ---------------------------------------------------------------------------
// Aggregation helpers — dashboard/analytics services build on these instead
// of hardcoding numbers, so the headline stats are real sums of the mock
// inspection/detection records above.
// ---------------------------------------------------------------------------
const TODAY_ISO = isoDate(NOW);

export function todaysInspections() {
  return INSPECTIONS.filter((i) => i.date === TODAY_ISO);
}

export function todaysDetections() {
  const ids = new Set(todaysInspections().map((i) => i.id));
  return DETECTIONS.filter((d) => ids.has(d.inspectionId));
}

export function aggregateByPriority(detections: Detection[]) {
  const counts: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  detections.forEach((d) => counts[d.priority]++);
  return counts;
}

export function aggregateByType(detections: Detection[]) {
  const counts: Record<DamageType, number> = {
    pothole: 0,
    longitudinal_crack: 0,
    transverse_crack: 0,
    alligator_crack: 0,
    surface_wear: 0,
    patch: 0,
  };
  detections.forEach((d) => counts[d.damageType]++);
  return counts;
}

export function last7DaysTrend() {
  const days: { date: string; total: number; P1: number; P2: number; P3: number; P4: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    const iso = isoDate(d);
    const dayInspections = INSPECTIONS.filter((ins) => ins.date === iso);
    const ids = new Set(dayInspections.map((ins) => ins.id));
    const dayDetections = DETECTIONS.filter((det) => ids.has(det.inspectionId));
    const counts = aggregateByPriority(dayDetections);
    days.push({
      date: d.toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
      total: dayDetections.length,
      ...counts,
    });
  }
  return days;
}

export const NOW_REF = NOW;
