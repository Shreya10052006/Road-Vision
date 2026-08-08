# RoadVision — Frontend Prototype

Intelligent Road Damage Assessment and Maintenance Prioritization using Computer Vision and Machine Learning.

This is the **frontend-only** prototype: a complete Next.js application with a realistic mock data/service layer, built so the FastAPI backend can be wired in later without redesigning the UI. No backend, ML, CV, database, or authentication is implemented — see the project documentation (SRS, PRD, System Architecture, ML Pipeline, CV Pipeline, Database Design, Dashboard UI Spec) for the full system design those pieces should follow.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects straight to `/dashboard` (no login).

```bash
npm run build   # production build
npm run lint    # eslint
```

## Routes

| Route | Page |
|---|---|
| `/dashboard` | Overview, KPIs, damage/priority charts, active alerts, hotspot map, recent inspections, trend, road health |
| `/live` | Live Inspection Center — frontend-only simulation of a live camera session |
| `/upload` | Upload Inspection — drag/drop video, map-pin location, simulated processing pipeline |
| `/map` | Damage Map — full interactive map with filters |
| `/inspections` | Inspection History — searchable/filterable table |
| `/inspections/[id]` | Inspection Details — summary, timeline, annotated frame preview, detection table |
| `/detections` | Detection Explorer — grid/table toggle |
| `/analytics` | Trends, distributions, most affected roads |
| `/reports` | Report builder, recent reports, report preview |
| `/settings` | Detection/processing/camera/appearance/map preferences |

## Architecture

```
components/
  layout/      AppShell, Sidebar, Header — shared app chrome
  dashboard/   Dashboard-specific widgets
  live/        Live Inspection Center widgets + useLiveSimulation hook (lib/hooks)
  upload/      Upload flow widgets, incl. Leaflet map-pin picker
  map/         Full Damage Map widgets
  inspections/ History table, details page widgets
  detections/  Detection Explorer + shared DetectionDetailsDrawer
  analytics/   Analytics charts
  reports/     Report builder/table/preview
  settings/    Settings section/row primitives
  ui/          Design-system primitives (Button, Card, Badge, Controls, Overlay, States)

lib/
  types/       Shared TypeScript types — mirrors the Database Design document
  priorityConfig.ts   Single source of truth for P1-P4 colors/labels — never hardcode a priority color elsewhere
  mock/        Seeded, internally-consistent mock dataset (roads, inspections, detections, alerts)
  services/    Mock service layer (getDashboardStats, getInspectionHistory, etc.) — swap the body only when
               wiring the real FastAPI backend; callers never change
  hooks/       useLiveSimulation — the Live Inspection Center's frontend simulation engine

contexts/      Theme (persisted to localStorage), Toast, Sidebar (mobile drawer), Camera (connect/disconnect state)
```

## Swapping in the real backend

Every page reads data through `lib/services/*.ts`. Each function is written to be replaced body-only:

```ts
export async function getDashboardStats(): Promise<DashboardStats> {
  // CURRENT:
  return computeFromMockData();

  // FUTURE:
  // return api.get("/api/dashboard/stats");
}
```

No component imports mock data directly, and no API URLs live in UI components — this is what makes the swap safe.

## Known limitations (by design, for this phase)

- No auth — this is an academic prototype; auth is explicitly out of scope for the frontend phase.
- Leaflet map tiles require `tile.openstreetmap.org` to be reachable — some sandboxed dev environments block this; it works in a normal browser/deployment.
- `next/font/google` was intentionally not used (some sandboxes can't reach `fonts.googleapis.com`); the app uses a system font stack instead. Swap in a webfont later if desired.
- Live Inspection Center and Upload Inspection simulate their pipelines with `setInterval`/`setTimeout` — no real camera or video processing occurs.
