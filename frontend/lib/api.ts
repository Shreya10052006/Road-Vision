/**
 * Centralised RoadVision API client.
 *
 * Every call to the FastAPI backend goes through here so the base URL lives in
 * exactly one place. Set NEXT_PUBLIC_API_URL in frontend/.env.local to point at
 * a backend other than the local dev one.
 *
 * The existing pages still read from lib/services/* (mock data) so the UI keeps
 * working with the backend switched off. Wire a page to live data by calling
 * the functions below instead of the matching mock service — no other change.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* non-JSON error body — keep the status text */
    }
    throw new ApiError(detail, res.status);
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
};

/* ------------------------------------------------------------------ types */

export type BackendHealth = {
  status: string;
  app: string;
  environment: string;
};

export type MlStatus = {
  detector: {
    model_path: string;
    model_present: boolean;
    ultralytics_installed: boolean;
    ready: boolean;
    conf_threshold: number;
    iou_threshold: number;
  };
  priority_model: {
    model_path: string;
    model_present: boolean;
    active_source: "model" | "rule";
  };
  contract: {
    damage_classes: string[];
    priority_levels: string[];
    feature_names: string[];
    model_input_columns: string[];
  };
  notes: string;
  loaded: boolean;
  last_load_error: string | null;
};

export type ApiDetection = {
  damage_type: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  features: Record<string, number>;
  priority: "P1" | "P2" | "P3" | "P4";
  priority_confidence: number | null;
  /** "model" = Random Forest prediction, "rule" = provisional heuristic. */
  priority_source: "model" | "rule";
  model_version: string | null;
  image_url?: string | null;
  image_path?: string | null;
};

export type DetectImageResponse = {
  /** Present only when the request asked for the result to be saved. */
  inspection_id?: string;
  status?: string;
  image_width: number;
  image_height: number;
  detection_count: number;
  image_url?: string | null;
  detections: ApiDetection[];
};

/** One aggregated damage from a video: a defect seen across 1+ sampled frames. */
export type ApiVideoDamage = ApiDetection & {
  frame_number: number;
  timestamp_seconds: number;
  timestamp: string;
  frame_count: number;
  first_seen: string;
  first_seen_seconds: number;
  last_seen_seconds: number;
  frame_numbers: number[];
};

export type DetectVideoResponse = {
  inspection_id: string;
  status: string;
  video: {
    total_frames: number;
    processed_frames: number;
    frame_stride: number;
    fps: number;
    duration_seconds: number;
    duration: string;
    width: number;
    height: number;
  };
  summary: {
    total_detections: number;
    unique_damages: number;
    counts_by_damage_type: Record<string, number>;
    counts_by_priority: Record<string, number>;
    average_confidence: number;
    priority_source: "model" | "rule";
  };
  damages: ApiVideoDamage[];
  frame_detections: ApiVideoDamage[];
};

/* --------------------------------------------------------------- endpoints */

export const getBackendHealth = () => api.get<BackendHealth>("/api/health");

export const getMlStatus = () => api.get<MlStatus>("/api/ml/status");

export function detectImage(
  file: File,
  meta: Record<string, string | number | boolean | undefined> = {},
) {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined && value !== "") form.append(key, String(value));
  }
  return api.upload<DetectImageResponse>("/api/ml/detect", form);
}

/* ------------------------------------------------------- live camera types */

export type DetectFrameResponse = {
  frame_index: number | null;
  image_width: number;
  image_height: number;
  detection_count: number;
  detections: ApiDetection[];
  counts_by_type: Record<string, number>;
  counts_by_priority: Record<string, number>;
  average_confidence: number;
  processing_time_ms: number;
};

export type FinalizeLiveResponse = {
  inspection_id: string;
  status: string;
  duration_seconds: number;
  frames_processed: number;
  summary: {
    total_detections: number;
    unique_damages: number;
    counts_by_damage_type: Record<string, number>;
    counts_by_priority: Record<string, number>;
    average_confidence: number;
    priority_source: "model" | "rule";
  };
  damages: ApiVideoDamage[];
};

export const startLiveSession = () =>
  api.post<{ session_id: string; started: boolean }>("/api/ml/live/sessions");

/** Post one webcam frame. `signal` lets the caller abort on Stop. */
export function detectFrame(blob: Blob, sessionId?: string, signal?: AbortSignal) {
  const form = new FormData();
  form.append("file", blob, "frame.jpg");
  if (sessionId) form.append("session_id", sessionId);
  return request<DetectFrameResponse>("/api/ml/detect-frame", {
    method: "POST",
    body: form,
    signal,
  });
}

export function finalizeLiveSession(
  sessionId: string,
  meta: Record<string, string | number | undefined> = {},
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined && value !== "") form.append(key, String(value));
  }
  return api.upload<FinalizeLiveResponse>(`/api/ml/live/sessions/${sessionId}/finalize`, form);
}

export function discardLiveSession(sessionId: string) {
  return fetch(`${API_BASE_URL}/api/ml/live/sessions/${sessionId}`, { method: "DELETE" }).catch(
    () => undefined,
  );
}

export function detectVideo(
  file: File,
  meta: Record<string, string | number | undefined> = {},
) {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined && value !== "") form.append(key, String(value));
  }
  return api.upload<DetectVideoResponse>("/api/ml/detect-video", form);
}

export const getDashboardStats = <T>() => api.get<T>("/api/dashboard/stats");
export const getDashboardAlerts = <T>() => api.get<T>("/api/dashboard/alerts");
export const getRecentInspections = <T>() => api.get<T>("/api/dashboard/recent-inspections");
export const getDashboardTrends = <T>() => api.get<T>("/api/dashboard/trends");
export const listInspections = <T>() => api.get<T>("/api/inspections");
export const listDetections = <T>() => api.get<T>("/api/detections");
export const getMapDetections = <T>() => api.get<T>("/api/map/detections");
export const getAnalytics = <T>() => api.get<T>("/api/analytics");
