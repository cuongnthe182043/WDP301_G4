import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { orderService } from "../../services/orderService";
import chatService from "../../services/chatService";
import { useAuth } from "../../context/AuthContext";
import {
  Avatar, Tabs, Tab, Button, Chip, Pagination, Input,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea,
} from "@heroui/react";
import {
  Printer, RefreshCw, Receipt, Search, XCircle, PackageCheck,
  RotateCcw, Wallet, AlertCircle, MessageCircle, Eye,
  ShoppingBag, Package, Clock, CheckCircle2, Truck,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { useTranslation } from "react-i18next";
import { useToast } from "../../components/common/ToastProvider";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  order_created:        "warning",
  payment_pending:      "warning",
  payment_failed:       "danger",
  payment_confirmed:    "primary",
  pending:              "warning",
  confirmed:            "primary",
  processing:           "primary",
  packed:               "secondary",
  picking:              "secondary",
  in_transit:           "secondary",
  out_for_delivery:     "secondary",
  shipping:             "secondary",
  delivered:            "success",
  return_requested:     "warning",
  return_approved:      "primary",
  return_rejected:      "danger",
  return_completed:     "success",
  refund_pending:       "warning",
  refund_completed:     "success",
  cancelled_by_customer:"default",
  cancelled_by_shop:    "default",
  canceled_by_customer: "default",
  canceled_by_shop:     "default",
};

// Accent colour (hex) for the top status stripe on each card
const STATUS_HEX = {
  order_created: "#f59e0b",    payment_pending: "#f59e0b",
  payment_failed: "#ef4444",   payment_confirmed: "#6366f1",
  pending: "#f59e0b",          confirmed: "#6366f1",
  processing: "#8b5cf6",       packed: "#a855f7",
  picking: "#8b5cf6",          in_transit: "#3b82f6",
  out_for_delivery: "#0ea5e9", shipping: "#0ea5e9",
  delivered: "#22c55e",
  return_requested: "#f59e0b", return_approved: "#3b82f6",
  return_rejected: "#ef4444",  return_completed: "#14b8a6",
  refund_pending: "#f59e0b",   refund_completed: "#14b8a6",
  cancelled_by_customer: "#9ca3af", cancelled_by_shop: "#9ca3af",
  canceled_by_customer: "#9ca3af",  canceled_by_shop: "#9ca3af",
};

const STATUS_LABEL = {
  order_created:        "Đã đặt hàng",
  payment_pending:      "Chờ thanh toán",
  payment_failed:       "Thanh toán thất bại",
  payment_confirmed:    "Đã thanh toán",
  pending:              "Chờ xác nhận",
  confirmed:            "Đã xác nhận",
  processing:           "Đang xử lý",
  packed:               "Đã đóng gói",
  picking:              "Đang lấy hàng",
  in_transit:           "Đang vận chuyển",
  out_for_delivery:     "Đang giao",
  shipping:             "Đang giao hàng",
  delivered:            "Đã giao",
  return_requested:     "Yêu cầu trả hàng",
  return_approved:      "Chấp nhận trả hàng",
  return_rejected:      "Từ chối trả hàng",
  return_completed:     "Hoàn trả xong",
  refund_pending:       "Chờ hoàn tiền",
  refund_completed:     "Hoàn tiền xong",
  cancelled_by_customer:"Đã hủy",
  cancelled_by_shop:    "Shop đã hủy",
  canceled_by_customer: "Đã hủy",
  canceled_by_shop:     "Shop đã hủy",
};

// Status icon helper
const StatusIcon = ({ status }) => {
  if (status?.includes("cancel") || status?.includes("failed")) return <XCircle size={12} />;
  if (status === "delivered" || status?.includes("completed")) return <CheckCircle2 size={12} />;
  if (status?.includes("transit") || status?.includes("delivery") || status === "shipping" || status === "picking") return <Truck size={12} />;
  if (status?.includes("return") || status?.includes("refund")) return <RotateCcw size={12} />;
  return <Clock size={12} />;
};

const PAYMENT_METHOD_LABEL = { COD: "COD", WALLET: "Ví", VNPAY: "VNPay", PAYPAL: "PayPal" };
const PAYMENT_METHOD_COLOR = { COD: "default", WALLET: "secondary", VNPAY: "primary", PAYPAL: "success" };
const PAYMENT_STATUS_COLOR = { pending: "warning", paid: "success", failed: "danger", refunded: "secondary" };
const PAYMENT_STATUS_LABEL = { pending: "Chưa TT", paid: "Đã TT", failed: "TT thất bại", refunded: "Đã hoàn" };

// ─── Tab definitions ──────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "",                                                                    label: "Tất cả",        icon: <ShoppingBag size={14} /> },
  { key: "order_created,payment_pending,payment_confirmed,pending",            label: "Chờ xác nhận",  icon: <Clock size={14} /> },
  { key: "confirmed,processing,packed,payment_failed",                         label: "Đang xử lý",    icon: <Package size={14} /> },
  { key: "picking,in_transit,out_for_delivery,shipping",                       label: "Đang giao",     icon: <Truck size={14} /> },
  { key: "delivered",                                                           label: "Đã giao",       icon: <CheckCircle2 size={14} /> },
  { key: "return_requested,return_approved,return_rejected,return_completed",  label: "Hoàn/Đổi",      icon: <RotateCcw size={14} /> },
  { key: "cancelled_by_customer,cancelled_by_shop,canceled_by_customer,canceled_by_shop", label: "Đã hủy", icon: <XCircle size={14} /> },
  { key: "refund_completed",                                                    label: "Hoàn tiền",     icon: <Wallet size={14} /> },
];

const CUSTOMER_CANCELLABLE = new Set([
  "order_created", "payment_pending", "payment_failed", "payment_confirmed",
  "confirmed", "processing", "pending",
]);
const PREPAID_METHODS = new Set(["PAYPAL", "VNPAY", "WALLET"]);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Orders() {
  const nav  = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const [tab, setTab]   = useState("");
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [q, setQ]       = useState("");
  const [loading, setLoading] = useState(false);

  // Cancel modal
  const [cancelModal, setCancelModal]   = useState({ open: false, order: null });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling]     = useState(false);

  // Reorder
  const [reorderLoading, setReorderLoading] = useState(null);

  // Chat
  const [chatLoading, setChatLoading] = useState(null); // orderId

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const status = tab || undefined;
      const res = await orderService.list({ status, page, limit: 10, q: q || undefined });
      setData(res);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [tab, q]);

  useEffect(() => { load(1); }, [tab]);

  const openCancelModal = (order) => { setCancelModal({ open: true, order }); setCancelReason(""); };
  const closeCancelModal = () => { if (cancelling) return; setCancelModal({ open: false, order: null }); setCancelReason(""); };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error("Vui lòng nhập lý do hủy"); return; }
    setCancelling(true);
    try {
      const result = await orderService.cancel(cancelModal.order._id, cancelReason.trim());
      const walletMsg = result?.wallet_credited ? ` Đã hoàn ${formatCurrency(result.wallet_credited)} vào ví.` : "";
      toast.success(`Đã hủy đơn hàng.${walletMsg}`);
      closeCancelModal();
      await load(data.page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể hủy đơn hàng");
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = async (orderId) => {
    setReorderLoading(orderId);
    try {
      await orderService.reorder(orderId);
      toast.success("Đã thêm lại vào giỏ hàng");
      nav("/cart");
    } catch { toast.error("Không thể đặt lại đơn hàng"); }
    finally { setReorderLoading(null); }
  };

  const handleInvoice = async (orderId) => {
    try {
      const { url } = await orderService.invoice(orderId);
      window.open(url, "_blank");
    } catch { toast.error("Không thể tải hóa đơn"); }
  };

  const handleChatShop = async (o) => {
    if (!isAuthenticated) { nav("/login"); return; }
    const shopId = o?.shop_info?._id || o?.shop_id;
    if (!shopId) return toast.error("Đơn hàng này không có thông tin shop");
    setChatLoading(o._id);
    try {
      const context = {
        type: "order",
        data: {
          _id:         o._id,
          order_code:  o.order_code,
          total_price: o.total_price,
          status:      o.status,
          items:       (o.items || []).slice(0, 3).map(it => ({
            name: it.name, qty: it.qty, image_url: it.image_url,
          })),
        },
      };
      const conv = await chatService.startConversation(shopId, context);
      window.dispatchEvent(new CustomEvent("openChat", { detail: { conversation: conv, context } }));
    } catch { toast.error("Không thể mở chat với shop"); }
    finally { setChatLoading(null); }
  };

  const isPrepaid    = (o) => PREPAID_METHODS.has((o.payment_method || "").toUpperCase());
  const isCancellable= (o) => CUSTOMER_CANCELLABLE.has(o.status);

  return (
    <PageContainer wide={false}>

      {/* ── Page hero header ──────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-6 p-6 bg-gradient-to-br from-primary via-violet-500 to-indigo-600 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black">Đơn hàng của tôi</h1>
            <p className="text-white/70 text-sm mt-0.5">Theo dõi và quản lý tất cả đơn hàng</p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
            <ShoppingBag size={18} />
            <span className="font-bold text-lg">{data.total || 0}</span>
            <span className="text-white/70 text-sm">đơn hàng</span>
          </div>
        </div>
      </div>

      {/* ── Filter row ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 mb-5 items-start md:items-center">
        <Tabs
          selectedKey={tab}
          onSelectionChange={(k) => setTab(k)}
          variant="underlined"
          color="primary"
          classNames={{
            tabList: "gap-1 overflow-x-auto",
            tab: "text-sm whitespace-nowrap",
            cursor: "bg-primary",
          }}
          className="flex-1"
        >
          {STATUS_TABS.map((s) => (
            <Tab key={s.key} title={
              <div className="flex items-center gap-1.5">
                {s.icon}
                <span>{s.label}</span>
              </div>
            } />
          ))}
        </Tabs>
        <div className="flex gap-2 flex-shrink-0">
          <Input
            size="sm"
            placeholder="Mã đơn hàng…"
            value={q}
            onValueChange={setQ}
            radius="lg"
            startContent={<Search size={13} className="text-default-400" />}
            onKeyDown={(e) => { if (e.key === "Enter") load(1); }}
            className="w-44"
            classNames={{ inputWrapper: "border border-default-200" }}
          />
          <Button size="sm" color="primary" variant="flat" radius="lg" onPress={() => load(1)} className="font-medium">
            Tìm kiếm
          </Button>
        </div>
      </div>

      {/* ── Order list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-default-100 dark:bg-zinc-700 animate-pulse" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Chưa có đơn hàng nào"
          description="Hãy mua sắm để thấy đơn hàng ở đây"
          actionLabel="Mua sắm ngay"
          onAction={() => nav("/")}
        />
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {data.items.map((o, idx) => {
              const accentColor = STATUS_HEX[o.status] || "#9ca3af";
              const hasShop = o.shop_id || o.shop_info;

              return (
                <motion.div
                  key={o._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.22 }}
                >
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-default-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">

                    {/* Top accent stripe */}
                    <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)` }} />

                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-default-50/60 dark:bg-zinc-800/60 border-b border-default-100 dark:border-zinc-700/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Order code */}
                        <button
                          className="font-black text-default-900 dark:text-zinc-100 hover:text-primary transition-colors text-sm"
                          onClick={() => nav(`/orders/${o._id}`)}
                        >
                          #{o.order_code}
                        </button>

                        {/* Status */}
                        <Chip
                          size="sm"
                          color={STATUS_COLOR[o.status] || "default"}
                          variant="flat"
                          className="font-semibold text-xs"
                          startContent={<StatusIcon status={o.status} />}
                        >
                          {STATUS_LABEL[o.status] || o.status}
                        </Chip>

                        {/* Payment method */}
                        {o.payment_method && (
                          <Chip size="sm" color={PAYMENT_METHOD_COLOR[o.payment_method?.toUpperCase()] || "default"} variant="bordered" className="text-xs">
                            {PAYMENT_METHOD_LABEL[o.payment_method?.toUpperCase()] || o.payment_method}
                          </Chip>
                        )}
                      </div>

                      {/* Right: shop + date */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {o.shop_info && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            <Avatar
                              src={o.shop_info.shop_logo}
                              name={o.shop_info.shop_name?.charAt(0) || "S"}
                              size="sm"
                              className="w-5 h-5 text-[10px]"
                            />
                            <span className="text-xs text-default-500 dark:text-zinc-400 max-w-[100px] truncate">
                              {o.shop_info.shop_name}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-default-400 dark:text-zinc-500">
                          {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    {/* Products row */}
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Stacked thumbnails */}
                        <div className="flex -space-x-2.5 flex-shrink-0">
                          {(o.items || []).slice(0, 4).map((it, i) => (
                            <div
                              key={i}
                              className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white dark:border-zinc-900 bg-default-100 dark:bg-zinc-700 shadow-sm"
                            >
                              {it.image_url
                                ? <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><PackageCheck size={16} className="text-default-300" /></div>
                              }
                            </div>
                          ))}
                          {(o.items?.length || 0) > 4 && (
                            <div className="w-12 h-12 rounded-xl bg-default-100 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs font-bold text-default-500 shadow-sm">
                              +{o.items.length - 4}
                            </div>
                          )}
                        </div>

                        {/* First item name & count */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-default-800 dark:text-zinc-200 truncate leading-snug">
                            {o.items?.[0]?.name || "Sản phẩm"}
                          </p>
                          <p className="text-xs text-default-400 dark:text-zinc-500 mt-0.5">
                            {(o.items?.length || 0)} sản phẩm
                            {o.items?.[0]?.variant_text && <span className="ml-1">· {o.items[0].variant_text}</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-default-100 dark:border-zinc-700/60 bg-default-50/30 dark:bg-zinc-800/30">
                      {/* Left: special notes */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(o.status === "cancelled_by_shop" || o.status === "canceled_by_shop") && o.cancel_reason && (
                          <span className="text-xs text-default-400 flex items-center gap-1">
                            <AlertCircle size={11} /> {o.cancel_reason}
                          </span>
                        )}
                        {o.payment_status === "refunded" && isPrepaid(o) && (
                          <span className="text-xs text-secondary-600 flex items-center gap-1">
                            <RotateCcw size={11} /> {formatCurrency(o.total_price)} đã hoàn ví
                          </span>
                        )}
                        {/* Total price */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-default-400">Tổng:</span>
                          <span
                            className="font-black text-base"
                            style={{ background: `linear-gradient(135deg, #6366f1, #a855f7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                          >
                            {formatCurrency(Number(o.total_price))}
                          </span>
                        </div>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex gap-2 flex-wrap items-center">
                        {/* Chat with shop */}
                        {hasShop && (
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            radius="lg"
                            startContent={<MessageCircle size={13} />}
                            isLoading={chatLoading === o._id}
                            onPress={() => handleChatShop(o)}
                            className="font-semibold"
                          >
                            Chat shop
                          </Button>
                        )}

                        {/* Cancel */}
                        {isCancellable(o) && (
                          <Button
                            size="sm" color="danger" variant="light" radius="lg"
                            startContent={<XCircle size={13} />}
                            onPress={() => openCancelModal(o)}
                          >
                            Hủy
                          </Button>
                        )}

                        {/* Reorder */}
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<RefreshCw size={13} />}
                          isLoading={reorderLoading === o._id}
                          onPress={() => handleReorder(o._id)}
                          className="font-medium"
                        >
                          Mua lại
                        </Button>

                        {/* Invoice */}
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Printer size={13} />}
                          onPress={() => handleInvoice(o._id)}
                          className="font-medium"
                        >
                          Hóa đơn
                        </Button>

                        {/* Detail */}
                        <Button
                          size="sm" color="primary" variant="solid" radius="lg"
                          startContent={<Eye size={13} />}
                          onPress={() => nav(`/orders/${o._id}`)}
                          className="font-semibold"
                        >
                          Chi tiết
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
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

      {/* ── Cancel modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={cancelModal.open} onClose={closeCancelModal} radius="xl" size="md" backdrop="blur">
        <ModalContent>
          <ModalHeader className="pb-1 font-bold">
            Hủy đơn #{cancelModal.order?.order_code}
          </ModalHeader>
          <ModalBody className="gap-4">
            {cancelModal.order && isPrepaid(cancelModal.order) ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300">
                <Wallet size={16} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Đơn đã thanh toán qua <strong>{cancelModal.order.payment_method}</strong>. Khi hủy,{" "}
                  <strong>{formatCurrency(cancelModal.order.total_price)}</strong> sẽ được hoàn vào ví ngay lập tức.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-default-50 dark:bg-zinc-800">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-default-400" />
                <span className="text-sm text-default-600 dark:text-zinc-400">Đơn COD — hủy đơn không ảnh hưởng đến thanh toán.</span>
              </div>
            )}
            <Textarea
              label="Lý do hủy đơn"
              placeholder="Nhập lý do hủy đơn…"
              value={cancelReason}
              onValueChange={setCancelReason}
              minRows={3}
              maxRows={6}
              isRequired
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" radius="lg" onPress={closeCancelModal} isDisabled={cancelling}>
              Quay lại
            </Button>
            <Button color="danger" radius="lg" onPress={handleCancel} isLoading={cancelling} isDisabled={!cancelReason.trim()}>
              Xác nhận hủy
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
