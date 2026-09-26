# RoadVision API — Backend Foundation

FastAPI backend for RoadVision. This phase covers **inspections, detections,
dashboard, map, and analytics endpoints backed by a real SQLite database** —
it deliberately does **not** run YOLO, Random Forest, or any CV/ML inference.
See `app/ml/` for the prepared-but-unimplemented interfaces that phase will fill in.

## Setup

```bash
cd backend
python -m venv .venv

# macOS / Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Interactive docs (Swagger UI): http://localhost:8000/docs
- SQLite database file is created automatically at `backend/roadvision.db` on first run.

## Test

```bash
python -m pytest -v
```

21 tests, all passing as of this phase — health, DB initialization, inspection
create/list/get/delete, upload validation (valid + invalid file types),
detection retrieval (including the "no detections yet" case), and dashboard/
map/analytics on an empty database.

## Architecture

```
backend/
├── app/
│   ├── main.py                 FastAPI app: CORS, error handlers, router registration, lifespan/init_db
│   ├── core/
│   │   ├── config.py           Env-driven settings (pydantic-settings)
│   │   ├── logging.py          Logging setup
│   │   └── ids.py               Human-readable public ID generation (INSP-2026-0001, ...)
│   ├── api/routes/
│   │   ├── health.py
│   │   ├── inspections.py      list / create / upload / get / detections / delete
│   │   ├── detections.py       list / get
│   │   ├── dashboard.py        stats / alerts / recent-inspections / trends
│   │   ├── map.py               geotagged detections
│   │   └── analytics.py        aggregate KPIs, distributions, road ranking
│   ├── db/
│   │   ├── database.py         Engine, session, get_db dependency, init_db
│   │   └── models.py           Inspection, Detection (SQLAlchemy 2.0 style)
│   ├── schemas/                Pydantic request/response models
│   ├── services/                Business logic (routes stay thin)
│   └── ml/                      NOT IMPLEMENTED — interfaces only (see below)
├── uploads/                      Saved video files land here
├── models/                      Future trained-model artifacts (YOLOv8 .pt, Random Forest .joblib)
└── tests/
```

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/inspections` | List inspections (filters: `source`, `status`, `search`; paginated) |
| POST | `/api/inspections` | Create a **live**-mode inspection record |
| POST | `/api/inspections/upload` | Upload a video (multipart) → validates, saves, creates inspection |
| GET | `/api/inspections/{id}` | Get one inspection |
| GET | `/api/inspections/{id}/detections` | Detections for one inspection |
| DELETE | `/api/inspections/{id}` | Delete an inspection (and its file, if any) |
| GET | `/api/detections` | List detections (filters: `damage_type`, `priority`) |
| GET | `/api/detections/{id}` | Get one detection |
| GET | `/api/dashboard/stats` | Today's totals, damage-by-type/priority |
| GET | `/api/dashboard/alerts` | P1/P2/P3 detections, newest first |
| GET | `/api/dashboard/recent-inspections` | Most recent inspections |
| GET | `/api/dashboard/trends` | Daily detection counts, last N days |
| GET | `/api/map/detections` | Geotagged + prioritized detections only |
| GET | `/api/analytics` | KPIs, distributions, most-affected roads |

Every route returns real data from SQLite. **A fresh database returns zeros
and empty lists — that is correct, not a bug.** Nothing here fabricates
detections, damage types, or priorities.

## Database Models

**`Inspection`** — one live session or uploaded video/image set. Location
and metadata fields are optional at creation. `frames_processed`,
`total_detections`, `duration_seconds`, and `road_health_score` start at
0/NULL and are meant to be filled in by the future ML pipeline — not by
this phase.

**`Detection`** — one detected defect. `frame_number` and `frame_timestamp`
can be set as soon as a frame exists; `damage_type`/`confidence`/bbox
columns are NULL until YOLO runs; the 6 locked V1 feature columns
(`feature_bbox_area_ratio` etc., matching ML_Pipeline.md exactly) are NULL
until feature extraction runs; `priority`/`priority_confidence`/
`model_version` are NULL until the Random Forest model runs.

No column is ever given a placeholder non-NULL value to "look complete."

## How to run the frontend alongside this

```bash
cd ..            # repo root
npm install
npm run dev      # http://localhost:3000
```

The frontend is **still running on its mock service layer** (`lib/services/*.ts`)
— this phase does not touch it, per the brief. Both servers were run
together and verified not to conflict (backend on :8000, frontend on :3000,
CORS already allowlists `http://localhost:3000`).

## Frontend integration — what has to change, later

The frontend's mock types (`lib/types/index.ts`) are camelCase and include
fields this backend doesn't compute yet (e.g. `roadHealthDelta`,
`totalInspectionsDelta` — "vs yesterday" deltas that would need real
historical data to be honest, so they're absent here rather than faked).
When the switch happens:

1. Add a thin `lib/api.ts` wrapper (base URL from an env var) — never scatter `fetch()` in components.
2. In each `lib/services/*.ts` file, replace the mock-data body with a call to `lib/api.ts`, keeping the exported function signature identical so no page/component changes.
3. Map snake_case → camelCase and decide what to do about fields this backend doesn't yet provide (deltas, road health distribution buckets, alerts' `relativeTime` string, reports) — see "Still to decide" below.

## Still to decide before the ML phase

- **Road Health Score formula.** Referenced everywhere (frontend mockup, this backend's schema) but never mathematically defined. Needs to be decided once real detection data exists to calibrate against.
- **"Vs yesterday" deltas.** The frontend mock fabricates these for demo purposes; the real backend won't, until there's enough historical data to compute them honestly. Decide whether the Dashboard UI should hide deltas on day one of real data, or wait for N days of history first.
- **Reports endpoints.** Deliberately not built this phase — not in the acceptance criteria, and real report generation (PDF/CSV) felt like scope the brief's Rule 9 ("don't over-engineer") would flag. Worth a short, separate decision on whether reports are needed before the ML phase or after.
- **Alerts as a table vs. a live query.** Currently `/api/dashboard/alerts` computes alerts on the fly from `priority IN (P1,P2,P3)` detections. The fuller Database Design (a dedicated `alerts` table with aggregate-collapsing) is documented but not built — fine at today's scale, worth revisiting once detection volume is real.
- **Frame image storage.** `Detection.image_path` exists but nothing writes to it yet — depends on how frame extraction (OpenCV) decides to save annotated frames.
- **ID generation under concurrency.** `next_inspection_public_id` counts existing rows, which is fine for a single-writer SQLite dev setup but would need a proper sequence (or UUIDs) under concurrent writers — flagged in `app/core/ids.py`.
