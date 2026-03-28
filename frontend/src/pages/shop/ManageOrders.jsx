import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Spinner, Textarea, Divider, Tooltip,
} from "@heroui/react";
import {
  Search, Eye, CheckCircle, XCircle, Truck, Package,
  MapPin, Phone, User, CreditCard, Clock, RefreshCw,
} from "lucide-react";
import { shopOrderApi } from "../../services/shopManagementService";
import { useToast } from "../../components/common/ToastProvider";
import PaginationBar from "../../components/ui/PaginationBar";

// ─────────────────────────────────────────────────────────────────────────────
// Status config — color and group data only (labels resolved via t() in component)
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  order_created:         { labelKey: "order.status_order_created",    color: "warning",   group: "pending" },
  payment_pending:       { labelKey: "order.status_payment_pending",  color: "warning",   group: "pending" },
  payment_failed:        { labelKey: "order.status_payment_failed",   color: "danger",    group: "pending" },
  payment_confirmed:     { labelKey: "order.status_payment_confirmed",color: "primary",   group: "processing" },
  processing:            { labelKey: "order.status_processing",       color: "primary",   group: "processing" },
  packed:                { labelKey: "order.status_packed",           color: "primary",   group: "processing" },
  picking:               { labelKey: "order.status_picking",          color: "secondary", group: "shipping" },
  in_transit:            { labelKey: "order.status_in_transit",       color: "secondary", group: "shipping" },
  out_for_delivery:      { labelKey: "order.status_out_for_delivery", color: "secondary", group: "shipping" },
  delivered:             { labelKey: "order.status_delivered_full",   color: "success",   group: "done" },
  delivery_failed:       { labelKey: "order.status_delivery_failed",  color: "danger",    group: "shipping" },
  cancelled_by_customer: { labelKey: "order.status_cancelled_customer",color: "default",  group: "cancelled" },
  cancelled_by_shop:     { labelKey: "order.status_cancelled_shop",   color: "default",   group: "cancelled" },
  return_requested:      { labelKey: "order.status_return_requested", color: "warning",   group: "return" },
  return_approved:       { labelKey: "order.status_return_approved",  color: "primary",   group: "return" },
  return_rejected:       { labelKey: "order.status_return_rejected",  color: "danger",    group: "return" },
  refund_pending:        { labelKey: "order.status_refund_pending_full",color: "warning",  group: "return" },
  refund_completed:      { labelKey: "order.status_refund_completed", color: "success",   group: "done" },
  // legacy
  pending:               { labelKey: "order.status_order_created",    color: "warning",   group: "pending" },
  confirmed:             { labelKey: "order.status_confirmed",       color: "primary",   group: "processing" },
  shipping:              { labelKey: "order.status_in_transit",       color: "secondary", group: "shipping" },
  canceled_by_customer:  { labelKey: "order.status_cancelled_customer",color: "default",  group: "cancelled" },
  canceled_by_shop:      { labelKey: "order.status_cancelled_shop",   color: "default",   group: "cancelled" },
};

// Status tab groups (keys are not translated — they're filter values)
const STATUS_TABS = [
  { key: "",                                                                                tabKey: "shop.order_tab_all" },
  { key: "order_created,payment_pending,pending",                                          tabKey: "shop.order_tab_pending" },
  { key: "payment_confirmed,processing,packed,confirmed",                                  tabKey: "shop.order_tab_processing" },
  { key: "picking,in_transit,out_for_delivery,shipping",                                   tabKey: "shop.order_tab_shipping" },
  { key: "delivered",                                                                       tabKey: "shop.order_tab_done" },
  { key: "cancelled_by_customer,cancelled_by_shop,canceled_by_customer,canceled_by_shop", tabKey: "shop.order_tab_cancelled" },
  { key: "return_requested,return_approved,return_rejected,refund_pending,refund_completed",tabKey: "shop.order_tab_return" },
];

// Helper functions
const formatVND  = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
const formatDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "-";

function StatusChip({ status, size = "sm" }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] || { labelKey: null, color: "default" };
  const label = cfg.labelKey ? t(cfg.labelKey) : status;
  return <Chip size={size} color={cfg.color} variant="flat">{label}</Chip>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancellable statuses set
// ─────────────────────────────────────────────────────────────────────────────
const CANCELLABLE = new Set([
  "order_created", "payment_pending", "payment_failed", "payment_confirmed",
  "confirmed", "processing", "packed", "pending",
]);
const CONFIRMABLE = new Set([
  "order_created", "payment_confirmed", "payment_pending", "pending",
]);
const START_PROCESSING = new Set(["confirmed"]);
const GHN_PUSHABLE = new Set(["confirmed", "processing", "packed"]);
const IN_SHIPPING  = new Set(["picking", "in_transit", "out_for_delivery", "shipping"]);

// ─────────────────────────────────────────────────────────────────────────────
// Status Timeline component
// ─────────────────────────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { status: "order_created",     labelKey: "order.status_order_created" },
  { status: "confirmed",         labelKey: "order.status_confirmed" },
  { status: "processing",        labelKey: "order.status_processing" },
  { status: "packed",            labelKey: "order.status_packed" },
  { status: "picking",           labelKey: "order.status_picking" },
  { status: "in_transit",        labelKey: "order.status_in_transit" },
  { status: "out_for_delivery",  labelKey: "order.status_out_for_delivery" },
  { status: "delivered",         labelKey: "order.status_delivered_full" },
];

const STEP_ORDER = TIMELINE_STEPS.map((s) => s.status);

function StatusTimeline({ status }) {
  const { t } = useTranslation();
  const currentIdx = STEP_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {TIMELINE_STEPS.map((step, i) => {
        const done    = currentIdx >= i;
        const current = currentIdx === i;
        return (
          <React.Fragment key={step.status}>
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done
                  ? current
                    ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                    : "bg-success text-white"
                  : "bg-default-200 text-default-400"
              }`}>
                {done && !current ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] text-center leading-tight ${done ? "text-default-700 dark:text-[#c8cbd4] font-medium" : "text-default-400"}`}>
                {t(step.labelKey)}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 min-w-[12px] mt-[-14px] rounded ${i < currentIdx ? "bg-success" : "bg-default-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function ManageOrders() {
  const { t } = useTranslation();
  const toast = useToast();

  // List state
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab]   = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm]   = useState("");
  const [limit, setLimit] = useState(15);

  // Detail modal
  const [detail, setDetail]         = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState(null); // { id, orderCode }
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // GHN push modal
  const [ghnTarget, setGhnTarget]   = useState(null); // order object
  const [ghnLoading, setGhnLoading] = useState(false);

  // GHN dev simulator
  const [simStatus,  setSimStatus]  = useState("picking");
  const [simLoading, setSimLoading] = useState(false);

  // Tracking modal
  const [trackData, setTrackData]   = useState(null);
  const [trackOpen, setTrackOpen]   = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // ── Load orders ──────────────────────────────────────────────────────────
  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit };
      if (activeTab) params.status = activeTab;
      if (searchTerm) params.q = searchTerm;
      const res = await shopOrderApi.getAll(params);
      setOrders(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTotalPages(Math.ceil((res.data?.total || 0) / limit));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, searchTerm]);

  useEffect(() => { load(page); }, [page, activeTab, searchTerm]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  // ── Open detail modal ────────────────────────────────────────────────────
  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await shopOrderApi.getById(id);
      setDetail(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || t("common.error"));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Confirm order ────────────────────────────────────────────────────────
  const handleConfirm = async (id) => {
    setActionLoading(true);
    try {
      await shopOrderApi.confirm(id);
      toast.success(t("shop.order_confirm_btn") || t("common.success"));
      load(page);
      if (detailOpen && detail?._id === id) {
        const res = await shopOrderApi.getById(id);
        setDetail(res.data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Cancel order ─────────────────────────────────────────────────────────
  const openCancelModal = (order) => {
    setCancelTarget({ id: order._id, orderCode: order.order_code });
    setCancelReason("");
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      toast.error(t("common.required"));
      return;
    }
    setCancelLoading(true);
    try {
      await shopOrderApi.cancel(cancelTarget.id, cancelReason.trim());
      toast.success(t("common.success"));
      setCancelTarget(null);
      setCancelReason("");
      load(page);
      if (detailOpen && detail?._id === cancelTarget.id) setDetailOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || t("common.error"));
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Update status (packed ↔ processing) ──────────────────────────────────
  const handleUpdateStatus = async (id, status) => {
    setActionLoading(true);
    try {
      await shopOrderApi.updateStatus(id, status);
      toast.success(t("common.success"));
      load(page);
      if (detailOpen && detail?._id === id) {
        const res = await shopOrderApi.getById(id);
        setDetail(res.data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Push to GHN ──────────────────────────────────────────────────────────
  const openGhnModal = (order) => setGhnTarget(order);

  const handlePushGhn = async () => {
    if (!ghnTarget) return;
    setGhnLoading(true);
    try {
      const res = await shopOrderApi.pushToGhn(ghnTarget._id);
      toast.success(`${t("common.success")}! ${res.data?.ghn_order_code || ""}`);
      setGhnTarget(null);
      load(page);
      if (detailOpen && detail?._id === ghnTarget._id) {
        const r = await shopOrderApi.getById(ghnTarget._id);
        setDetail(r.data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || t("common.error"));
    } finally {
      setGhnLoading(false);
    }
  };

  // ── GHN dev simulate ─────────────────────────────────────────────────────
  const handleSimulateGhn = async () => {
    if (!detail?.ghn_order_code) return;
    setSimLoading(true);
    try {
      await shopOrderApi.simulateGhn(detail.ghn_order_code, simStatus);
      toast.success(`Simulated GHN: ${simStatus}`);
      const r = await shopOrderApi.getById(detail._id);
      setDetail(r.data);
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setSimLoading(false);
    }
  };

  const handleDevResetGhn = async () => {
    if (!detail?._id) return;
    setSimLoading(true);
    try {
      await shopOrderApi.devResetGhn(detail._id);
      toast.success("Reset to processing — ready to push GHN again");
      const r = await shopOrderApi.getById(detail._id);
      setDetail(r.data);
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setSimLoading(false);
    }
  };

  // ── Sync from GHN ────────────────────────────────────────────────────────
  const [syncLoading, setSyncLoading] = useState(false);

  const handleSyncGhn = async (orderId) => {
    const id = orderId || detail?._id;
    if (!id) return;
    setSyncLoading(true);
    try {
      const res = await shopOrderApi.syncGhn(id);
      const d = res.data;
      if (d.updated) {
        toast.success(`Synced: GHN "${d.ghn_status}" → "${d.internal_status}"`);
      } else {
        toast.success(`Status already correct: ${d.internal_status} (GHN: ${d.ghn_status})`);
      }
      if (detail?._id === id) {
        const r = await shopOrderApi.getById(id);
        setDetail(r.data);
      }
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setSyncLoading(false);
    }
  };

  // ── Track order ──────────────────────────────────────────────────────────
  const openTrackModal = async (id) => {
    setTrackOpen(true);
    setTrackLoading(true);
    try {
      const res = await shopOrderApi.track(id);
      setTrackData(res.data);
    } catch (e) {
      toast.error(t("common.error"));
      setTrackOpen(false);
    } finally {
      setTrackLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("shop.manage_orders")}</h1>
          <p className="text-sm text-default-400">{t("shop.order_total_count", { count: total })}</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input size="sm" placeholder={t("shop.order_search_placeholder")} value={searchInput}
            onValueChange={setSearchInput} radius="lg" className="w-48"
            startContent={<Search size={14} />} />
          <Button size="sm" type="submit" variant="bordered" radius="lg">{t("shop.order_search_btn")}</Button>
          <Button size="sm" variant="light" radius="lg" isIconOnly
            onPress={() => load(page)} title={t("shop.order_refresh")}>
            <RefreshCw size={14} />
          </Button>
        </form>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <Button key={tab.key} size="sm" radius="lg"
            variant={activeTab === tab.key ? "solid" : "bordered"}
            color={activeTab === tab.key ? "primary" : "default"}
            onPress={() => handleTabChange(tab.key)}>
            {t(tab.tabKey)}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : orders.length === 0 ? (
            <p className="text-center py-12 text-default-400">{t("shop.order_no_orders")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 dark:bg-[#1a1e2e] border-b border-default-100 dark:border-[#2e3347]">
                <tr>
                  {[t("order.order_id"), t("common.name"), t("order.items"), t("order.total"), t("order.payment_method"), t("common.status"), "GHN", t("order.date"), ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 dark:text-[#9ea3b5] uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100 dark:divide-zinc-700">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-default-50 dark:hover:bg-zinc-800 transition-colors">
                    {/* Order code */}
                    <td className="px-4 py-3 font-bold text-default-900 dark:text-[#e8eaed] font-mono text-xs whitespace-nowrap">
                      {o.order_code}
                    </td>
                    {/* Customer */}
                    <td className="px-4 py-3 text-default-600 dark:text-[#9ea3b5] text-xs max-w-[120px] truncate">
                      {o.customer?.name || o.shipping_address?.name || "—"}
                    </td>
                    {/* Item count */}
                    <td className="px-4 py-3 text-default-500 text-xs">
                      {(o.items || []).length} {t("shop.order_items_short")}
                    </td>
                    {/* Total */}
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {formatVND(o.total_price)}
                    </td>
                    {/* Payment */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium">{o.payment_method}</span>
                        <Chip size="sm" color={o.payment_status === "paid" ? "success" : o.payment_status === "failed" ? "danger" : "warning"} variant="flat">
                          {o.payment_status === "paid" ? t("shop.order_paid") : o.payment_status === "failed" ? t("shop.order_failed_pay") : t("shop.order_unpaid")}
                        </Chip>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3"><StatusChip status={o.status} /></td>
                    {/* GHN code */}
                    <td className="px-4 py-3 text-xs font-mono text-default-500">
                      {o.ghn_order_code ? (
                        <Chip size="sm" color="secondary" variant="flat">{o.ghn_order_code}</Chip>
                      ) : "—"}
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-default-500 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Tooltip content={t("shop.order_detail_tooltip")}>
                          <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(o._id)}>
                            <Eye size={14} />
                          </Button>
                        </Tooltip>

                        {CONFIRMABLE.has(o.status) && (
                          <Tooltip content={t("shop.order_confirmable")}>
                            <Button isIconOnly size="sm" variant="light" color="primary"
                              onPress={() => handleConfirm(o._id)} isDisabled={actionLoading}>
                              <CheckCircle size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {START_PROCESSING.has(o.status) && (
                          <Tooltip content={t("shop.order_start_proc_tooltip")}>
                            <Button isIconOnly size="sm" variant="light" color="primary"
                              onPress={() => handleUpdateStatus(o._id, "processing")} isDisabled={actionLoading}>
                              <Package size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {GHN_PUSHABLE.has(o.status) && !o.ghn_order_code && (
                          <Tooltip content={t("shop.order_send_ghn_tooltip")}>
                            <Button isIconOnly size="sm" variant="light" color="secondary"
                              onPress={() => openGhnModal(o)} isDisabled={actionLoading}>
                              <Truck size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {o.ghn_order_code && (
                          <Tooltip content="Sync status from GHN">
                            <Button isIconOnly size="sm" variant="light" color="default"
                              isLoading={syncLoading}
                              onPress={() => handleSyncGhn(o._id)}>
                              <RefreshCw size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {IN_SHIPPING.has(o.status) && o.ghn_order_code && (
                          <Tooltip content={t("shop.order_tracking")}>
                            <Button isIconOnly size="sm" variant="light" color="secondary"
                              onPress={() => openTrackModal(o._id)}>
                              <MapPin size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {CANCELLABLE.has(o.status) && (
                          <Tooltip content={t("shop.order_cancel_tooltip")}>
                            <Button isIconOnly size="sm" variant="light" color="danger"
                              onPress={() => openCancelModal(o)}>
                              <XCircle size={14} />
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={detailOpen} onOpenChange={(o) => !o && setDetailOpen(false)}
        radius="xl" size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Package size={18} />
                {t("shop.order_detail_title", { code: detail?.order_code })}
              </ModalHeader>
              <ModalBody className="space-y-4 pb-4">
                {detailLoading || !detail ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : (
                  <>
                    {/* Status timeline */}
                    <div>
                      <p className="text-xs font-semibold text-default-500 uppercase mb-2">{t("shop.order_status_label")}</p>
                      <StatusTimeline status={detail.status} />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <StatusChip status={detail.status} size="md" />
                        {detail.ghn_order_code && (
                          <Chip size="md" color="secondary" variant="flat">GHN: {detail.ghn_order_code}</Chip>
                        )}
                      </div>
                    </div>

                    <Divider />

                    {/* Order info */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-default-500">
                          <Clock size={13} />
                          <span>{t("shop.order_date_label")}</span>
                          <span className="text-default-700 dark:text-[#c8cbd4] font-medium">{formatDate(detail.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-default-500">
                          <CreditCard size={13} />
                          <span>{t("shop.order_payment_label")}</span>
                          <span className="text-default-700 dark:text-[#c8cbd4] font-medium">{detail.payment_method}</span>
                          <Chip size="sm" color={detail.payment_status === "paid" ? "success" : "warning"} variant="flat">
                            {detail.payment_status === "paid" ? t("shop.order_paid") : t("shop.order_unpaid")}
                          </Chip>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {detail.expected_delivery && (
                          <div className="flex items-center gap-2 text-default-500">
                            <Truck size={13} />
                            <span>{t("shop.order_expected")}</span>
                            <span className="text-default-700 dark:text-[#c8cbd4] font-medium">{formatDate(detail.expected_delivery)}</span>
                          </div>
                        )}
                        {detail.cancel_reason && (
                          <div className="text-xs text-danger bg-danger-50 rounded-lg p-2">
                            {t("shop.order_cancel_reason")} {detail.cancel_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <Divider />

                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-default-500 uppercase mb-2">
                        {t("shop.order_products_count", { count: (detail.items || []).length })}
                      </p>
                      <div className="space-y-2">
                        {(detail.items || []).map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-sm border border-default-100 dark:border-[#2e3347] rounded-xl p-3 gap-3">
                            {item.image_url && (
                              <img src={item.image_url} alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-default-400 text-xs">x{item.qty} · {formatVND(item.price)}/{t("shop.order_unit")}</p>
                            </div>
                            <p className="font-semibold whitespace-nowrap">{formatVND(item.total || item.price * item.qty)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border border-default-100 dark:border-[#2e3347] rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between text-sm text-default-600">
                        <span>{t("shop.order_shipping_fee")}</span>
                        <span>{formatVND(detail.shipping_fee)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>{t("shop.order_total_label")}</span>
                        <span className="text-primary">{formatVND(detail.total_price)}</span>
                      </div>
                    </div>

                    {/* Shipping address */}
                    {detail.shipping_address && (
                      <div className="text-sm border border-default-100 dark:border-[#2e3347] rounded-xl p-3">
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">{t("shop.order_ship_address")}</p>
                        <div className="flex items-start gap-2">
                          <MapPin size={13} className="text-default-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">{detail.shipping_address.name}</p>
                            <p className="flex items-center gap-1 text-default-500">
                              <Phone size={11} /> {detail.shipping_address.phone}
                            </p>
                            <p className="text-default-600">
                              {[
                                detail.shipping_address.street,
                                detail.shipping_address.ward,
                                detail.shipping_address.district,
                                detail.shipping_address.city,
                              ].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Customer info */}
                    {detail.customer && (
                      <div className="text-sm border border-default-100 dark:border-[#2e3347] rounded-xl p-3">
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">{t("shop.order_customer_label")}</p>
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-default-400" />
                          <span className="font-medium">{detail.customer.name}</span>
                          <span className="text-default-400">{detail.customer.email}</span>
                        </div>
                      </div>
                    )}

                    {/* GHN tracking preview */}
                    {detail.ghn_detail && (
                      <div className="text-sm border border-default-100 dark:border-[#2e3347] rounded-xl p-3">
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">
                          {t("shop.order_ghn_shipping", { status: detail.ghn_detail.status })}
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {(detail.ghn_detail.log || []).slice(0, 6).map((log, i) => (
                            <div key={i} className="flex gap-2 text-xs text-default-600">
                              <span className="text-default-400 whitespace-nowrap">
                                {log.updated_date ? new Date(log.updated_date).toLocaleString("vi-VN") : ""}
                              </span>
                              <span>{log.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DEV: GHN test tools */}
                    <div className="border-2 border-dashed border-warning-300 bg-warning-50 dark:bg-[#1a1e2e] rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-warning-700 uppercase">🧪 Dev — GHN Test Tools</p>
                      {detail.ghn_order_code ? (
                        <div className="flex gap-2 flex-wrap items-center">
                          <select
                            value={simStatus}
                            onChange={e => setSimStatus(e.target.value)}
                            className="flex-1 min-w-0 h-8 px-2 rounded-lg border border-warning-300 bg-white dark:bg-zinc-700 text-sm font-medium text-gray-800 dark:text-[#d1d5db] outline-none"
                          >
                            {[
                              ["ready_to_pick",            "ready_to_pick → processing"],
                              ["picking",                  "picking → picking"],
                              ["storing",                  "storing → packed"],
                              ["transporting",             "transporting → in_transit"],
                              ["delivering",               "delivering → out_for_delivery"],
                              ["money_collect_delivering", "money_collect_delivering → out_for_delivery (COD)"],
                              ["delivered",                "delivered → delivered ✓ (COD gets paid)"],
                              ["delivery_fail",            "delivery_fail → delivery_failed"],
                              ["cancel",                   "cancel → cancelled_by_shop"],
                            ].map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                          <Button size="sm" color="warning" radius="lg" isLoading={simLoading} onPress={handleSimulateGhn}>
                            Apply
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-warning-600 flex-1">Order has no GHN code. Reset to "processing" to push again.</p>
                          <Button size="sm" color="warning" variant="bordered" radius="lg" isLoading={simLoading} onPress={handleDevResetGhn}>
                            Reset → processing
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Status history */}
                    {(detail.status_history || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">{t("shop.order_status_history")}</p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {[...detail.status_history].reverse().map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs border-l-2 border-default-200 dark:border-[#2e3347] pl-3">
                              <span className="text-default-400 whitespace-nowrap">{formatDate(h.at)}</span>
                              <StatusChip status={h.status} />
                              {h.note && <span className="text-default-500">{h.note}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </ModalBody>

              {/* Action footer */}
              {detail && !detailLoading && (
                <ModalFooter className="flex gap-2 flex-wrap justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {CONFIRMABLE.has(detail.status) && (
                      <Button size="sm" color="primary" radius="lg" isDisabled={actionLoading}
                        onPress={() => handleConfirm(detail._id)}>
                        <CheckCircle size={14} /> {t("shop.order_confirm_btn")}
                      </Button>
                    )}
                    {detail.status === "confirmed" && (
                      <Button size="sm" color="primary" variant="bordered" radius="lg" isDisabled={actionLoading}
                        onPress={() => handleUpdateStatus(detail._id, "processing")}>
                        <Package size={14} /> {t("shop.order_start_process")}
                      </Button>
                    )}
                    {detail.status === "processing" && (
                      <Button size="sm" color="primary" variant="bordered" radius="lg" isDisabled={actionLoading}
                        onPress={() => handleUpdateStatus(detail._id, "packed")}>
                        <Package size={14} /> {t("shop.order_mark_packed")}
                      </Button>
                    )}
                    {detail.status === "packed" && (
                      <Button size="sm" color="primary" variant="bordered" radius="lg" isDisabled={actionLoading}
                        onPress={() => handleUpdateStatus(detail._id, "processing")}>
                        {t("shop.order_back_process")}
                      </Button>
                    )}
                    {GHN_PUSHABLE.has(detail.status) && !detail.ghn_order_code && (
                      <Button size="sm" color="secondary" radius="lg" isDisabled={actionLoading}
                        onPress={() => { onClose(); openGhnModal(detail); }}>
                        <Truck size={14} /> {t("shop.order_send_ghn")}
                      </Button>
                    )}
                    {IN_SHIPPING.has(detail.status) && detail.ghn_order_code && (
                      <Button size="sm" color="secondary" variant="bordered" radius="lg"
                        onPress={() => { onClose(); openTrackModal(detail._id); }}>
                        <MapPin size={14} /> {t("shop.order_tracking")}
                      </Button>
                    )}
                    {detail.ghn_order_code && (
                      <Button size="sm" color="default" variant="bordered" radius="lg"
                        isLoading={syncLoading}
                        onPress={() => handleSyncGhn(detail._id)}>
                        <RefreshCw size={14} /> Sync GHN
                      </Button>
                    )}
                    {CANCELLABLE.has(detail.status) && (
                      <Button size="sm" color="danger" variant="bordered" radius="lg" isDisabled={actionLoading}
                        onPress={() => { onClose(); openCancelModal(detail); }}>
                        <XCircle size={14} /> {t("shop.order_cancel_btn")}
                      </Button>
                    )}
                  </div>
                  <Button variant="light" onPress={onClose}>{t("shop.order_close")}</Button>
                </ModalFooter>
              )}
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Cancel Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("shop.order_cancel_title", { code: cancelTarget?.orderCode })}</ModalHeader>
              <ModalBody>
                <Textarea label={t("shop.order_cancel_reason_label")} placeholder={t("shop.order_cancel_reason_placeholder")}
                  value={cancelReason} onValueChange={setCancelReason} radius="lg" minRows={3}
                  isRequired />
                <p className="text-xs text-default-400">
                  {t("shop.order_cancel_warning")}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("shop.order_cancel_no")}</Button>
                <Button color="danger" isLoading={cancelLoading}
                  isDisabled={!cancelReason.trim()}
                  onPress={handleCancel}>
                  {t("shop.order_cancel_confirm_btn")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── GHN Push Confirmation Modal ───────────────────────────────────── */}
      <Modal isOpen={!!ghnTarget} onOpenChange={(o) => !o && setGhnTarget(null)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Truck size={18} /> {t("shop.order_ghn_title")}
              </ModalHeader>
              <ModalBody className="space-y-3">
                <p className="text-sm text-default-700">
                  {t("shop.order_ghn_about")}{" "}
                  <span className="font-bold font-mono">{ghnTarget?.order_code}</span>.
                </p>
                {ghnTarget && (
                  <div className="border border-default-100 dark:border-[#2e3347] rounded-xl p-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-default-500">{t("shop.order_ghn_customer")}</span>
                      <span className="font-medium">{ghnTarget.shipping_address?.name || ghnTarget.customer?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">{t("shop.order_ghn_address")}</span>
                      <span className="font-medium text-right max-w-[200px]">
                        {[ghnTarget.shipping_address?.ward, ghnTarget.shipping_address?.district, ghnTarget.shipping_address?.city].filter(Boolean).join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">{t("shop.order_ghn_payment")}</span>
                      <span className="font-medium">{ghnTarget.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">{ghnTarget.payment_method === "COD" ? t("shop.order_ghn_cod") : t("shop.order_ghn_value")}</span>
                      <span className="font-bold text-primary">{formatVND(ghnTarget.total_price)}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-warning-600 bg-warning-50 rounded-lg p-2">
                  {t("shop.order_ghn_warning")}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("shop.order_ghn_cancel")}</Button>
                <Button color="secondary" isLoading={ghnLoading} onPress={handlePushGhn}>
                  <Truck size={14} /> {t("shop.order_ghn_confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Tracking Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={trackOpen} onOpenChange={(o) => !o && setTrackOpen(false)} radius="xl" size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <MapPin size={18} /> {t("shop.order_track_title")}
              </ModalHeader>
              <ModalBody>
                {trackLoading ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : trackData ? (
                  <div className="space-y-4">
                    {trackData.ghn_order_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-default-500">{t("shop.order_ghn_code")}</span>
                        <Chip color="secondary" variant="flat">{trackData.ghn_order_code}</Chip>
                        {trackData.ghn_status && <StatusChip status={trackData.ghn_status} />}
                      </div>
                    )}
                    {trackData.expected_delivery && (
                      <p className="text-sm">
                        <span className="text-default-500">{t("shop.order_track_expected")} </span>
                        <span className="font-medium">{formatDate(trackData.expected_delivery)}</span>
                      </p>
                    )}

                    {/* GHN logs */}
                    {(trackData.tracking_logs || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">{t("shop.order_track_log")}</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {trackData.tracking_logs.map((log, i) => (
                            <div key={i} className="flex gap-3 text-sm border-l-2 border-secondary pl-3">
                              <div className="text-default-400 text-xs whitespace-nowrap">
                                {log.updated_date ? new Date(log.updated_date).toLocaleString("vi-VN") : ""}
                              </div>
                              <div>
                                <p className="font-medium">{log.status}</p>
                                {log.location && <p className="text-xs text-default-500">{log.location}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Internal status history */}
                    {(trackData.status_history || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">{t("shop.order_track_internal")}</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {[...trackData.status_history].reverse().map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs border-l-2 border-default-200 dark:border-[#2e3347] pl-3">
                              <span className="text-default-400 whitespace-nowrap">{formatDate(h.at)}</span>
                              <StatusChip status={h.status} />
                              {h.note && <span className="text-default-500">{h.note}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-default-400 py-6">{t("shop.order_track_empty")}</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.close")}</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
