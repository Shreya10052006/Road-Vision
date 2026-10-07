"""
Annotation helpers for drawing bounding boxes, labels, and priority indicators
on extracted video frames and uploaded inspection images using OpenCV.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
import cv2

# Priority colors in BGR format for OpenCV:
# P1 (Immediate Hazard / Deep Pothole): Vibrant Red (#EF4444 -> BGR: 68, 68, 239)
# P2 (Urgent Maintenance): Vibrant Orange (#F97316 -> BGR: 22, 115, 249)
# P3 (Scheduled Maintenance): Amber / Yellow (#EAB308 -> BGR: 8, 179, 234)
# P4 (Periodic Monitoring): Sky Blue (#3B82F6 -> BGR: 246, 130, 59)
PRIORITY_COLORS_BGR = {
    "P1": (68, 68, 239),
    "P2": (22, 115, 249),
    "P3": (8, 179, 234),
    "P4": (246, 130, 59),
}
DEFAULT_COLOR = (68, 68, 239)


def annotate_frame(
    frame_bgr: Any,
    detections: list[dict[str, Any]],
    timestamp: str | None = None,
    frame_number: int | None = None,
) -> Any:
    """Draw bounding boxes, badges, labels, and HUD overlays on a BGR frame."""
    canvas = frame_bgr.copy()
    h, w = canvas.shape[:2]

    for d in detections:
        bbox = d.get("bbox") or {}
        bx = int(round(bbox.get("x", 0)))
        by = int(round(bbox.get("y", 0)))
        bw = int(round(bbox.get("width", 0)))
        bh = int(round(bbox.get("height", 0)))

        if bw <= 0 or bh <= 0:
            continue

        priority = d.get("priority", "P4")
        color = PRIORITY_COLORS_BGR.get(priority, DEFAULT_COLOR)
        dtype = d.get("damage_type", "damage").replace("_", " ").title()
        conf = d.get("confidence", 0.0)
        conf_pct = int(round(conf * 100)) if conf <= 1.0 else int(conf)

        # 1. Main Bounding Box (outer contrast border + thick colored box)
        cv2.rectangle(canvas, (bx - 1, by - 1), (bx + bw + 1, by + bh + 1), (0, 0, 0), 4)
        cv2.rectangle(canvas, (bx, by), (bx + bw, by + bh), color, 2)

        # 2. Label Text and Badge
        label = f"{dtype} {conf_pct}% [{priority}]"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = max(0.45, min(0.65, w / 1280.0))
        thickness = 1
        (label_w, label_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)

        # Position label above bounding box if space permits, else inside top
        if by - label_h - 10 >= 0:
            label_y1 = by - label_h - 10
            label_y2 = by
            text_y = by - 5
        else:
            label_y1 = by
            label_y2 = by + label_h + 10
            text_y = by + label_h + 5

        label_x1 = max(0, bx)
        label_x2 = min(w, bx + label_w + 12)

        # Filled badge background
        cv2.rectangle(canvas, (label_x1, label_y1), (label_x2, label_y2), (0, 0, 0), -1)
        cv2.rectangle(canvas, (label_x1, label_y1), (label_x2, label_y2), color, 1)

        # Text inside badge
        cv2.putText(
            canvas,
            label,
            (label_x1 + 6, text_y),
            font,
            font_scale,
            (255, 255, 255),
            thickness,
            cv2.LINE_AA,
        )

    # 3. HUD timestamp overlay bar at bottom
    if timestamp or frame_number is not None:
        hud_parts = ["ROADSENSE CV"]
        if timestamp:
            hud_parts.append(f"TIME: {timestamp}")
        if frame_number is not None:
            hud_parts.append(f"FRAME: {frame_number}")
        if detections:
            hud_parts.append(f"DETECTIONS: {len(detections)}")

        hud_text = "  |  ".join(hud_parts)
        cv2.putText(
            canvas,
            hud_text,
            (16, h - 16),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 0),
            3,
            cv2.LINE_AA,
        )
        cv2.putText(
            canvas,
            hud_text,
            (16, h - 16),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    return canvas


def save_annotated_frame(
    frame_bgr: Any,
    detections: list[dict[str, Any]],
    output_path: str | Path,
    timestamp: str | None = None,
    frame_number: int | None = None,
) -> str:
    """Annotate and write frame image to disk, creating directories as needed."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    annotated = annotate_frame(frame_bgr, detections, timestamp=timestamp, frame_number=frame_number)
    cv2.imwrite(str(path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return str(path)
