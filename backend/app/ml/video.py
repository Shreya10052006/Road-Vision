"""
Video inspection: OpenCV frame sampling + the existing ML pipeline.

    video file
      -> cv2.VideoCapture, sample every Nth frame
      -> RoadDamageDetector (YOLOv8, best.pt)
      -> FeatureExtractor  (locked 6-feature vector)
      -> rule-based priority (P1-P4, provisional)
      -> cross-frame aggregation into unique damages
      -> summary

No database, no FastAPI, no threads here — this module is pure processing so
it can be tested on its own. Persistence lives in app/services/video_service.py.

FRAME SAMPLING
--------------
Processing every frame of a 30 fps clip is wasted work: consecutive frames
show the same defect from almost the same angle. The sampler therefore takes
roughly `target_fps` frames per second (default 2), computing the stride as
round(video_fps / target_fps) with a floor of 1. A 30 fps video at the default
gives every 15th frame. `max_frames` caps the total so a long clip can never
stall a laptop demo; the cap is applied by widening the stride, so coverage
stays spread across the whole video instead of stopping partway through.

AGGREGATION / DEDUPLICATION
---------------------------
One physical pothole seen across many sampled frames must not become many
separate damages. The method used here is single-pass greedy matching, not
object tracking:

    A detection joins an existing damage track when all three hold:
      1. same damage_type,
      2. the track was last seen within `track_gap_frames` sampled frames,
      3. IoU between the boxes is at least `iou_threshold`.
    Otherwise it starts a new track.

Each track becomes one unique damage. Its reported box, confidence and
features come from its highest-confidence sighting, and its reported priority
is the most severe priority the track ever received, so a defect that looked
P1 in its clearest frame is not downgraded by a blurry one.

This assumes a roughly forward-moving camera, where the same defect overlaps
itself between nearby sampled frames. It is deliberately simple and
explainable; a Kalman/ByteTrack-style tracker would handle fast pans better
but is not justified for this scope.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.ml.detection.detector import DAMAGE_CLASSES, RawDetection
from app.ml.pipeline import InspectionProcessor, ProcessedDetection
from app.ml.priority.rules import PRIORITY_LEVELS

# Most severe first — used when collapsing a track's priorities.
_PRIORITY_SEVERITY = {p: i for i, p in enumerate(PRIORITY_LEVELS)}

SUPPORTED_VIDEO_EXTENSIONS: tuple[str, ...] = (".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v")


class VideoProcessingError(Exception):
    """Video could not be read or contained no usable frames."""


@dataclass
class VideoConfig:
    target_fps: float = 2.0      # sampled frames per second of video
    max_frames: int = 120        # hard cap on frames actually run through YOLO
    iou_threshold: float = 0.30  # overlap needed to call two boxes the same defect
    track_gap_frames: int = 3    # how many sampled frames a track may go unseen
    # Fallback for sparse sampling: at low frame rates a small defect can move
    # far enough between samples that the boxes no longer overlap at all. Two
    # same-type boxes of similar size whose centres are within this multiple of
    # their mean size are then still treated as the same defect.
    center_distance_ratio: float = 0.75


@dataclass
class FrameDetection:
    """One detection, with where in the video it was seen."""

    frame_number: int
    timestamp_seconds: float
    processed: ProcessedDetection

    def to_dict(self) -> dict[str, Any]:
        d = self.processed.to_dict()
        d["frame_number"] = self.frame_number
        d["timestamp_seconds"] = round(self.timestamp_seconds, 2)
        d["timestamp"] = format_timestamp(self.timestamp_seconds)
        return d


@dataclass
class DamageTrack:
    """One physical defect, seen in one or more sampled frames."""

    damage_type: str
    sightings: list[FrameDetection] = field(default_factory=list)
    last_sample_index: int = 0

    @property
    def best(self) -> FrameDetection:
        return max(self.sightings, key=lambda s: s.processed.detection.confidence)

    @property
    def priority(self) -> str:
        return min(
            (s.processed.priority for s in self.sightings),
            key=lambda p: _PRIORITY_SEVERITY.get(p, 99),
        )

    def to_dict(self) -> dict[str, Any]:
        best = self.best
        d = best.to_dict()
        # The track's priority may be more severe than its best frame's.
        d["priority"] = self.priority
        d["frame_count"] = len(self.sightings)
        d["first_seen_seconds"] = round(min(s.timestamp_seconds for s in self.sightings), 2)
        d["last_seen_seconds"] = round(max(s.timestamp_seconds for s in self.sightings), 2)
        d["first_seen"] = format_timestamp(d["first_seen_seconds"])
        d["frame_numbers"] = [s.frame_number for s in self.sightings]
        return d


def format_timestamp(seconds: float) -> str:
    total = int(seconds)
    return f"{total // 3600:02d}:{(total % 3600) // 60:02d}:{total % 60:02d}"


def iou(a: RawDetection, b: RawDetection) -> float:
    """Intersection over union of two pixel boxes."""
    ax2, ay2 = a.bbox_x + a.bbox_width, a.bbox_y + a.bbox_height
    bx2, by2 = b.bbox_x + b.bbox_width, b.bbox_y + b.bbox_height

    inter_w = min(ax2, bx2) - max(a.bbox_x, b.bbox_x)
    inter_h = min(ay2, by2) - max(a.bbox_y, b.bbox_y)
    if inter_w <= 0 or inter_h <= 0:
        return 0.0

    inter = inter_w * inter_h
    union = (a.bbox_width * a.bbox_height) + (b.bbox_width * b.bbox_height) - inter
    return inter / union if union > 0 else 0.0


def centers_close(a: RawDetection, b: RawDetection, ratio: float) -> bool:
    """True when two similarly-sized boxes sit almost on top of each other.

    Used only when IoU fails, to keep one defect from fragmenting into several
    at low sampling rates. Sizes must be within 2x of each other, so a small
    pothole is never absorbed into a frame-sized erosion patch.
    """
    a_size = (a.bbox_width + a.bbox_height) / 2
    b_size = (b.bbox_width + b.bbox_height) / 2
    if a_size <= 0 or b_size <= 0:
        return False
    if max(a_size, b_size) / min(a_size, b_size) > 2.0:
        return False

    acx, acy = a.bbox_x + a.bbox_width / 2, a.bbox_y + a.bbox_height / 2
    bcx, bcy = b.bbox_x + b.bbox_width / 2, b.bbox_y + b.bbox_height / 2
    distance = ((acx - bcx) ** 2 + (acy - bcy) ** 2) ** 0.5
    return distance <= ratio * ((a_size + b_size) / 2)


def aggregate(
    frame_detections: list[FrameDetection],
    sample_index_of: dict[int, int],
    config: VideoConfig,
) -> list[DamageTrack]:
    """Collapse per-frame detections into unique damages (see module docstring)."""
    tracks: list[DamageTrack] = []

    for fd in frame_detections:
        sample_index = sample_index_of[fd.frame_number]
        box = fd.processed.detection
        match: DamageTrack | None = None
        best_overlap = config.iou_threshold
        fallback: DamageTrack | None = None

        for track in tracks:
            if track.damage_type != box.damage_type:
                continue
            if sample_index - track.last_sample_index > config.track_gap_frames:
                continue
            previous = track.sightings[-1].processed.detection
            overlap = iou(previous, box)
            if overlap >= best_overlap:
                best_overlap = overlap
                match = track
            elif match is None and fallback is None and centers_close(
                previous, box, config.center_distance_ratio
            ):
                fallback = track

        match = match or fallback

        if match is None:
            match = DamageTrack(damage_type=box.damage_type)
            tracks.append(match)
        match.sightings.append(fd)
        match.last_sample_index = sample_index

    return tracks


class VideoInspectionProcessor:
    """Runs a whole video through the existing per-frame pipeline."""

    def __init__(self, processor: InspectionProcessor, config: VideoConfig | None = None):
        self.processor = processor
        self.config = config or VideoConfig()

    def process(
        self,
        video_path: str,
        output_dir: str | Path | None = None,
        public_id: str | None = None,
    ) -> dict[str, Any]:
        import cv2  # local import: keeps OpenCV off the module import path
        from app.ml.annotate import save_annotated_frame

        path = Path(video_path)
        if not path.exists():
            raise VideoProcessingError(f"Video file not found: {video_path}")
        if path.suffix.lower() not in SUPPORTED_VIDEO_EXTENSIONS:
            raise VideoProcessingError(
                f"Unsupported video type '{path.suffix}'. Supported: "
                + ", ".join(SUPPORTED_VIDEO_EXTENSIONS)
            )

        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            raise VideoProcessingError(
                "The video could not be opened. It may be corrupted or use an unsupported codec."
            )

        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

            if fps <= 0 or fps > 480:  # unreadable metadata — assume a common rate
                fps = 30.0

            stride = max(1, round(fps / max(self.config.target_fps, 0.1)))
            if total_frames > 0:
                expected = total_frames / stride
                if expected > self.config.max_frames:
                    # Widen the stride so coverage still spans the whole video.
                    stride = max(stride, -(-total_frames // self.config.max_frames))

            frame_detections: list[FrameDetection] = []
            sampled_frames: dict[int, Any] = {}
            detections_by_frame: dict[int, list[dict[str, Any]]] = {}
            sample_index_of: dict[int, int] = {}
            frame_number = 0
            processed_frames = 0
            last_timestamp = 0.0

            while processed_frames < self.config.max_frames:
                ok, frame = cap.read()
                if not ok:
                    break

                if frame_number % stride == 0:
                    h, w = frame.shape[0], frame.shape[1]
                    width, height = w, h
                    timestamp = frame_number / fps
                    last_timestamp = timestamp
                    sample_index_of[frame_number] = processed_frames

                    processed_list = self.processor.detect_and_process(frame, w, h)
                    if processed_list:
                        # Keep a copy of the frame to generate annotated snapshots
                        sampled_frames[frame_number] = frame.copy()
                        detections_by_frame[frame_number] = [p.to_dict() for p in processed_list]

                    for processed in processed_list:
                        frame_detections.append(
                            FrameDetection(
                                frame_number=frame_number,
                                timestamp_seconds=timestamp,
                                processed=processed,
                            )
                        )
                    processed_frames += 1

                frame_number += 1

            if processed_frames == 0:
                raise VideoProcessingError("No frames could be read from this video.")

            if total_frames <= 0:
                total_frames = frame_number

            duration = (total_frames / fps) if total_frames else last_timestamp
            tracks = aggregate(frame_detections, sample_index_of, self.config)

            damages_list = []
            prefix = public_id or "vid"
            for idx, track in enumerate(tracks, start=1):
                track_dict = track.to_dict()
                best_frame_num = track.best.frame_number
                frame_img = sampled_frames.get(best_frame_num)

                if frame_img is not None and output_dir is not None:
                    out_dir = Path(output_dir)
                    out_dir.mkdir(parents=True, exist_ok=True)
                    filename = f"{prefix}_det_{idx}.jpg"
                    file_dest = out_dir / filename
                    
                    frame_dets = detections_by_frame.get(best_frame_num, [track_dict])
                    save_annotated_frame(
                        frame_img,
                        frame_dets,
                        file_dest,
                        timestamp=track_dict.get("first_seen"),
                        frame_number=best_frame_num,
                    )
                    track_dict["image_path"] = f"/uploads/frames/{filename}"
                    track_dict["image_url"] = f"/uploads/frames/{filename}"

                damages_list.append(track_dict)

            return {
                "video": {
                    "total_frames": total_frames,
                    "processed_frames": processed_frames,
                    "frame_stride": stride,
                    "fps": round(fps, 2),
                    "duration_seconds": round(duration, 2),
                    "duration": format_timestamp(duration),
                    "width": width,
                    "height": height,
                },
                "summary": self._summarize(frame_detections, tracks),
                "damages": damages_list,
                "frame_detections": [fd.to_dict() for fd in frame_detections],
            }
        finally:
            cap.release()

    def _summarize(
        self, frame_detections: list[FrameDetection], tracks: list[DamageTrack]
    ) -> dict[str, Any]:
        confidences = [fd.processed.detection.confidence for fd in frame_detections]
        by_type = {t: 0 for t in DAMAGE_CLASSES}
        by_priority = {p: 0 for p in PRIORITY_LEVELS}
        for track in tracks:
            by_type[track.damage_type] = by_type.get(track.damage_type, 0) + 1
            by_priority[track.priority] = by_priority.get(track.priority, 0) + 1

        sources = {fd.processed.priority_source for fd in frame_detections}
        return {
            "total_detections": len(frame_detections),
            "unique_damages": len(tracks),
            "counts_by_damage_type": by_type,
            "counts_by_priority": by_priority,
            "average_confidence": round(sum(confidences) / len(confidences), 4) if confidences else 0.0,
            "priority_source": "model" if sources == {"model"} else "rule",
        }
