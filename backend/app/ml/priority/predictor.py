"""
Random Forest maintenance-priority model (P1/P2/P3/P4).

Why Random Forest: small tabular feature set, interpretable via
feature_importances_, robust to the label noise inherent in rule-derived
training labels, and needs no feature scaling.

Model input = 6 numeric features + 3 one-hot damage-type columns = 9 columns,
in the fixed order given by MODEL_INPUT_COLUMNS. That order is the contract
between training and inference and is stored inside the saved model so a
stale checkpoint cannot silently predict on mismatched columns.

Nothing here fabricates a priority. train() refuses empty input; predict()
refuses to run without a loaded model.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.ml.detection.detector import DAMAGE_CLASSES
from app.ml.features.extractor import FEATURE_NAMES, FeatureVector
from app.ml.priority.rules import PRIORITY_LEVELS

# 3 classes, order fixed by the dataset's data.yaml (0 Crack, 1 Pothole, 2 Surface Erosion)
DAMAGE_TYPE_ORDER: tuple[str, ...] = DAMAGE_CLASSES

MODEL_INPUT_COLUMNS: tuple[str, ...] = FEATURE_NAMES + tuple(
    f"damage_type_{t}" for t in DAMAGE_TYPE_ORDER
)  # 6 + 3 = 9


@dataclass
class PriorityPrediction:
    priority: str  # "P1" | "P2" | "P3" | "P4"
    confidence: float
    model_version: str


def build_row(damage_type: str, features: FeatureVector) -> list[float]:
    """One model input row: 6 numeric features then 3 one-hot columns."""
    one_hot = [1.0 if damage_type == t else 0.0 for t in DAMAGE_TYPE_ORDER]
    return features.as_list() + one_hot


def build_matrix(samples: list[tuple[str, FeatureVector]]) -> list[list[float]]:
    return [build_row(dt, fv) for dt, fv in samples]


class PriorityPredictor:
    def __init__(self, model_path: str | None = None):
        self.model_path = model_path
        self.model_version: str | None = None
        self._model: Any = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    # ------------------------------------------------------------------ train
    def train(
        self,
        samples: list[tuple[str, FeatureVector]],
        labels: list[str],
        *,
        n_estimators: int = 300,
        max_depth: int | None = None,
        random_state: int = 42,
    ) -> dict[str, Any]:
        """Fit on real detections + rule-derived provisional labels."""
        from sklearn.ensemble import RandomForestClassifier

        if not samples or not labels:
            raise ValueError(
                "Refusing to train on empty data. Run YOLO inference first, extract "
                "features, then derive labels with app.ml.priority.rules."
            )
        if len(samples) != len(labels):
            raise ValueError(f"samples/labels length mismatch: {len(samples)} vs {len(labels)}")
        unknown = set(labels) - set(PRIORITY_LEVELS)
        if unknown:
            raise ValueError(f"Unexpected priority labels: {sorted(unknown)}")

        model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            class_weight="balanced",  # P1/P4 are expected to be rare
            random_state=random_state,
            n_jobs=-1,
        )
        model.fit(build_matrix(samples), labels)

        self._model = model
        self.model_version = f"RF-v1-{datetime.now(timezone.utc):%Y%m%d}"

        return {
            "model_version": self.model_version,
            "n_samples": len(samples),
            "classes": list(model.classes_),
            "feature_importances": dict(
                zip(MODEL_INPUT_COLUMNS, (float(v) for v in model.feature_importances_))
            ),
        }

    # --------------------------------------------------------------- evaluate
    def evaluate(self, samples: list[tuple[str, FeatureVector]], labels: list[str]) -> dict[str, Any]:
        """Macro F1, per-class metrics and confusion matrix on a held-out set.

        The number worth REPORTING comes from the manually-reviewed subset.
        Scored against rule-labelled data the model is only re-deriving its own
        training rule, and a high score there says nothing about real agreement.
        """
        from sklearn.metrics import classification_report, confusion_matrix, f1_score

        if self._model is None:
            raise RuntimeError("No model loaded or trained. Call train() or load() first.")
        if not samples:
            raise ValueError("Refusing to evaluate on empty data.")

        predictions = list(self._model.predict(build_matrix(samples)))
        present = [p for p in PRIORITY_LEVELS if p in set(labels) | set(predictions)]

        return {
            "model_version": self.model_version,
            "n_samples": len(samples),
            "macro_f1": float(f1_score(labels, predictions, average="macro", zero_division=0)),
            "per_class": classification_report(
                labels, predictions, labels=present, zero_division=0, output_dict=True
            ),
            "confusion_matrix": confusion_matrix(labels, predictions, labels=present).tolist(),
            "confusion_matrix_labels": present,
        }

    def feature_importances(self) -> dict[str, float]:
        if self._model is None:
            raise RuntimeError("No model loaded or trained.")
        return dict(zip(MODEL_INPUT_COLUMNS, (float(v) for v in self._model.feature_importances_)))

    # --------------------------------------------------------- persist / load
    def save(self, path: str | Path, metrics: dict[str, Any] | None = None) -> Path:
        import joblib

        if self._model is None:
            raise RuntimeError("Nothing to save — no trained model.")
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "model": self._model,
                "model_version": self.model_version,
                "input_columns": list(MODEL_INPUT_COLUMNS),
            },
            path,
        )
        if metrics is not None:
            path.with_suffix(".metrics.json").write_text(json.dumps(metrics, indent=2))
        return path

    def load(self) -> None:
        import joblib

        if not self.model_path or not Path(self.model_path).exists():
            raise FileNotFoundError(
                f"No Random Forest model at {self.model_path!r}. Train one first — "
                "the model is built from real detections, not shipped."
            )
        bundle = joblib.load(self.model_path)
        self._model = bundle["model"]
        self.model_version = bundle.get("model_version")

        stored = tuple(bundle.get("input_columns", ()))
        if stored and stored != MODEL_INPUT_COLUMNS:
            raise ValueError(
                "Feature contract mismatch between the saved model and current code.\n"
                f"  saved:   {stored}\n  current: {MODEL_INPUT_COLUMNS}\n"
                "Retrain rather than predicting with mismatched columns."
            )

    # -------------------------------------------------------------- inference
    def predict(self, damage_type: str, features: FeatureVector) -> PriorityPrediction:
        if self._model is None:
            raise RuntimeError("No model loaded or trained. Call train() or load() first.")

        row = [build_row(damage_type, features)]
        predicted = str(self._model.predict(row)[0])

        confidence = 0.0
        if hasattr(self._model, "predict_proba"):
            proba = self._model.predict_proba(row)[0]
            classes = list(self._model.classes_)
            if predicted in classes:
                confidence = float(proba[classes.index(predicted)])

        return PriorityPrediction(
            priority=predicted,
            confidence=confidence,
            model_version=self.model_version or "unknown",
        )
