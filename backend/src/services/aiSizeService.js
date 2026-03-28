const axios = require("axios");
const ProductSizeChart = require("../models/ProductSizeChart");
const Product = require("../models/Product");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

// Circuit-breaker: stop hammering the ML service if it's down
let mlAvailable = true;
let mlRetryAt = 0;
const ML_RETRY_COOLDOWN_MS = 30_000; // 30 s cool-down after a failure

// ---------------------------------------------------------------------------
// Penalty-based fallback (original rule-based algorithm)
// ---------------------------------------------------------------------------

function scoreRow(row, measurements) {
  const m = row.measurements || {};
  let penalty = 0;
  let fieldCount = 0;
  let maxPossiblePenalty = 0;

  const rangeFields = [
    ["height", "height_min", "height_max"],
    ["weight", "weight_min", "weight_max"],
  ];
  const pointFields = ["chest", "waist", "hip", "shoulder"];

  for (const [userKey, minKey, maxKey] of rangeFields) {
    const val = measurements[userKey];
    const lo = m[minKey], hi = m[maxKey];
    if (val == null || (lo == null && hi == null)) continue;
    fieldCount++;
    const maxDev = userKey === "height" ? 30 : 20;
    maxPossiblePenalty += maxDev * 2;
    if (lo != null && val < lo) penalty += (lo - val) * 2;
    else if (hi != null && val > hi) penalty += (val - hi) * 2;
  }

  for (const key of pointFields) {
    const val = measurements[key];
    const ref = m[key];
    if (val == null || ref == null) continue;
    fieldCount++;
    maxPossiblePenalty += 15;
    penalty += Math.abs(val - ref);
  }

  return { penalty, fieldCount, maxPossiblePenalty };
}

function penaltyToScore(penalty, maxPossiblePenalty) {
  if (maxPossiblePenalty <= 0) return penalty === 0 ? 100 : 0;
  const ratio = Math.min(penalty / maxPossiblePenalty, 1);
  return Math.max(0, Math.round((1 - ratio) * 100));
}

function fitLabel(score) {
  if (score >= 90) return "perfect";
  if (score >= 75) return "good";
  if (score >= 55) return "acceptable";
  return "poor";
}

function penaltyMatchSize(chart, measurements) {
  const scored = chart.rows.map((row) => {
    const { penalty, fieldCount, maxPossiblePenalty } = scoreRow(row, measurements);
    const fit_score = fieldCount > 0 ? penaltyToScore(penalty, maxPossiblePenalty) : null;
    return { label: row.label, penalty, fieldCount, fit_score };
  });

  scored.sort((a, b) => {
    if (b.fieldCount !== a.fieldCount) return b.fieldCount - a.fieldCount;
    return (b.fit_score ?? 0) - (a.fit_score ?? 0);
  });

  const best = scored[0];
  const allSizes = scored.map((s) => ({
    label: s.label,
    fit_score: s.fit_score,
    fit: s.fit_score != null ? fitLabel(s.fit_score) : "unknown",
  }));

  return {
    recommended_size: best.fieldCount > 0 ? best.label : null,
    fit_score: best.fit_score,
    fit: best.fit_score != null ? fitLabel(best.fit_score) : "unknown",
    reason: best.fieldCount === 0 ? "insufficient_data" : "rule_based",
    all_sizes: allSizes,
  };
}

// ---------------------------------------------------------------------------
// XGBoost ML service call
// ---------------------------------------------------------------------------

async function callMLService(chart, measurements) {
  const now = Date.now();
  if (!mlAvailable && now < mlRetryAt) return null;

  try {
    const { data } = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      {
        chart_id: chart._id,
        updated_at: chart.updatedAt ? new Date(chart.updatedAt).toISOString() : null,
        rows: chart.rows,
        measurements,
      },
      { timeout: 5000 },
    );

    // Service recovered
    if (!mlAvailable) {
      mlAvailable = true;
      console.log("[aiSizeService] ML service back online");
    }
    return data;
  } catch (err) {
    const isDown = !err.response; // network error (service not running)
    if (isDown) {
      mlAvailable = false;
      mlRetryAt = Date.now() + ML_RETRY_COOLDOWN_MS;
      console.warn("[aiSizeService] ML service unreachable — falling back to rule-based scoring");
    } else {
      // HTTP 4xx/5xx from the service (e.g. not enough data for that chart)
      console.warn("[aiSizeService] ML service returned %d — falling back", err.response.status);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find best-fit size given user body measurements and a product.
 *
 * Strategy:
 *   1. Try XGBoost ML microservice (http://ML_SERVICE_URL/predict).
 *   2. Fall back to penalty-based rule scoring if ML is unavailable.
 *
 * @param {string} productId
 * @param {Object} measurements  { height, weight, chest, waist, hip, shoulder, … }
 * @returns {{ recommended_size, fit_score, fit, reason, all_sizes }}
 */
exports.matchSize = async (productId, measurements) => {
  const product = await Product.findById(productId).lean();
  if (!product) {
    const e = new Error("Product not found");
    e.status = 404;
    throw e;
  }

  // Find the most specific chart available — fallback chain from specific to any
  let chart =
    // 1. brand + category
    (product.brand_id && product.category_id
      ? await ProductSizeChart.findOne({ brand_id: product.brand_id, category_id: product.category_id, is_active: true }).lean({ flattenMaps: true })
      : null)
    // 2. category only
    || (product.category_id
      ? await ProductSizeChart.findOne({ category_id: product.category_id, is_active: true }).lean({ flattenMaps: true })
      : null)
    // 3. any active chart (lets demo/seed data work without exact category match)
    || await ProductSizeChart.findOne({ is_active: true }).lean({ flattenMaps: true })
    || null;

  if (!chart || !chart.rows || chart.rows.length === 0) {
    return { recommended_size: null, reason: "no_chart", all_sizes: [] };
  }

  // --- Try ML service first ---
  const mlResult = await callMLService(chart, measurements);
  if (mlResult) return mlResult;

  // --- Penalty-based fallback ---
  return penaltyMatchSize(chart, measurements);
};
