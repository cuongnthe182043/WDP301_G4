const axios = require("axios");
const ProductSizeChart = require("../models/ProductSizeChart");
const { v4: uuidv4 } = require("uuid");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

// Evict cached ML model after create/update/delete
async function invalidateML(chartId) {
  try {
    await axios.delete(`${ML_URL}/cache/${chartId}`, { timeout: 2000 });
  } catch { /* ignore — ML service may not be running */ }
}

/** GET /api/size-charts  — list with optional filters */
exports.list = async (req, res, next) => {
  try {
    const { brand_id, category_id, gender, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (brand_id)    filter.brand_id    = brand_id;
    if (category_id) filter.category_id = category_id;
    if (gender)      filter.gender      = gender;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      ProductSizeChart.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean({ flattenMaps: true }),
      ProductSizeChart.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

/** GET /api/size-charts/:id */
exports.getOne = async (req, res, next) => {
  try {
    const chart = await ProductSizeChart.findById(req.params.id).lean({ flattenMaps: true });
    if (!chart) return res.status(404).json({ message: "Size chart not found" });
    res.json(chart);
  } catch (err) { next(err); }
};

/** POST /api/size-charts — shop owner */
exports.create = async (req, res, next) => {
  try {
    const { brand_id, category_id, gender, unit, weight_unit, height_unit, rows, notes } = req.body;
    const chart = new ProductSizeChart({
      _id: `psz-${uuidv4()}`,
      brand_id, category_id, gender,
      unit:        unit        || "cm",
      weight_unit: weight_unit || "kg",
      height_unit: height_unit || "cm",
      rows:        rows        || [],
      notes,
      is_active: true,
    });
    await chart.save();
    res.status(201).json(chart);
  } catch (err) { next(err); }
};

/** PUT /api/size-charts/:id — shop owner */
exports.update = async (req, res, next) => {
  try {
    const allowed = [
      "brand_id", "category_id", "gender",
      "unit", "weight_unit", "height_unit",
      "rows", "notes", "is_active",
    ];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    const chart = await ProductSizeChart.findByIdAndUpdate(
      req.params.id, update, { new: true, runValidators: true },
    ).lean({ flattenMaps: true });
    if (!chart) return res.status(404).json({ message: "Size chart not found" });
    await invalidateML(req.params.id);
    res.json(chart);
  } catch (err) { next(err); }
};

/** DELETE /api/size-charts/:id — shop owner */
exports.remove = async (req, res, next) => {
  try {
    const chart = await ProductSizeChart.findByIdAndDelete(req.params.id);
    if (!chart) return res.status(404).json({ message: "Size chart not found" });
    await invalidateML(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { next(err); }
};
