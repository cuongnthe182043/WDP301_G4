const ProductSizeChart = require("../models/ProductSizeChart");
const Product = require("../models/Product");

/**
 * Score how well a size row matches the user's measurements.
 * Returns a numeric penalty (lower = better fit).
 */
function scoreRow(row, measurements) {
  const m = row.measurements || {};
  let penalty = 0;
  let fieldCount = 0;

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
    if (lo != null && val < lo) penalty += (lo - val) * 2;
    else if (hi != null && val > hi) penalty += (val - hi) * 2;
  }

  for (const key of pointFields) {
    const val = measurements[key];
    const ref = m[key];
    if (val == null || ref == null) continue;
    fieldCount++;
    penalty += Math.abs(val - ref);
  }

  return { penalty, fieldCount };
}

/**
 * Find best-fit size given user body measurements and a product.
 * @param {string} productId
 * @param {Object} measurements - { height, weight, chest, waist, hip, shoulder }
 * @returns { recommended_size, score, all_sizes }
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
    const { penalty, fieldCount } = scoreRow(row, measurements);
    return { label: row.label, penalty, fieldCount };
  });

  // Sort: more fields matched first (desc), then lower penalty (asc)
  scored.sort((a, b) => {
    if (b.fieldCount !== a.fieldCount) return b.fieldCount - a.fieldCount;
    return a.penalty - b.penalty;
  });

  const best = scored[0];
  const allSizes = scored.map((s) => ({
    label: s.label,
    fit: s.penalty === 0 ? "perfect" : s.penalty < 5 ? "good" : s.penalty < 12 ? "acceptable" : "poor",
  }));

  return {
    recommended_size: best.fieldCount > 0 ? best.label : null,
    fit: best.penalty === 0 ? "perfect" : best.penalty < 5 ? "good" : best.penalty < 12 ? "acceptable" : "poor",
    reason: best.fieldCount === 0 ? "insufficient_data" : "scored",
    all_sizes: allSizes,
  };
};
