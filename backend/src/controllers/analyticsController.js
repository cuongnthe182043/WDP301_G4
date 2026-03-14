const svc = require("../services/analyticsService");
const Shop = require("../models/Shop");

async function resolveShopId(userId) {
  const shop = await Shop.findOne({ owner_id: userId, status: "approved" }).lean();
  return shop?._id ?? null;
}

const EMPTY_OVERVIEW = { today_revenue: 0, processing_orders: 0, total_orders: 0, total_customers: 0 };

// GET /api/analytics/overview
exports.overview = async (req, res, next) => {
  try {
    const shopId = await resolveShopId(req.user._id);
    if (!shopId) return res.json({ success: true, data: EMPTY_OVERVIEW });
    const data = await svc.getOverview(shopId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// GET /api/analytics/revenue-series?granularity=day&range=30
exports.revenueSeries = async (req, res, next) => {
  try {
    const shopId = await resolveShopId(req.user._id);
    if (!shopId) return res.json({ success: true, data: [] });
    const { granularity="day", range="30" } = req.query;
    const data = await svc.getRevenueSeries(shopId, granularity, Number(range));
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// GET /api/analytics/status-summary
exports.statusSummary = async (req, res, next) => {
  try {
    const shopId = await resolveShopId(req.user._id);
    if (!shopId) return res.json({ success: true, data: [] });
    res.json({ success: true, data: await svc.getStatusSummary(shopId) });
  } catch (e) { next(e); }
};

// GET /api/analytics/top-products?limit=10
exports.topProducts = async (req, res, next) => {
  try {
    const shopId = await resolveShopId(req.user._id);
    if (!shopId) return res.json({ success: true, data: [] });
    res.json({ success: true, data: await svc.getTopProducts(shopId, Number(req.query.limit||10)) });
  } catch (e) { next(e); }
};

// GET /api/analytics/top-customers?limit=10
exports.topCustomers = async (req, res, next) => {
  try {
    const shopId = await resolveShopId(req.user._id);
    if (!shopId) return res.json({ success: true, data: [] });
    res.json({ success: true, data: await svc.getTopCustomers(shopId, Number(req.query.limit||10)) });
  } catch (e) { next(e); }
};

// GET /api/analytics/realtime  (SSE fallback)
exports.realtimeSSE = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  // Gắn tạm vào global EventEmitter (xem service)
  const handler = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  svc.onRealtime(handler);
  req.on("close", () => svc.offRealtime(handler));
};

// GET /api/analytics/forecast?granularity=day&range=90&future=14
exports.forecast = async (req, res, next) => {
  try {
    const shopId = await resolveShopId(req.user._id);
    if (!shopId) return res.json({ success: true, data: { history: [], forecast: [] } });
    const { granularity="day", range="90", future="14" } = req.query;
    const data = await svc.getForecast(shopId, granularity, Number(range), Number(future));
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// GET /api/analytics/export/excel
exports.exportExcel = async (req, res, next) => {
  try {
    const shopId = await resolveShopId(req.user._id);
    if (!shopId) return res.status(400).json({ message: "Không tìm thấy shop" });
    const buffer = await svc.exportExcel(shopId);
    res.setHeader("Content-Disposition", `attachment; filename="dfs_analytics.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (e) { next(e); }
};

// GET /api/analytics/export/pdf
exports.exportPdf = async (req, res, next) => {
  try {
    const shopId = await resolveShopId(req.user._id);
    if (!shopId) return res.status(400).json({ message: "Không tìm thấy shop" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="dfs_analytics.pdf"`);
    const stream = await svc.exportPdf(shopId);
    stream.pipe(res);
  } catch (e) { next(e); }
};
