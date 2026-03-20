import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { orderService } from "../../services/orderService";
import {
  Card, CardBody, Tabs, Tab, Button, Chip, Divider, Pagination, Input,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea,
} from "@heroui/react";
import {
  Truck, Printer, RefreshCw, Receipt, Search, XCircle, PackageCheck,
  RotateCcw, Wallet, AlertCircle,
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

const PAYMENT_METHOD_LABEL = {
  COD:    "COD",
  WALLET: "Ví",
  VNPAY:  "VNPay",
  PAYPAL: "PayPal",
};
const PAYMENT_METHOD_COLOR = {
  COD:    "default",
  WALLET: "secondary",
  VNPAY:  "primary",
  PAYPAL: "success",
};

const PAYMENT_STATUS_COLOR = {
  pending:  "warning",
  paid:     "success",
  failed:   "danger",
  refunded: "secondary",
};
const PAYMENT_STATUS_LABEL = {
  pending:  "Chưa TT",
  paid:     "Đã TT",
  failed:   "TT thất bại",
  refunded: "Đã hoàn",
};

// ─── Tab definitions ──────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "",                                                                    label: "Tất cả" },
  { key: "order_created,payment_pending,payment_confirmed,pending",            label: "Chờ xác nhận" },
  { key: "confirmed,processing,packed,payment_failed",                         label: "Đang xử lý" },
  { key: "picking,in_transit,out_for_delivery,shipping",                       label: "Đang giao" },
  { key: "delivered",                                                           label: "Đã giao" },
  { key: "return_requested,return_approved,return_rejected,return_completed",  label: "Hoàn/Đổi" },
  { key: "cancelled_by_customer,cancelled_by_shop,canceled_by_customer,canceled_by_shop", label: "Đã hủy" },
  { key: "refund_completed",                                                    label: "Hoàn tiền" },
];

const CUSTOMER_CANCELLABLE = new Set([
  "order_created", "payment_pending", "payment_failed", "payment_confirmed",
  "confirmed", "processing", "pending",
]);

const PREPAID_METHODS = new Set(["PAYPAL", "VNPAY", "WALLET"]);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Orders() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [tab, setTab] = useState("");
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({ open: false, order: null });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Reorder loading
  const [reorderLoading, setReorderLoading] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const status = tab || undefined;
      const res = await orderService.list({ status, page, limit: 10, q: q || undefined });
      setData(res);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => { load(1); }, [tab]);

  const openCancelModal = (order) => {
    setCancelModal({ open: true, order });
    setCancelReason("");
  };
  const closeCancelModal = () => {
    if (cancelling) return;
    setCancelModal({ open: false, order: null });
    setCancelReason("");
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy");
      return;
    }
    setCancelling(true);
    try {
      const result = await orderService.cancel(cancelModal.order._id, cancelReason.trim());
      const walletMsg = result?.wallet_credited
        ? ` Đã hoàn ${formatCurrency(result.wallet_credited)} vào ví.`
        : "";
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
    } catch {
      toast.error("Không thể đặt lại đơn hàng");
    } finally {
      setReorderLoading(null);
    }
  };

  const handleInvoice = async (orderId) => {
    try {
      const { url } = await orderService.invoice(orderId);
      window.open(url, "_blank");
    } catch {
      toast.error("Không thể tải hóa đơn");
    }
  };

  const isPrepaid = (order) => PREPAID_METHODS.has((order.payment_method || "").toUpperCase());
  const isCancellable = (order) => CUSTOMER_CANCELLABLE.has(order.status);

  return (
    <PageContainer wide={false}>
      <h1 className="text-2xl font-black text-default-900 dark:text-zinc-100 mb-6">
        Đơn hàng của tôi
      </h1>

      {/* Filter row */}
      <div className="flex flex-col md:flex-row gap-3 mb-5 items-start md:items-center">
        <Tabs
          selectedKey={tab}
          onSelectionChange={(k) => setTab(k)}
          variant="underlined"
          classNames={{ tabList: "gap-1 overflow-x-auto", tab: "text-sm whitespace-nowrap" }}
          className="flex-1"
        >
          {STATUS_TABS.map((s) => <Tab key={s.key} title={s.label} />)}
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
          />
          <Button size="sm" variant="bordered" radius="lg" onPress={() => load(1)} className="font-medium">
            Tìm kiếm
          </Button>
        </div>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-default-100 dark:bg-zinc-700 animate-pulse" />
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
          <div className="space-y-4">
            {data.items.map((o, idx) => (
              <motion.div
                key={o._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
              >
                <Card radius="xl" shadow="sm" className="border border-default-100 dark:border-zinc-700 dark:bg-zinc-900">
                  <CardBody className="p-5">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-black text-default-900 dark:text-zinc-100 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => nav(`/orders/${o._id}`)}
                        >
                          #{o.order_code}
                        </span>

                        {/* Order status */}
                        <Chip size="sm" color={STATUS_COLOR[o.status] || "default"} variant="flat" className="font-semibold">
                          {STATUS_LABEL[o.status] || o.status}
                        </Chip>

                        {/* Payment method */}
                        {o.payment_method && (
                          <Chip
                            size="sm"
                            color={PAYMENT_METHOD_COLOR[o.payment_method?.toUpperCase()] || "default"}
                            variant="bordered"
                            className="text-xs"
                          >
                            {PAYMENT_METHOD_LABEL[o.payment_method?.toUpperCase()] || o.payment_method}
                          </Chip>
                        )}

                        {/* Payment status */}
                        {o.payment_status && (
                          <Chip
                            size="sm"
                            color={PAYMENT_STATUS_COLOR[o.payment_status] || "default"}
                            variant="dot"
                            className="text-xs"
                          >
                            {PAYMENT_STATUS_LABEL[o.payment_status] || o.payment_status}
                          </Chip>
                        )}

                        {/* Refunded badge */}
                        {o.payment_status === "refunded" && (
                          <Chip size="sm" color="secondary" variant="flat" startContent={<Wallet size={11} />} className="text-xs font-semibold">
                            Đã hoàn ví
                          </Chip>
                        )}

                        <span className="text-xs text-default-400 dark:text-zinc-500">
                          {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Truck size={13} />}
                          onPress={() => nav(`/orders/${o._id}`)}
                          className="font-medium"
                        >
                          Chi tiết
                        </Button>
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Printer size={13} />}
                          onPress={() => handleInvoice(o._id)}
                          className="font-medium"
                        >
                          Hóa đơn
                        </Button>
                        <Button
                          size="sm" color="primary" radius="lg" variant="flat"
                          startContent={<RefreshCw size={13} />}
                          isLoading={reorderLoading === o._id}
                          onPress={() => handleReorder(o._id)}
                          className="font-medium"
                        >
                          Mua lại
                        </Button>
                      </div>
                    </div>

                    <Divider className="mb-3" />

                    {/* Items preview */}
                    <div className="space-y-2.5">
                      {(o.items || []).slice(0, 3).map((it, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-default-100 dark:bg-zinc-700 flex-shrink-0">
                              {it.image_url
                                ? <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-default-300"><PackageCheck size={20} /></div>
                              }
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-default-900 dark:text-zinc-100 line-clamp-1">{it.name}</p>
                              {it.variant_text && (
                                <p className="text-xs text-default-400 dark:text-zinc-500">{it.variant_text}</p>
                              )}
                              <p className="text-xs text-default-400 dark:text-zinc-500">x{it.qty}</p>
                            </div>
                          </div>
                          <p className="font-bold text-sm text-default-800 dark:text-zinc-200 whitespace-nowrap">
                            {formatCurrency(it.total ?? (it.price * it.qty))}
                          </p>
                        </div>
                      ))}
                      {(o.items?.length || 0) > 3 && (
                        <p className="text-xs text-default-400 dark:text-zinc-500 text-center pt-1">
                          +{o.items.length - 3} sản phẩm khác
                        </p>
                      )}
                    </div>

                    {/* Footer row */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-default-100 dark:border-zinc-700">
                      <div className="flex gap-2 flex-wrap items-center">
                        {/* Cancel button */}
                        {isCancellable(o) && (
                          <Button
                            size="sm" color="danger" variant="bordered" radius="lg"
                            startContent={<XCircle size={13} />}
                            onPress={() => openCancelModal(o)}
                          >
                            Hủy đơn
                          </Button>
                        )}

                        {/* Cancelled reason hint */}
                        {(o.status === "cancelled_by_shop" || o.status === "canceled_by_shop") && o.cancel_reason && (
                          <span className="text-xs text-default-400 dark:text-zinc-500 flex items-center gap-1">
                            <AlertCircle size={11} /> Shop: {o.cancel_reason}
                          </span>
                        )}

                        {/* Refund note */}
                        {o.payment_status === "refunded" && isPrepaid(o) && (
                          <span className="text-xs text-secondary-600 dark:text-secondary-400 flex items-center gap-1">
                            <RotateCcw size={11} />
                            {formatCurrency(o.total_price)} đã hoàn vào ví
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-default-400 dark:text-zinc-500">Tổng:</span>
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

      {/* Cancel modal */}
      <Modal isOpen={cancelModal.open} onClose={closeCancelModal} radius="xl" size="md">
        <ModalContent>
          <ModalHeader className="pb-1">Hủy đơn hàng #{cancelModal.order?.order_code}</ModalHeader>
          <ModalBody className="gap-4">
            {cancelModal.order && isPrepaid(cancelModal.order) ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300">
                <Wallet size={16} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Đơn đã thanh toán qua <strong>{cancelModal.order.payment_method}</strong>. Khi hủy, <strong>{formatCurrency(cancelModal.order.total_price)}</strong> sẽ được hoàn vào ví của bạn ngay lập tức.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-default-50 dark:bg-zinc-800 text-default-600 dark:text-zinc-400">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Đơn COD — hủy đơn không ảnh hưởng đến thanh toán.
                </span>
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
            <Button
              color="danger"
              radius="lg"
              onPress={handleCancel}
              isLoading={cancelling}
              isDisabled={!cancelReason.trim()}
            >
              Xác nhận hủy
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
