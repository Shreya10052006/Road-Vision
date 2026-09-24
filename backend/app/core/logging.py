"""Minimal, consistent logging setup for the API."""

import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    if root.handlers:
        # Avoid duplicate handlers on reload.
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    root.addHandler(handler)
    root.setLevel(level)

    # Quiet down noisy third-party loggers a little.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
