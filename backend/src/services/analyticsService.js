const Order = require("../models/Order");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Review = require("../models/Review");
const User = require("../models/User");
const dayjs = require("dayjs");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { EventEmitter } = require("events");
const forecastSvc = require("./forecastService");

// Realtime emitter (dùng tạm nếu chưa tích hợp socket.io)
const emitter = new EventEmitter();
exports.onRealtime  = (fn) => emitter.on("event", fn);
exports.offRealtime = (fn) => emitter.off("event", fn);

// Gợi ý tích hợp trong Order controller khi có hành động:
// emitter.emit("event", { type:"order_updated", payload: { order_id, status, ts: Date.now() } });

// Statuses that mean the order is active/in-progress (not yet done or cancelled)
const PROCESSING_STATUSES = [
  "order_created", "payment_pending", "payment_confirmed",
  "processing", "packed", "picking", "in_transit", "out_for_delivery",
  // legacy
  "pending", "confirmed", "shipping",
];

// Revenue is counted when payment_status = "paid" — most reliable regardless of order status
const PAID_PAYMENT_STATUS = "paid";

exports.getOverview = async (shopId) => {
  const now = new Date();
  const todayStart     = dayjs(now).startOf("day").toDate();
  const todayEnd       = dayjs(now).endOf("day").toDate();
  const ydayStart      = dayjs(now).subtract(1, "day").startOf("day").toDate();
  const ydayEnd        = dayjs(now).subtract(1, "day").endOf("day").toDate();
  const monthStart     = dayjs(now).startOf("month").toDate();
  const monthEnd       = dayjs(now).endOf("month").toDate();
  const lastMonthStart = dayjs(now).subtract(1, "month").startOf("month").toDate();
  const lastMonthEnd   = dayjs(now).subtract(1, "month").endOf("month").toDate();
  const weekStart      = dayjs(now).subtract(6, "day").startOf("day").toDate();

  const [
    todayRevArr, ydayRevArr, monthRevArr, lastMonthRevArr,
    weekRevArr,
    processingCount, newOrdersToday, totalOrders, totalCustomers,
    lowStockCount, totalProducts,
    pendingReviews,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { shop_id: shopId, payment_status: PAID_PAYMENT_STATUS, createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, sum: { $sum: "$total_price" } } },
    ]),
    Order.aggregate([
      { $match: { shop_id: shopId, payment_status: PAID_PAYMENT_STATUS, createdAt: { $gte: ydayStart, $lte: ydayEnd } } },
      { $group: { _id: null, sum: { $sum: "$total_price" } } },
    ]),
    Order.aggregate([
      { $match: { shop_id: shopId, payment_status: PAID_PAYMENT_STATUS, createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, sum: { $sum: "$total_price" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { shop_id: shopId, payment_status: PAID_PAYMENT_STATUS, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, sum: { $sum: "$total_price" } } },
    ]),
    Order.aggregate([
      { $match: { shop_id: shopId, payment_status: PAID_PAYMENT_STATUS, createdAt: { $gte: weekStart, $lte: todayEnd } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, rev: { $sum: "$total_price" }, cnt: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.countDocuments({ shop_id: shopId, status: { $in: PROCESSING_STATUSES } }),
    Order.countDocuments({ shop_id: shopId, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Order.countDocuments({ shop_id: shopId }),
    Order.distinct("user_id", { shop_id: shopId }).then((ids) => ids.length),
    ProductVariant.countDocuments({
      shop_id: shopId,
      is_active: true,
      $expr: { $lte: ["$stock", "$low_stock_threshold"] },
    }),
    Product.countDocuments({ shop_id: shopId, status: "active" }),
    Review.countDocuments({ shop_id: shopId, reply: null, status: "visible" }).catch(() => 0),
  ]);

  const today_revenue      = todayRevArr?.[0]?.sum    || 0;
  const yesterday_revenue  = ydayRevArr?.[0]?.sum     || 0;
  const this_month_revenue = monthRevArr?.[0]?.sum    || 0;
  const last_month_revenue = lastMonthRevArr?.[0]?.sum || 0;
  const month_order_count  = monthRevArr?.[0]?.count  || 0;

  const pct = (a, b) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));

  // Build 7-day sparkline (fill zeros for missing days)
  const sparkline = [];
  for (let i = 6; i >= 0; i--) {
    const key = dayjs(now).subtract(i, "day").format("YYYY-MM-DD");
    const found = weekRevArr.find((r) => r._id === key);
    sparkline.push({ date: key, revenue: found?.rev || 0, orders: found?.cnt || 0 });
  }

  return {
    today_revenue,
    yesterday_revenue,
    today_pct:           pct(today_revenue, yesterday_revenue),
    this_month_revenue,
    last_month_revenue,
    month_pct:           pct(this_month_revenue, last_month_revenue),
    month_order_count,
    processing_orders:   processingCount,
    new_orders_today:    newOrdersToday,
    total_orders:        totalOrders,
    total_customers:     totalCustomers,
    low_stock_count:     lowStockCount,
    total_products:      totalProducts,
    pending_reviews:     pendingReviews,
    sparkline,
  };
};

exports.getRevenueSeries = async (shopId, granularity="day", range=30) => {
  const end = dayjs().endOf(granularity);
  const start = end.subtract(range-1, granularity).startOf(granularity);

  const fmt = granularity === "day"   ? "%Y-%m-%d"
             : granularity === "month"? "%Y-%m"
             : "%Y";

  const rows = await Order.aggregate([
    { $match: { shop_id: shopId, payment_status: PAID_PAYMENT_STATUS, createdAt: { $gte: start.toDate(), $lte: end.toDate() } } },
    { $group: {
        _id: { $dateToString: { format: fmt, date: "$createdAt" } },
        revenue: { $sum: "$total_price" },
        count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);

  // fill missing buckets
  const out = [];
  for (let i=0; i<range; i++) {
    const key = start.add(i, granularity).format(fmt.replace("%Y","YYYY").replace("%m","MM").replace("%d","DD"));
    const found = rows.find(r => r._id === key);
    out.push({ x: key, revenue: found?.revenue || 0, count: found?.count || 0 });
  }
  return out;
};

exports.getStatusSummary = async (shopId) => {
  const rows = await Order.aggregate([
    { $match: { shop_id: shopId } },
    { $group: { _id: "$status", cnt: { $sum: 1 } } },
    { $sort: { cnt: -1 } },
  ]);
  // Return only statuses that actually exist in this shop's orders
  return rows.map((r) => ({ status: r._id, count: r.cnt }));
};

exports.getTopProducts = async (shopId, limit=10) => {
  const rows = await Order.aggregate([
    { $match: { shop_id: shopId, payment_status: PAID_PAYMENT_STATUS } },
    { $unwind: "$items" },
    { $group: {
        _id: "$items.product_id",
        qty: { $sum: "$items.qty" },
        revenue: { $sum: { $ifNull: ["$items.total", { $multiply: ["$items.price", "$items.qty"] }] } }
    }},
    { $sort: { qty: -1 } },
    { $limit: limit },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "prod" } },
    { $addFields: { product: { $arrayElemAt: ["$prod", 0] } } },
    { $project: { prod:0 } }
  ]);
  return rows;
};

exports.getTopCustomers = async (shopId, limit=10) => {
  const rows = await Order.aggregate([
    { $match: { shop_id: shopId, payment_status: PAID_PAYMENT_STATUS } },
    { $group: { _id: "$user_id", total_spent: { $sum: "$total_price" }, orders: { $sum: 1 } } },
    { $sort: { total_spent: -1 } },
    { $limit: limit },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } },
    { $addFields: { customer: { $arrayElemAt: ["$u", 0] } } },
    { $project: { u:0 } }
  ]);
  return rows;
};

exports.getForecast = async (shopId, granularity="day", range=90, future=14) => {
  const series = await exports.getRevenueSeries(shopId, granularity, range);
  if (series.length === 0) return { history: [], forecast: [] };

  // Map to forecastService format: { ds, y }
  const mapped = series.map(r => ({ ds: r.x, y: r.revenue }));
  const forecast = forecastSvc.forecastRevenue({ series: mapped, horizon: Number(future) });
  return { history: series, forecast };
};

exports.exportExcel = async (shopId) => {
  const [ov, status, topP, topC] = await Promise.all([
    exports.getOverview(shopId),
    exports.getStatusSummary(shopId),
    exports.getTopProducts(shopId, 10),
    exports.getTopCustomers(shopId, 10)
  ]);

  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet("Overview");
  s1.addRow(["Today revenue", ov.today_revenue]);
  s1.addRow(["Processing orders", ov.processing_orders]);
  s1.addRow(["Total orders", ov.total_orders]);
  s1.addRow(["Total customers", ov.total_customers]);

  const s2 = wb.addWorksheet("Status Summary");
  s2.addRow(["Status","Count"]);
  status.forEach(r => s2.addRow([r.status, r.count]));

  const s3 = wb.addWorksheet("Top Products");
  s3.addRow(["ProductID","Name","Qty","Revenue"]);
  topP.forEach(r => s3.addRow([r._id, r.product?.name || "", r.qty, r.revenue]));

  const s4 = wb.addWorksheet("Top Customers");
  s4.addRow(["CustomerID","Name/Email","Orders","Total Spent"]);
  topC.forEach(r => s4.addRow([r._id, r.customer?.name || r.customer?.email || "", r.orders, r.total_spent]));

  return wb.xlsx.writeBuffer();
};

exports.exportPdf = async (shopId) => {
  const [ov, status] = await Promise.all([
    exports.getOverview(shopId),
    exports.getStatusSummary(shopId),
  ]);
  const doc = new PDFDocument({ margin: 32 });
  doc.fontSize(18).text("DFS Shop Analytics", { underline: true });
  doc.moveDown();

  doc.fontSize(12).text(`Today revenue: ${ov.today_revenue}`);
  doc.text(`Processing orders: ${ov.processing_orders}`);
  doc.text(`Total orders: ${ov.total_orders}`);
  doc.text(`Total customers: ${ov.total_customers}`);
  doc.moveDown();

  doc.text("Status Summary:");
  status.forEach(s => doc.text(`- ${s.status}: ${s.count}`));

  doc.moveDown().text(`Generated at: ${new Date().toISOString()}`);
  doc.end();
  return doc; // stream
};
