"""Human-readable public ID generation.

Kept simple: a year prefix plus a zero-padded sequence number, derived from
the current row count. Fine for a single-writer SQLite dev database; if
concurrent writes ever become a real concern, switch to a DB sequence or a
UUID — either is a localized change (only these two functions), not a
schema migration.
"""

from datetime import datetime, timezone


def next_inspection_public_id(existing_count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"INSP-{year}-{existing_count + 1:04d}"


def next_detection_public_id(inspection_public_id: str, index: int) -> str:
    return f"{inspection_public_id}-D{index:03d}"
