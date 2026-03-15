import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { orderService } from "../../services/orderService";
import {
  Card, CardBody, Tabs, Tab, Button, Chip, Divider, Pagination, Input,
} from "@heroui/react";
import { Truck, Printer, RefreshCw, Receipt, Search } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { useTranslation } from "react-i18next";

const STATUS_COLOR = {
  pending: "warning",
  confirmed: "primary",
  processing: "primary",
  shipping: "secondary",
  delivered: "success",
  canceled_by_customer: "default",
  canceled_by_shop: "default",
  refund_pending: "warning",
  refund_completed: "success",
};

export default function Orders() {
  const nav = useNavigate();
  const { t } = useTranslation();

  const STATUS_TABS = [
    { key: "",                label: t("order.filter_all") },
    { key: "pending",         label: t("order.status_pending") },
    { key: "confirmed",       label: t("order.status_confirmed") },
    { key: "shipping",        label: t("order.status_shipping") },
    { key: "delivered",       label: t("order.status_delivered") },
    { key: "canceled",        label: t("order.status_cancelled") },
    { key: "refund_pending",  label: t("order.status_refund_pending") },
    { key: "refund_completed",label: t("order.status_refund_done") },
  ];

  const STATUS_LABEL = {
    pending:              t("order.status_pending"),
    confirmed:            t("order.status_confirmed"),
    processing:           t("order.status_confirmed"),
    shipping:             t("order.status_shipping"),
    delivered:            t("order.status_delivered"),
    canceled_by_customer: t("order.status_cancelled"),
    canceled_by_shop:     t("order.status_cancelled"),
    refund_pending:       t("order.status_refund_pending"),
    refund_completed:     t("order.status_refund_done"),
  };

  const [tab, setTab] = useState("");
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      let status;
      if (tab === "canceled") {
        status = ["canceled_by_customer", "canceled_by_shop"];
      } else {
        status = tab || undefined;
      }
      const res = await orderService.list({ status, page, limit: 10, q: q || undefined });
      setData(res);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [tab]);

  return (
    <PageContainer wide={false}>
      <h1 className="text-2xl font-black text-default-900 mb-6">{t("order.title")}</h1>

      {/* Filter row */}
      <div className="flex flex-col md:flex-row gap-3 mb-5 items-start md:items-center">
        <Tabs
          selectedKey={tab}
          onSelectionChange={setTab}
          variant="underlined"
          classNames={{ tabList: "gap-1 overflow-x-auto", tab: "text-sm whitespace-nowrap" }}
          className="flex-1"
        >
          {STATUS_TABS.map((s) => <Tab key={s.key} title={s.label} />)}
        </Tabs>
        <div className="flex gap-2 flex-shrink-0">
          <Input
            size="sm"
            placeholder={t("order.order_id")}
            value={q}
            onValueChange={setQ}
            radius="lg"
            startContent={<Search size={13} className="text-default-400" />}
            onKeyDown={(e) => { if (e.key === "Enter") load(1); }}
            className="w-44"
          />
          <Button size="sm" variant="bordered" radius="lg" onPress={() => load(1)} className="font-medium">
            {t("common.search")}
          </Button>
        </div>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-default-100 animate-pulse" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("order.empty")}
          description={t("order.empty_cta")}
          actionLabel={t("order.empty_cta")}
          onAction={() => nav("/")}
        />
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {data.items.map((o, idx) => (
              <motion.div
                key={o._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <Card radius="xl" shadow="sm" className="border border-default-100">
                  <CardBody className="p-5">
                    {/* Order header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-default-900">#{o.order_code}</span>
                        <Chip
                          size="sm"
                          color={STATUS_COLOR[o.status] || "default"}
                          variant="flat"
                          className="font-semibold"
                        >
                          {STATUS_LABEL[o.status] || o.status}
                        </Chip>
                        {o.createdAt && (
                          <span className="text-xs text-default-400">
                            {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Truck size={13} />}
                          onPress={() => nav(`/orders/${o._id}`)}
                          className="font-medium"
                        >
                          {t("order.detail")}
                        </Button>
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Printer size={13} />}
                          onPress={async () => { const { url } = await orderService.invoice(o._id); window.open(url, "_blank"); }}
                          className="font-medium"
                        >
                          {t("order.track")}
                        </Button>
                        <Button
                          size="sm" color="primary" radius="lg" variant="flat"
                          startContent={<RefreshCw size={13} />}
                          onPress={async () => { await orderService.reorder(o._id); nav("/cart"); }}
                          className="font-medium"
                        >
                          {t("order.reorder")}
                        </Button>
                      </div>
                    </div>

                    <Divider className="mb-3" />

                    {/* Items preview */}
                    <div className="space-y-2.5">
                      {(o.items || []).slice(0, 3).map((it, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-default-100 flex-shrink-0">
                              {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-default-900 line-clamp-1">{it.name}</p>
                              {it.variant_text && <p className="text-xs text-default-400">{it.variant_text}</p>}
                              <p className="text-xs text-default-400">SL: {it.qty}</p>
                            </div>
                          </div>
                          <p className="font-bold text-sm text-default-800 whitespace-nowrap">
                            {formatCurrency(it.total || it.price * it.qty)}
                          </p>
                        </div>
                      ))}
                      {(o.items?.length || 0) > 3 && (
                        <p className="text-xs text-default-400 text-center pt-1">
                          +{o.items.length - 3} sản phẩm khác
                        </p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-default-100">
                      <div className="flex gap-2 flex-wrap">
                        {["pending", "confirmed", "processing"].includes(o.status) && (
                          <Button
                            size="sm" color="danger" variant="bordered" radius="lg"
                            onPress={async () => {
                              if (!confirm("Hủy đơn hàng này?")) return;
                              await orderService.cancel(o._id);
                              await load(data.page);
                            }}
                          >
                            {t("order.cancel")}
                          </Button>
                        )}
                        {o.status === "delivered" && (
                          <Button
                            size="sm" variant="bordered" radius="lg"
                            onPress={async () => { await orderService.reviewReminder(o._id); alert("Đã gửi nhắc nhở"); }}
                          >
                            Nhắc đánh giá
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-default-400">{t("order.total")}:</span>
                        <span className="font-black text-primary text-base">
                          {formatCurrency(Number(o.total_price))}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {(data.total || 0) > (data.limit || 10) && (
        <div className="flex justify-center mt-8">
          <Pagination
            total={Math.ceil(data.total / data.limit) || 1}
            page={data.page}
            onChange={(p) => load(p)}
            color="primary"
            radius="lg"
            showShadow
          />
        </div>
      )}
    </PageContainer>
  );
}
