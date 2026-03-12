const ProductSizeChart = require("../models/ProductSizeChart");
const Product = require("../models/Product");

/**
 * Score how well a size row matches the user's measurements.
 * Returns { penalty, fieldCount, maxPossiblePenalty }.
 */
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
    // Typical max deviation: 30cm for height, 20kg for weight
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
    // Typical max deviation: 15cm for chest/waist/hip/shoulder
    maxPossiblePenalty += 15;
    penalty += Math.abs(val - ref);
  }

  return { penalty, fieldCount, maxPossiblePenalty };
}

/**
 * Convert penalty to a 0–100 fit score.
 * 0 penalty = 100%, grows worse as penalty increases.
 */
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

/**
 * Find best-fit size given user body measurements and a product.
 * @param {string} productId
 * @param {Object} measurements - { height, weight, chest, waist, hip, shoulder }
 * @returns { recommended_size, fit_score, fit, reason, all_sizes }
 */
exports.matchSize = async (productId, measurements) => {
  const product = await Product.findById(productId).lean();
  if (!product) {
    const e = new Error("Product not found"); e.status = 404; throw e;
  }

  // Look for a chart matching this product's brand + category
  const query = { is_active: true };
  if (product.brand_id) query.brand_id = product.brand_id;
  if (product.category_id) query.category_id = product.category_id;

  let chart = await ProductSizeChart.findOne(query).lean();

  // Fallback: match by category only
  if (!chart && product.category_id) {
    chart = await ProductSizeChart.findOne({ category_id: product.category_id, is_active: true }).lean();
  }

  if (!chart || !chart.rows || chart.rows.length === 0) {
    return { recommended_size: null, reason: "no_chart", all_sizes: [] };
  }

  const scored = chart.rows.map((row) => {
    const { penalty, fieldCount, maxPossiblePenalty } = scoreRow(row, measurements);
    const fit_score = fieldCount > 0 ? penaltyToScore(penalty, maxPossiblePenalty) : null;
    return { label: row.label, penalty, fieldCount, fit_score };
  });

  // Sort: more fields matched first (desc), then higher fit_score (desc)
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
    reason: best.fieldCount === 0 ? "insufficient_data" : "scored",
    all_sizes: allSizes,
  };
};
