import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { analyticsService } from "../../services/analyticsService";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import { saveAs } from "file-saver";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, BarElement, Tooltip, Legend,
} from "chart.js";
import { Card, CardBody, Button } from "@heroui/react";
import { Download, TrendingUp, ShoppingCart, Users, DollarSign } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Legend);

const KPI_ICONS = [DollarSign, ShoppingCart, ShoppingCart, Users];

function KpiCard({ title, value, icon: Icon, color = "text-primary" }) {
  return (
    <Card radius="xl" shadow="sm">
      <CardBody className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-primary/10`}>
          <Icon size={22} className={color} />
        </div>
        <div>
          <p className="text-xs text-default-400 font-medium">{title}</p>
          <p className="text-xl font-black text-default-900">{value ?? "-"}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function formatVND(n) {
  return Number(n || 0).toLocaleString("vi-VN") + " ₫";
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [ov,     setOv]     = useState(null);
  const [series, setSeries] = useState([]);
  const [status, setStatus] = useState([]);
  const [topP,   setTopP]   = useState([]);
  const [fc,     setFc]     = useState(null);

  useEffect(() => {
    (async () => {
      const [o, s, r, tp, f] = await Promise.all([
        analyticsService.overview(),
        analyticsService.statusSummary(),
        analyticsService.revenueSeries("day", 30),
        analyticsService.topProducts(10),
        analyticsService.forecast("day", 90, 14),
      ]);
      setOv(o); setStatus(s); setSeries(r); setTopP(tp); setFc(f);
    })();
  }, []);

  const lineData = {
    labels: series.map((r) => r.x),
    datasets: [{ label: t("shop.today_revenue"), data: series.map((r) => r.revenue), borderColor: "#0B74E5", tension: 0.4 }],
  };
  const doughnutData = {
    labels: status.map((s) => s.status),
    datasets: [{ data: status.map((s) => s.count) }],
  };
  const topBar = {
    labels: topP.map((p) => p.product?.name || p._id),
    datasets: [{ label: t("shop.qty_sold"), data: topP.map((p) => p.qty), backgroundColor: "#0B74E5" }],
  };

  const downloadExcel = async () => {
    const res = await analyticsService.exportExcel();
    saveAs(new Blob([res.data]), "dfs_analytics.xlsx");
  };
  const downloadPdf = async () => {
    const res = await analyticsService.exportPdf();
    saveAs(new Blob([res.data], { type: "application/pdf" }), "dfs_analytics.pdf");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">{t("shop.dashboard")}</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t("shop.today_revenue")}     value={formatVND(ov?.today_revenue)} icon={DollarSign} />
        <KpiCard title={t("shop.processing_orders")} value={ov?.processing_orders}         icon={ShoppingCart} />
        <KpiCard title={t("shop.total_orders")}      value={ov?.total_orders}               icon={TrendingUp} />
        <KpiCard title={t("shop.total_customers")}   value={ov?.total_customers}            icon={Users} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <Card radius="xl" shadow="sm"><CardBody className="p-4"><Line data={lineData} /></CardBody></Card>
        <Card radius="xl" shadow="sm"><CardBody className="p-4"><Doughnut data={doughnutData} /></CardBody></Card>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-4">
          <h3 className="font-bold text-default-900 mb-3">{t("shop.top_products")}</h3>
          <Bar data={topBar} />
        </CardBody>
      </Card>

      {fc && (
        <Card radius="xl" shadow="sm">
          <CardBody className="p-4">
            <h3 className="font-bold text-default-900 mb-3">{t("shop.forecast_preview")}</h3>
            <Line data={{
              labels: [...(fc.history?.map((x) => x.x) || []), ...(fc.forecast?.map((_, i) => `F+${i + 1}`) || [])],
              datasets: [
                { label: t("shop.history"),  data: fc.history?.map((x) => x.revenue) || [], borderColor: "#0B74E5" },
                { label: t("shop.forecast"), data: fc.forecast?.map((x) => x.revenue) || [], borderColor: "#f59e0b", borderDash: [4, 4] },
              ],
            }} />
            <p className="text-xs text-default-400 mt-2">{t("shop.forecast_note")}</p>
          </CardBody>
        </Card>
      )}

      <div className="flex gap-3">
        <Button startContent={<Download size={14} />} variant="bordered" radius="lg" onPress={downloadExcel}>{t("common.export_excel")}</Button>
        <Button startContent={<Download size={14} />} variant="bordered" radius="lg" onPress={downloadPdf}>{t("common.export_pdf")}</Button>
      </div>
    </div>
  );
}
