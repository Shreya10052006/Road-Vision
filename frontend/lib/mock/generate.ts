import type {
  Alert,
  DamageType,
  Detection,
  DetectionFeatures,
  Inspection,
  InspectionSource,
  Priority,
} from "@/lib/types";
import { damageTypeOrder, priorityOrder } from "@/lib/priorityConfig";
import { ROADS } from "@/lib/mock/roads";

// Deterministic PRNG so the mock dataset is stable across reloads within one server process.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20250524);

function randInt(min: number, max: number, r: () => number = rand) {
  return Math.floor(r() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, r: () => number = rand) {
  return min + r() * (max - min);
}
function pick<T>(arr: T[], r: () => number = rand): T {
  return arr[Math.floor(r() * arr.length)];
}

const NOW = new Date();
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

function weightedDamageType(priority: Priority): DamageType {
  const urgent: DamageType[] = ["pothole", "alligator_crack"];
  const mid: DamageType[] = ["longitudinal_crack", "transverse_crack"];
  const minor: DamageType[] = ["surface_wear", "patch"];
  if (priority === "P1") return pick(rand() < 0.7 ? urgent : mid);
  if (priority === "P2") return pick(rand() < 0.45 ? urgent : mid);
  if (priority === "P3") return pick(rand() < 0.4 ? mid : minor);
  return pick(rand() < 0.6 ? minor : mid);
}

function makeFeatures(priority: Priority): DetectionFeatures {
  const base = { P1: 0.85, P2: 0.6, P3: 0.35, P4: 0.15 }[priority];
  return {
    bboxAreaRatio: Math.max(0.01, base * 0.18 + (rand() - 0.5) * 0.08),
    aspectRatio: Number(randFloat(0.6, 2.4).toFixed(2)),
    frameDamageCount: randInt(1, priority === "P1" ? 6 : 4),
    frameDamageDensity: Math.max(0.01, base * 0.22 + (rand() - 0.5) * 0.1),
    detectorConfidence: Number(randFloat(0.6, 0.98).toFixed(3)),
    framePositionY: Number(randFloat(0.15, 0.95).toFixed(2)),
  };
}

function splitPriorities(total: number, p1Share: number): Record<Priority, number> {
  const p1 = Math.round(total * p1Share);
  const remaining = total - p1;
  const p2 = Math.round(remaining * 0.42);
  const p3 = Math.round(remaining * 0.4);
  const p4 = Math.max(0, remaining - p2 - p3);
  return { P1: p1, P2: p2, P3: p3, P4: p4 };
}

interface InspectionSeed {
  id: string;
  source: InspectionSource;
  roadIndex: number;
  daysAgo: number;
  time: string;
  totalDamages: number;
  p1Share: number;
  inspectorName: string;
}

// Exact top-5 "today" inspections shown on the approved Dashboard mockup.
const FEATURED: InspectionSeed[] = [
  { id: "INSP-2025-124", source: "live", roadIndex: 0, daysAgo: 0, time: "10:35 AM", totalDamages: 28, p1Share: 5 / 28, inspectorName: "R. Muthu" },
  { id: "INSP-2025-123", source: "live", roadIndex: 1, daysAgo: 0, time: "10:20 AM", totalDamages: 42, p1Share: 7 / 42, inspectorName: "K. Prakash" },
  { id: "INSP-2025-122", source: "upload", roadIndex: 2, daysAgo: 0, time: "9:45 AM", totalDamages: 35, p1Share: 3 / 35, inspectorName: "S. Lakshmi" },
  { id: "INSP-2025-121", source: "upload", roadIndex: 3, daysAgo: 0, time: "9:10 AM", totalDamages: 19, p1Share: 2 / 19, inspectorName: "R. Muthu" },
  { id: "INSP-2025-120", source: "live", roadIndex: 4, daysAgo: 0, time: "8:50 AM", totalDamages: 31, p1Share: 6 / 31, inspectorName: "K. Prakash" },
];

function buildTodayExtra(): InspectionSeed[] {
  // Pads today's total up toward the dashboard's headline "358 damages / 37 P1 / 12 inspections today".
  const seeds: InspectionSeed[] = [];
  const remainingRoads = [5, 6, 7, 8, 9, 10, 11];
  let counter = 119;
  for (let i = 0; i < 7; i++) {
    const total = randInt(15, 40);
    seeds.push({
      id: `INSP-2025-${counter--}`,
      source: rand() < 0.55 ? "live" : "upload",
      roadIndex: remainingRoads[i % remainingRoads.length],
      daysAgo: 0,
      time: `${randInt(6, 8)}:${String(randInt(0, 59)).padStart(2, "0")} AM`,
      totalDamages: total,
      p1Share: randFloat(0.08, 0.16),
      inspectorName: pick(["R. Muthu", "K. Prakash", "S. Lakshmi", "A. Devi"]),
    });
  }
  return seeds;
}

function buildHistorical(): InspectionSeed[] {
  const seeds: InspectionSeed[] = [];
  let counter = 200;
  for (let day = 1; day <= 29; day++) {
    const runsThisDay = randInt(1, 3);
    for (let i = 0; i < runsThisDay; i++) {
      seeds.push({
        id: `INSP-2025-${counter++}`,
        source: rand() < 0.5 ? "live" : "upload",
        roadIndex: randInt(0, ROADS.length - 1),
        daysAgo: day,
        time: `${randInt(7, 17)}:${String(randInt(0, 59)).padStart(2, "0")} ${randInt(7, 17) < 12 ? "AM" : "PM"}`,
        totalDamages: randInt(8, 45),
        p1Share: randFloat(0.06, 0.18),
        inspectorName: pick(["R. Muthu", "K. Prakash", "S. Lakshmi", "A. Devi"]),
      });
    }
  }
  return seeds;
}

const ALL_SEEDS = [...FEATURED, ...buildTodayExtra(), ...buildHistorical()];

function roadHealthFromDamages(total: number, p1: number) {
  const score = Math.max(20, Math.min(98, 100 - total * 0.9 - p1 * 2.2));
  return Math.round(score);
}

function buildInspections(): Inspection[] {
  return ALL_SEEDS.map((seed) => {
    const road = ROADS[seed.roadIndex % ROADS.length];
    const countByPriority = splitPriorities(seed.totalDamages, seed.p1Share);
    const d = daysAgo(seed.daysAgo);
    return {
      id: seed.id,
      source: seed.source,
      // This generator is kept for local development only — it is no longer a
      // data source for any page (the database is). Records it builds are
      // labelled "demo" so they can never be mistaken for pipeline output.
      dataOrigin: "demo",
      title: null,
      originalFilename: null,
      frameSampleRate: 1,
      lat: road.lat,
      lng: road.lng,
      road: road.name,
      area: road.area,
      city: "Chennai",
      ward: road.ward,
      inspectorName: seed.inspectorName,
      date: isoDate(d),
      time: seed.time,
      durationSeconds: randInt(120, 900),
      framesProcessed: randInt(600, 2200),
      totalDamages: seed.totalDamages,
      countByPriority,
      roadHealthScore: roadHealthFromDamages(seed.totalDamages, countByPriority.P1),
      status: "completed",
    };
  });
}

export const INSPECTIONS: Inspection[] = buildInspections();

function buildDetectionsForInspection(inspection: Inspection): Detection[] {
  const detections: Detection[] = [];
  const order: Priority[] = [];
  (Object.keys(inspection.countByPriority) as Priority[]).forEach((p) => {
    for (let i = 0; i < inspection.countByPriority[p]; i++) order.push(p);
  });

  order.forEach((priority, idx) => {
    const damageType = weightedDamageType(priority);
    const frameIndex = randInt(1, Math.max(1, inspection.framesProcessed));
    const seconds = randInt(0, 59);
    const minutes = randInt(0, 59);
    const hours = randInt(0, 23);
    const timestamp = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const roadMeta = ROADS.find((r) => r.name === inspection.road)!;

    detections.push({
      id: `${inspection.id}-D${String(idx + 1).padStart(3, "0")}`,
      inspectionId: inspection.id,
      frameIndex,
      timestamp,
      damageType,
      priority,
      confidence: Number(randFloat(0.6, 0.99).toFixed(3)),
      priorityConfidence: Number(randFloat(0.68, 0.97).toFixed(3)),
      modelVersion: "RF-v1.0",
      road: inspection.road,
      area: inspection.area,
      lat: roadMeta.lat + (rand() - 0.5) * 0.006,
      lng: roadMeta.lng + (rand() - 0.5) * 0.006,
      detectedAt: `${(hours % 12) || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`,
      features: makeFeatures(priority),
    });
  });

  return detections;
}

export const DETECTIONS: Detection[] = INSPECTIONS.flatMap(buildDetectionsForInspection);

export function detectionsForInspection(inspectionId: string) {
  return DETECTIONS.filter((d) => d.inspectionId === inspectionId);
}

export function inspectionById(id: string) {
  return INSPECTIONS.find((i) => i.id === id) ?? null;
}

export function detectionById(id: string) {
  return DETECTIONS.find((d) => d.id === id) ?? null;
}

export const ALERTS: Alert[] = [
  { id: "AL-001", inspectionId: "INSP-2025-124", priority: "P1", title: "P1 Repair Required", road: "Anna Salai", area: "Teynampet", createdAt: NOW.toISOString(), relativeTime: "2 min ago", isRead: false },
  { id: "AL-002", inspectionId: "INSP-2025-123", priority: "P2", title: "P2 Repair Recommended", road: "GST Road", area: "Chromepet", createdAt: NOW.toISOString(), relativeTime: "6 min ago", isRead: false },
  { id: "AL-003", inspectionId: "INSP-2025-122", priority: "P3", title: "P3 Scheduled Maintenance", road: "OMR Road", area: "Sholinganallur", createdAt: NOW.toISOString(), relativeTime: "12 min ago", isRead: false },
  { id: "AL-004", inspectionId: "INSP-2025-121", priority: "P1", title: "Multiple Critical Damages", road: "Mount Road", area: "Egmore", createdAt: NOW.toISOString(), relativeTime: "15 min ago", isRead: true },
  { id: "AL-005", inspectionId: "INSP-2025-120", priority: "P1", title: "P1 Repair Required", road: "ECR Road", area: "Neelankarai", createdAt: NOW.toISOString(), relativeTime: "22 min ago", isRead: true },
];

export { damageTypeOrder };

export function todaysInspections() {
  const today = isoDate(NOW);
  return INSPECTIONS.filter((i) => i.date === today);
}

export function todaysDetections() {
  const todayIds = new Set(todaysInspections().map((i) => i.id));
  return DETECTIONS.filter((d) => todayIds.has(d.inspectionId));
}

export function aggregateByPriority(detections: Detection[]) {
  const counts: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  detections.forEach((d) => counts[d.priority]++);
  return priorityOrder.map((p) => ({ priority: p, count: counts[p] }));
}

export function aggregateByType(detections: Detection[]) {
  const counts: Record<DamageType, number> = {
    pothole: 0,
    crack: 0,
    surface_erosion: 0,
    longitudinal_crack: 0,
    transverse_crack: 0,
    alligator_crack: 0,
    surface_wear: 0,
    patch: 0,
  };
  detections.forEach((d) => counts[d.damageType]++);
  return damageTypeOrder.map((t) => ({ type: t, count: counts[t] }));
}

export function last7DaysTrend() {
  const days: { date: string; total: number; P1: number; P2: number; P3: number; P4: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = isoDate(daysAgo(i));
    const dayDetections = DETECTIONS.filter((d) => {
      const insp = inspectionById(d.inspectionId);
      return insp?.date === date;
    });
    const counts: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    dayDetections.forEach((d) => counts[d.priority]++);
    days.push({ date, total: dayDetections.length, ...counts });
  }
  return days;
}

export const NOW_REF = NOW;
