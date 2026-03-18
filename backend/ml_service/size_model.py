"""
XGBoost-based size recommendation model.

Training data is generated synthetically from ProductSizeChart rows.
Each row defines a size label and body measurement ranges/points.
We explode those into SAMPLES_PER_SIZE random samples per size,
then train a multi-class XGBoost classifier.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import xgboost as xgb

logger = logging.getLogger(__name__)


class SimpleLabelEncoder:
    """Minimal LabelEncoder replacement — no scikit-learn dependency."""

    def __init__(self, labels: List[str]) -> None:
        self.classes_: List[str] = labels                      # sorted unique labels
        self._label_to_idx: Dict[str, int] = {l: i for i, l in enumerate(labels)}

    def transform(self, y: "np.ndarray") -> "np.ndarray":
        return np.array([self._label_to_idx[l] for l in y], dtype=np.int32)

# Natural size ordering — used to sort labels before encoding so the
# ordinal structure is preserved in class indices.
SIZE_ORDER = [
    "XXXXXS", "XXXXS", "XXXS", "XXS", "XS",
    "S", "S/M", "S-M",
    "M", "M/L", "M-L",
    "L", "L/XL", "L-XL",
    "XL", "XXL", "XXXL", "XXXXL", "XXXXXL",
    # Numeric (EU/US trousers, shoes, etc.)
    "26", "27", "28", "29", "30", "31", "32", "33", "34",
    "35", "36", "37", "38", "39", "40", "41", "42", "43",
    "44", "45", "46", "47", "48", "50", "52", "54", "56",
]

# Feature columns in fixed order — must match what the frontend sends
FEATURE_COLS = [
    "height", "weight",
    "chest", "waist", "hip", "shoulder",
    "sleeve_length", "shirt_length", "pant_length", "neck",
]

SAMPLES_PER_SIZE = 120  # synthetic samples generated per size row


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _size_sort_key(label: str) -> int:
    upper = label.upper().strip()
    if upper in SIZE_ORDER:
        return SIZE_ORDER.index(upper)
    try:
        return 10_000 + int(upper)   # numeric sizes (36, 38 …)
    except ValueError:
        return 20_000 + abs(hash(upper)) % 1_000


def _fit_label(prob: float, baseline: float) -> str:
    """Classify fit quality based on how much better the probability is than
    the uniform baseline (1 / n_classes)."""
    ratio = prob / baseline if baseline > 0 else 0
    if ratio >= 3.0:
        return "perfect"
    if ratio >= 2.0:
        return "good"
    if ratio >= 1.2:
        return "acceptable"
    return "poor"


# ---------------------------------------------------------------------------
# Synthetic data generation
# ---------------------------------------------------------------------------

def _generate_training_data(rows: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
    """Explode size chart rows into a synthetic training dataset."""
    samples: List[List[float]] = []
    labels: List[str] = []

    for row in rows:
        label = (row.get("label") or "").strip()
        m: Dict[str, Any] = row.get("measurements") or {}

        for _ in range(SAMPLES_PER_SIZE):
            s: Dict[str, float] = {}

            # --- Range fields (height / weight) ---
            for field, min_k, max_k, pad in [
                ("height", "height_min", "height_max", 3.0),
                ("weight", "weight_min", "weight_max", 2.0),
            ]:
                lo = m.get(min_k)
                hi = m.get(max_k)
                if lo is not None and hi is not None:
                    s[field] = float(np.random.uniform(lo, hi))
                elif lo is not None:
                    s[field] = float(np.random.normal(lo + pad, pad))
                elif hi is not None:
                    s[field] = float(np.random.normal(hi - pad, pad))
                else:
                    s[field] = float("nan")

            # --- Point fields (body circumferences / lengths) ---
            for field in ["chest", "waist", "hip", "shoulder",
                          "sleeve_length", "shirt_length", "pant_length", "neck"]:
                val = m.get(field)
                s[field] = float(np.random.normal(val, 1.5)) if val is not None else float("nan")

            samples.append([s.get(f, float("nan")) for f in FEATURE_COLS])
            labels.append(label)

    return np.array(samples, dtype=np.float32), np.array(labels)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train(rows: List[Dict]) -> Optional[Dict]:
    """Train an XGBoost classifier from size chart rows.

    Returns a model bundle dict, or None if the data is insufficient.
    """
    if len(rows) < 2:
        logger.warning("Need at least 2 size rows to train — skipping")
        return None

    X, y_labels = _generate_training_data(rows)

    unique_labels = sorted(set(y_labels), key=_size_sort_key)
    n_classes = len(unique_labels)
    if n_classes < 2:
        logger.warning("All samples belong to the same class — skipping")
        return None

    le = SimpleLabelEncoder(unique_labels)
    y = le.transform(y_labels)

    # Drop columns where every sample is NaN
    valid_cols = [
        i for i, _ in enumerate(FEATURE_COLS)
        if not np.all(np.isnan(X[:, i]))
    ]
    if not valid_cols:
        logger.warning("No usable feature columns found — skipping")
        return None

    X = X[:, valid_cols]

    # Mean imputation for remaining NaNs
    col_means = np.nanmean(X, axis=0)
    col_means = np.where(np.isnan(col_means), 0.0, col_means)
    nan_mask = np.isnan(X)
    X[nan_mask] = np.take(col_means, np.where(nan_mask)[1])

    # XGBoost params
    params: Dict[str, Any] = {
        "n_estimators": 150,
        "max_depth": 4,
        "learning_rate": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "tree_method": "hist",
        "random_state": 42,
    }
    if n_classes > 2:
        params["objective"] = "multi:softprob"
        params["num_class"] = n_classes
        params["eval_metric"] = "mlogloss"
    else:
        params["objective"] = "binary:logistic"
        params["eval_metric"] = "logloss"

    model = xgb.XGBClassifier(**params)
    model.fit(X, y)

    logger.info(
        "Trained XGBoost model: %d classes, %d features, %d samples",
        n_classes, len(valid_cols), len(y),
    )

    return {
        "model": model,
        "label_encoder": le,
        "valid_cols": valid_cols,
        "col_means": col_means,
        "n_classes": n_classes,
    }


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def predict(model_data: Dict, measurements: Dict[str, float]) -> Dict:
    """Run inference and return per-size probabilities + best recommendation."""
    model: xgb.XGBClassifier = model_data["model"]
    le: SimpleLabelEncoder = model_data["label_encoder"]
    valid_cols: List[int] = model_data["valid_cols"]
    col_means: np.ndarray = model_data["col_means"]
    n_classes: int = model_data["n_classes"]

    # Build feature vector
    X = np.array(
        [[measurements.get(f, float("nan")) for f in FEATURE_COLS]],
        dtype=np.float32,
    )
    X = X[:, valid_cols]

    # Impute missing with training column means
    nan_mask = np.isnan(X)
    X[nan_mask] = np.take(col_means, np.where(nan_mask)[1])

    proba: np.ndarray = model.predict_proba(X)[0]
    # binary:logistic → shape (2,) already; multi:softprob → shape (n_classes,)

    sizes = le.classes_
    baseline = 1.0 / n_classes

    all_sizes = []
    for i, label in enumerate(sizes):
        prob = float(proba[i])
        all_sizes.append({
            "label": label,
            "fit_score": round(prob * 100, 1),
            "fit": _fit_label(prob, baseline),
        })

    best = max(all_sizes, key=lambda x: x["fit_score"])

    # Which features actually had values (not NaN) in user input
    features_used = [f for f in FEATURE_COLS if measurements.get(f) is not None]

    return {
        "recommended_size": best["label"],
        "fit_score": best["fit_score"],
        "fit": best["fit"],
        "reason": "xgboost_model",
        "all_sizes": all_sizes,
        "features_used": features_used,
    }
