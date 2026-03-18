"""
FastAPI ML microservice — Size Recommendation.

Receives size chart rows + user measurements from the Node.js backend,
trains an XGBoost model (lazily, cached per chart), and returns size predictions.

Start:
    uvicorn app:app --host 0.0.0.0 --port 8001 --reload
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import size_model as sm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Size Recommendation ML Service", version="1.0.0")

# In-memory model cache:  chart_id → { model_data, updated_at }
_cache: Dict[str, Dict] = {}


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SizeRowMeasurements(BaseModel):
    chest: Optional[float] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    shoulder: Optional[float] = None
    sleeve_length: Optional[float] = None
    shirt_length: Optional[float] = None
    pant_length: Optional[float] = None
    neck: Optional[float] = None
    weight_min: Optional[float] = None
    weight_max: Optional[float] = None
    height_min: Optional[float] = None
    height_max: Optional[float] = None
    extra: Optional[Dict[str, float]] = None

    model_config = {"extra": "allow"}


class SizeRow(BaseModel):
    label: str
    measurements: Optional[SizeRowMeasurements] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "label": self.label,
            "measurements": self.measurements.model_dump(exclude_none=True) if self.measurements else {},
        }


class PredictRequest(BaseModel):
    chart_id: str
    updated_at: Optional[str] = None      # ISO timestamp — used for cache invalidation
    rows: List[SizeRow]
    measurements: Dict[str, float]        # user body measurements


class SizePrediction(BaseModel):
    label: str
    fit_score: float
    fit: str


class PredictResponse(BaseModel):
    recommended_size: str
    fit_score: float
    fit: str
    reason: str
    all_sizes: List[SizePrediction]
    features_used: List[str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "cached_models": len(_cache)}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    rows = [r.to_dict() for r in req.rows]

    # --- Cache check ---
    cached = _cache.get(req.chart_id)
    needs_train = (
        cached is None
        or (req.updated_at is not None and cached.get("updated_at") != req.updated_at)
    )

    if needs_train:
        logger.info("Training XGBoost model for chart '%s'", req.chart_id)
        model_data = sm.train(rows)
        if model_data is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Cannot train model: need at least 2 size rows with body measurements. "
                    "Falling back to rule-based scoring."
                ),
            )
        _cache[req.chart_id] = {"model_data": model_data, "updated_at": req.updated_at}
        logger.info("Model cached for '%s' (total cached: %d)", req.chart_id, len(_cache))
    else:
        model_data = cached["model_data"]  # type: ignore[index]

    try:
        result = sm.predict(model_data, req.measurements)
        return result
    except Exception as exc:
        logger.exception("Prediction error for chart '%s': %s", req.chart_id, exc)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@app.delete("/cache")
def clear_all():
    count = len(_cache)
    _cache.clear()
    logger.info("Cache cleared (%d models evicted)", count)
    return {"status": "cleared", "evicted": count}


@app.delete("/cache/{chart_id}")
def clear_one(chart_id: str):
    evicted = _cache.pop(chart_id, None) is not None
    return {"status": "cleared" if evicted else "not_found", "chart_id": chart_id}
