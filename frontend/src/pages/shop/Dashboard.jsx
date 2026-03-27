import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { analyticsService } from "../../services/analyticsService";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import { saveAs } from "file-saver";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, BarElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Card, CardBody, Button, Chip, Spinner } from "@heroui/react";
import {
  TrendingUp, ShoppingCart, Users, DollarSign,
  Package, AlertTriangle, Plus, Download, RefreshCw,
  Tag, Star, ArrowUpRight, ArrowDownRight, Minus,
  BarChart2, Settings, Inbox, Eye,
} from "lucide-react";
import { motion } from "framer-motion";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, BarElement, Tooltip, Legend, Filler,
);

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtVND(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + " tr";
  if (v >= 1_000)         return (v / 1_000).toFixed(0) + "k";
  return v.toLocaleString("vi-VN");
}

function fmtFullVND(n) {
  return Number(n || 0).toLocaleString("vi-VN") + " ₫";
}

// ─── Trend badge ──────────────────────────────────────────────────────────────
function TrendBadge({ pct }) {
  if (pct === undefined || pct === null) return null;
  const up   = pct > 0;
  const zero = pct === 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
        zero
          ? "bg-default-100 text-default-500"
          : up
            ? "bg-success-100 text-success-700"
            : "bg-danger-100 text-danger-700"
      }`}
    >
      {zero ? <Minus size={10} /> : up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(pct)}%
    </span>
  );
}

// ─── Sparkline mini ───────────────────────────────────────────────────────────
function Sparkline({ data = [], color = "#3B82F6" }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const W = 64, H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-60">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, pct, sparkData, sparkColor, icon: Icon, accent = "#3B82F6", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <Card radius="xl" shadow="sm" className="overflow-hidden h-full">
        <div className="h-0.5" style={{ background: accent }} />
        <CardBody className="p-4 gap-0">
          <div className="flex items-start justify-between mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accent}18` }}
            >
              <Icon size={18} style={{ color: accent }} />
            </div>
            {sparkData && <Sparkline data={sparkData} color={sparkColor || accent} />}
          </div>
          <p className="text-xs text-default-400 font-medium mb-0.5">{title}</p>
          <p className="text-2xl font-black text-default-900 leading-tight">{value ?? "—"}</p>
          {(sub || pct !== undefined) && (
            <div className="flex items-center gap-1.5 mt-1">
              {pct !== undefined && <TrendBadge pct={pct} />}
              {sub && <span className="text-xs text-default-400">{sub}</span>}
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}

// ─── Quick Action button ──────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, to, color, badge, nav }) {
  return (
    <button
      onClick={() => nav(to)}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-default-100 active:scale-95 transition-all duration-150 relative group"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-150"
        style={{ background: `${color}18` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-xs font-semibold text-default-700 text-center leading-tight">{label}</span>
      {badge > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

// ─── Status colors ────────────────────────────────────────────────────────────
// Matches Order.js status enum exactly
const STATUS_COLORS = {
  // New statuses
  order_created:         "#3B82F6",
  payment_pending:       "#F59E0B",
  payment_failed:        "#EF4444",
  payment_confirmed:     "#8B5CF6",
  processing:            "#06B6D4",
  packed:                "#0EA5E9",
  picking:               "#6366F1",
  in_transit:            "#0EA5E9",
  out_for_delivery:      "#22D3EE",
  delivered:             "#22C55E",
  delivery_failed:       "#F97316",
  cancelled_by_customer: "#EF4444",
  cancelled_by_shop:     "#F97316",
  return_requested:      "#F59E0B",
  return_approved:       "#8B5CF6",
  return_rejected:       "#EF4444",
  return_completed:      "#10B981",
  refund_pending:        "#F59E0B",
  refund_completed:      "#10B981",
  // Legacy
  pending:               "#F59E0B",
  confirmed:             "#8B5CF6",
  shipping:              "#0EA5E9",
  canceled_by_customer:  "#EF4444",
  canceled_by_shop:      "#F97316",
};
const STATUS_LABELS = {
  order_created:         "Đã đặt hàng",
  payment_pending:       "Chờ thanh toán",
  payment_failed:        "TT thất bại",
  payment_confirmed:     "Đã thanh toán",
  processing:            "Đang xử lý",
  packed:                "Đã đóng gói",
  picking:               "Đang lấy hàng",
  in_transit:            "Đang vận chuyển",
  out_for_delivery:      "Đang giao",
  delivered:             "Đã giao",
  delivery_failed:       "Giao thất bại",
  cancelled_by_customer: "KH hủy",
  cancelled_by_shop:     "Shop hủy",
  return_requested:      "Yêu cầu trả",
  return_approved:       "Chấp nhận trả",
  return_rejected:       "Từ chối trả",
  return_completed:      "Hoàn trả xong",
  refund_pending:        "Chờ hoàn tiền",
  refund_completed:      "Đã hoàn tiền",
  // Legacy
  pending:               "Chờ xử lý",
  confirmed:             "Đã xác nhận",
  shipping:              "Đang giao",
  canceled_by_customer:  "KH hủy",
  canceled_by_shop:      "Shop hủy",
};

// ─── Period config ────────────────────────────────────────────────────────────
const PERIODS = [
  { key: "7d",  label: "7 ngày",  granularity: "day",   range: 7  },
  { key: "30d", label: "30 ngày", granularity: "day",   range: 30 },
  { key: "3m",  label: "3 tháng", granularity: "month", range: 3  },
];

// ─── Chart default options ────────────────────────────────────────────────────
const BASE_LINE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#94a3b8",
      bodyColor: "#f1f5f9",
      padding: 10,
      cornerRadius: 10,
      callbacks: {
        label: (ctx) => ` ${fmtFullVND(ctx.raw)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#94a3b8", font: { size: 11 }, maxRotation: 0 },
    },
    y: {
      grid: { color: "#f1f5f9" },
      border: { display: false },
      ticks: {
        color: "#94a3b8",
        font: { size: 11 },
        callback: (v) => fmtVND(v),
      },
    },
  },
};

const DOUGHNUT_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "72%",
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      bodyColor: "#f1f5f9",
      padding: 10,
      cornerRadius: 10,
    },
  },
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const nav = useNavigate();

  const [ov,      setOv]      = useState(null);
  const [series,  setSeries]  = useState([]);
  const [status,  setStatus]  = useState([]);
  const [topP,    setTopP]    = useState([]);
  const [topC,    setTopC]    = useState([]);
  const [fc,      setFc]      = useState(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState("30d");

  const loadAll = useCallback(async (pKey = period) => {
    setLoading(true);
    try {
      const p = PERIODS.find((x) => x.key === pKey) || PERIODS[1];
      const [o, s, r, tp, tc, f] = await Promise.all([
        analyticsService.overview(),
        analyticsService.statusSummary(),
        analyticsService.revenueSeries(p.granularity, p.range),
        analyticsService.topProducts(8),
        analyticsService.topCustomers(5),
        analyticsService.forecast("day", 90, 14),
      ]);
      setOv(o); setStatus(s); setSeries(r); setTopP(tp); setTopC(tc); setFc(f);
    } catch {/* silent */}
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { loadAll(period); }, []);

  const changePeriod = (key) => {
    setPeriod(key);
    const p = PERIODS.find((x) => x.key === key) || PERIODS[1];
    analyticsService.revenueSeries(p.granularity, p.range).then(setSeries).catch(() => {});
  };

  // ── Revenue area chart ────────────────────────────────────────────────────
  const getGradient = useCallback((ctx, chartArea) => {
    if (!chartArea) return "rgba(59,130,246,0.3)";
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0,   "rgba(59,130,246,0.35)");
    g.addColorStop(0.5, "rgba(59,130,246,0.10)");
    g.addColorStop(1,   "rgba(59,130,246,0.00)");
    return g;
  }, []);

  const lineData = {
    labels: series.map((r) => {
      const p = PERIODS.find((x) => x.key === period);
      if (p?.granularity === "month") return r.x.slice(0, 7);
      // shorten date: DD/MM
      const parts = r.x.split("-");
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : r.x;
    }),
    datasets: [
      {
        label: "Doanh thu",
        data: series.map((r) => r.revenue),
        borderColor: "#3B82F6",
        borderWidth: 2,
        fill: true,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return "rgba(59,130,246,0.1)";
          return getGradient(c, chartArea);
        },
        tension: 0.4,
        pointRadius: series.length <= 10 ? 4 : 2,
        pointHoverRadius: 6,
        pointBackgroundColor: "#3B82F6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
      {
        label: "Đơn hàng",
        data: series.map((r) => r.count),
        borderColor: "#22C55E",
        borderWidth: 1.5,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        yAxisID: "y2",
      },
    ],
  };

  const lineOpts = {
    ...BASE_LINE_OPTS,
    plugins: {
      ...BASE_LINE_OPTS.plugins,
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 8, font: { size: 11 }, color: "#64748b" },
      },
      tooltip: {
        ...BASE_LINE_OPTS.plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            if (ctx.datasetIndex === 0) return ` Doanh thu: ${fmtFullVND(ctx.raw)}`;
            return ` Đơn hàng: ${ctx.raw}`;
          },
        },
      },
    },
    scales: {
      ...BASE_LINE_OPTS.scales,
      y2: {
        position: "right",
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#94a3b8", font: { size: 11 } },
      },
    },
  };

  // ── Doughnut ──────────────────────────────────────────────────────────────
  const activeStatus = status.filter((s) => s.count > 0);
  const doughnutData = {
    labels: activeStatus.map((s) => STATUS_LABELS[s.status] || s.status),
    datasets: [{
      data: activeStatus.map((s) => s.count),
      backgroundColor: activeStatus.map((s) => STATUS_COLORS[s.status] || "#94a3b8"),
      borderWidth: 2,
      borderColor: "#fff",
      hoverOffset: 8,
    }],
  };
  const totalOrdersChart = activeStatus.reduce((a, s) => a + s.count, 0);

  // ── Top products horizontal bar ───────────────────────────────────────────
  const topBarData = {
    labels: topP.map((p) => {
      const name = p.product?.name || "Sản phẩm";
      return name.length > 22 ? name.slice(0, 22) + "…" : name;
    }),
    datasets: [
      {
        label: "Doanh thu",
        data: topP.map((p) => p.revenue),
        backgroundColor: "#3B82F680",
        borderColor: "#3B82F6",
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  };
  const topBarOpts = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        bodyColor: "#f1f5f9",
        padding: 10,
        cornerRadius: 10,
        callbacks: { label: (ctx) => ` ${fmtFullVND(ctx.raw)}` },
      },
    },
    scales: {
      x: {
        grid: { color: "#f1f5f9" },
        border: { display: false },
        ticks: { color: "#94a3b8", font: { size: 11 }, callback: (v) => fmtVND(v) },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#475569", font: { size: 12 } },
      },
    },
  };

  // ── Forecast chart ────────────────────────────────────────────────────────
  const fcLabels = [
    ...(fc?.history?.map((x) => x.x.slice(5)) || []),
    ...(fc?.forecast?.map((_, i) => `+${i + 1}`) || []),
  ];
  const fcData = {
    labels: fcLabels,
    datasets: [
      {
        label: "Lịch sử",
        data: [...(fc?.history?.map((x) => x.revenue) || []), ...Array(fc?.forecast?.length || 0).fill(null)],
        borderColor: "#3B82F6",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: "Dự báo",
        data: [...Array(fc?.history?.length || 0).fill(null), ...(fc?.forecast?.map((x) => x.revenue) || [])],
        borderColor: "#F59E0B",
        borderDash: [5, 4],
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#F59E0B",
        tension: 0.3,
        fill: false,
      },
    ],
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const downloadExcel = async () => {
    try {
      const res = await analyticsService.exportExcel();
      saveAs(new Blob([res.data]), "analytics.xlsx");
    } catch { /* silent */ }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const sparkRevenues = (ov?.sparkline || []).map((s) => s.revenue);

  if (loading && !ov) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-default-900">Tổng quan cửa hàng</h1>
          <p className="text-sm text-default-400 mt-0.5">
            Cập nhật {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="bordered" radius="lg"
            startContent={loading ? <Spinner size="sm" color="default" /> : <RefreshCw size={14} />}
            onPress={() => loadAll(period)}
            isDisabled={loading}
          >
            Làm mới
          </Button>
          <Button
            size="sm" variant="bordered" radius="lg"
            startContent={<Download size={14} />}
            onPress={downloadExcel}
          >
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Doanh thu hôm nay"
          value={fmtVND(ov?.today_revenue)}
          pct={ov?.today_pct}
          sub="vs hôm qua"
          sparkData={sparkRevenues}
          accent="#3B82F6"
          icon={DollarSign}
          delay={0}
        />
        <KpiCard
          title="Doanh thu tháng này"
          value={fmtVND(ov?.this_month_revenue)}
          pct={ov?.month_pct}
          sub="vs tháng trước"
          accent="#22C55E"
          icon={TrendingUp}
          delay={0.05}
        />
        <KpiCard
          title="Đang xử lý"
          value={ov?.processing_orders ?? "—"}
          sub={`${ov?.new_orders_today ?? 0} đơn mới hôm nay`}
          accent="#F59E0B"
          icon={ShoppingCart}
          delay={0.1}
        />
        <KpiCard
          title="Khách hàng"
          value={ov?.total_customers ?? "—"}
          sub={`${ov?.month_order_count ?? 0} đơn tháng này`}
          accent="#8B5CF6"
          icon={Users}
          delay={0.15}
        />
        <KpiCard
          title="Sản phẩm đang bán"
          value={ov?.total_products ?? "—"}
          accent="#06B6D4"
          icon={Package}
          delay={0.2}
        />
        <KpiCard
          title="Hàng sắp hết"
          value={ov?.low_stock_count ?? 0}
          sub={ov?.low_stock_count > 0 ? "Cần bổ sung ngay" : "Kho đủ hàng"}
          accent={ov?.low_stock_count > 0 ? "#EF4444" : "#94a3b8"}
          icon={AlertTriangle}
          delay={0.25}
        />
      </div>

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card radius="xl" shadow="sm">
          <CardBody className="p-4">
            <p className="text-xs font-semibold text-default-400 uppercase tracking-wide mb-3">Thao tác nhanh</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              <QuickAction nav={nav} icon={Plus}         label="Thêm sản phẩm"  to="/shop/admin/products/new"     color="#3B82F6" />
              <QuickAction nav={nav} icon={ShoppingCart} label="Đơn hàng"        to="/shop/orders"                 color="#F59E0B" badge={ov?.processing_orders} />
              <QuickAction nav={nav} icon={Tag}          label="Voucher"          to="/shop/marketing/vouchers"     color="#8B5CF6" />
              <QuickAction nav={nav} icon={AlertTriangle} label="Hàng sắp hết"  to="/shop/inventory/low-stock"    color="#EF4444" badge={ov?.low_stock_count} />
              <QuickAction nav={nav} icon={Star}         label="Đánh giá"        to="/shop/reviews"                color="#F59E0B" badge={ov?.pending_reviews} />
              <QuickAction nav={nav} icon={Settings}     label="Cài đặt shop"    to="/shop/settings"               color="#64748b" />
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* ── Revenue chart + Order status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">

        {/* Revenue area chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card radius="xl" shadow="sm" className="h-full">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="font-black text-default-900">Doanh thu & Đơn hàng</h3>
                  <p className="text-xs text-default-400 mt-0.5">
                    Tổng: <span className="font-semibold text-primary">
                      {fmtFullVND(series.reduce((a, r) => a + r.revenue, 0))}
                    </span>
                    {" · "}
                    <span className="font-semibold text-success">
                      {series.reduce((a, r) => a + (r.count || 0), 0)} đơn
                    </span>
                  </p>
                </div>
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => changePeriod(p.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        period === p.key
                          ? "bg-primary text-white shadow-sm"
                          : "text-default-500 hover:bg-default-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 220 }}>
                <Line data={lineData} options={lineOpts} />
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Order status donut */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card radius="xl" shadow="sm" className="h-full">
            <CardBody className="p-5">
              <h3 className="font-black text-default-900 mb-3">Trạng thái đơn hàng</h3>
              {activeStatus.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-default-300">
                  <Inbox size={32} />
                  <p className="text-sm mt-2">Chưa có dữ liệu</p>
                </div>
              ) : (
                <>
                  <div className="relative flex justify-center" style={{ height: 160 }}>
                    <Doughnut data={doughnutData} options={DOUGHNUT_OPTS} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl font-black text-default-900">{totalOrdersChart}</p>
                      <p className="text-xs text-default-400">tổng đơn</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {activeStatus.map((s) => (
                      <div key={s.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: STATUS_COLORS[s.status] || "#94a3b8" }}
                          />
                          <span className="text-xs text-default-600">{STATUS_LABELS[s.status] || s.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-default-800">{s.count}</span>
                          <span className="text-xs text-default-400">
                            ({totalOrdersChart > 0 ? Math.round((s.count / totalOrdersChart) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* ── Top products + Top customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">

        {/* Top products bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card radius="xl" shadow="sm">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-default-900">Top sản phẩm bán chạy</h3>
                <button
                  onClick={() => nav("/shop/admin/products")}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  Xem tất cả <Eye size={12} />
                </button>
              </div>
              {topP.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-default-300">
                  <BarChart2 size={32} />
                  <p className="text-sm mt-2">Chưa có dữ liệu</p>
                </div>
              ) : (
                <div style={{ height: Math.min(topP.length * 38 + 20, 280) }}>
                  <Bar data={topBarData} options={topBarOpts} />
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Top customers */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card radius="xl" shadow="sm">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-default-900">Khách hàng thân thiết</h3>
                <button
                  onClick={() => nav("/shop/customers")}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  Xem tất cả <Eye size={12} />
                </button>
              </div>
              {topC.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-default-300">
                  <Users size={32} />
                  <p className="text-sm mt-2">Chưa có dữ liệu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topC.map((c, i) => {
                    const name = c.customer?.full_name || c.customer?.username || "Khách hàng";
                    const avatar = c.customer?.avatar;
                    return (
                      <div key={c._id} className="flex items-center gap-3">
                        <div className="w-5 text-xs font-bold text-default-400 text-center flex-shrink-0">
                          {i + 1}
                        </div>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                          style={{
                            backgroundImage: avatar ? `url(${avatar})` : undefined,
                            backgroundSize: "cover",
                            backgroundColor: avatar ? undefined : ["#3B82F6","#22C55E","#F59E0B","#8B5CF6","#EF4444"][i % 5],
                          }}
                        >
                          {!avatar && name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-default-900 truncate">{name}</p>
                          <p className="text-xs text-default-400">{c.orders} đơn hàng</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-success-600">{fmtVND(c.total_spent)}</p>
                          <p className="text-xs text-default-400">tổng chi</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* ── Forecast ── */}
      {fc && (fc.history?.length > 0 || fc.forecast?.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card radius="xl" shadow="sm">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-default-900">Dự báo doanh thu</h3>
                  <p className="text-xs text-default-400 mt-0.5">Hồi quy tuyến tính dựa trên 90 ngày gần nhất</p>
                </div>
                <Chip size="sm" color="warning" variant="flat">Beta</Chip>
              </div>
              <div style={{ height: 180 }}>
                <Line data={fcData} options={{
                  ...BASE_LINE_OPTS,
                  plugins: {
                    ...BASE_LINE_OPTS.plugins,
                    legend: {
                      display: true,
                      position: "top",
                      align: "end",
                      labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 8, font: { size: 11 }, color: "#64748b" },
                    },
                  },
                }} />
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

    </div>
  );
}
