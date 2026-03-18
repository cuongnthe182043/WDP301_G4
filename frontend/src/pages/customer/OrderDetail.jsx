import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { orderService } from "../../services/orderService";
import { reviewService } from "../../services/reviewService";
import {
  Card, CardBody, Button, Chip, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Skeleton,
} from "@heroui/react";
import { Truck, RefreshCw, ArrowLeft, CheckCircle2, Circle, Package, Star } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import PageContainer from "../../components/ui/PageContainer.jsx";
import ReviewModal from "../../components/common/ReviewModal.jsx";

const STATUS_COLOR = {
  order_created: "warning",    pending: "warning",
  payment_pending: "warning",  payment_confirmed: "success",
  payment_failed: "danger",
  confirmed: "primary",        processing: "primary",
  packed: "primary",           picking: "secondary",
  in_transit: "secondary",     out_for_delivery: "secondary",
  shipping: "secondary",       delivered: "success",
  delivery_failed: "danger",
  cancelled_by_customer: "default", cancelled_by_shop: "default",
  canceled_by_customer: "default",  canceled_by_shop: "default",
  canceled: "default",
  return_requested: "warning",  return_approved: "primary",
  return_rejected: "danger",    refund_pending: "warning",
  refund_completed: "success",
};

export default function OrderDetail() {
  const { id } = useParams();
  const nav    = useNavigate();
  const { t }  = useTranslation();

  const STATUS_LABEL = {
    order_created:         t("order.status_order_created"),
    pending:               t("order.status_order_created"),
    payment_pending:       t("order.status_payment_pending"),
    payment_confirmed:     t("order.status_payment_confirmed"),
    payment_failed:        t("order.status_payment_failed"),
    confirmed:             t("order.status_payment_confirmed"),
    processing:            t("order.status_processing"),
    packed:                t("order.status_packed"),
    picking:               t("order.status_picking"),
    in_transit:            t("order.status_in_transit"),
    out_for_delivery:      t("order.status_out_for_delivery"),
    shipping:              t("order.status_out_for_delivery"),
    delivered:             t("order.status_delivered_full"),
    delivery_failed:       t("order.status_delivery_failed"),
    cancelled_by_customer: t("order.status_cancelled_customer"),
    cancelled_by_shop:     t("order.status_cancelled_shop"),
    canceled_by_customer:  t("order.status_cancelled_customer"),
    canceled_by_shop:      t("order.status_cancelled_shop"),
    canceled:              t("order.status_cancelled_customer"),
    return_requested:      t("order.status_return_requested"),
    return_approved:       t("order.status_return_approved"),
    return_rejected:       t("order.status_return_rejected"),
    refund_pending:        t("order.status_refund_pending_full"),
    refund_completed:      t("order.status_refund_completed"),
  };

  const [ord,        setOrd]        = useState(null);
  const [track,      setTrack]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [openRefund,  setOpenRefund]  = useState(false);
  const [reason,      setReason]      = useState("");
  const [refundType,  setRefundType]  = useState("refund");

  const [reviewMap, setReviewMap] = useState(new Map());
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await orderService.detail(id);
      setOrd(d);
      const tr = await orderService.tracking(id).catch(() => null);
      setTrack(tr);
      if (d?.status === "delivered") {
        try {
          const rvData = await reviewService.getByOrder(id);
          const list = rvData.reviews || rvData || [];
          const map = new Map();
          list.forEach((r) => map.set(r.product_id, r));
          setReviewMap(map);
        } catch {}
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const openReviewModal = (item) => {
    setReviewItem(item);
    setReviewOpen(true);
  };

  const onReviewSuccess = () => { load(); };

  if (loading) return (
    <PageContainer wide={false}>
      <Skeleton className="h-8 w-48 rounded-xl mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
      </div>
    </PageContainer>
  );

  if (!ord) return (
    <PageContainer wide={false}>
      <p className="text-default-400">{t("order.empty")}</p>
    </PageContainer>
  );

  const isDelivered = ord.status === "delivered";

  const REFUND_TYPES = [
    { key: "refund",   label: t("order.refund_money"),  desc: t("order.refund_money_desc") },
    { key: "return",   label: t("order.return_goods"),  desc: t("order.return_goods_desc") },
    { key: "exchange", label: t("order.exchange"),      desc: t("order.exchange_desc") },
  ];

  return (
    <PageContainer wide={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            as={Link} to="/orders"
            isIconOnly variant="bordered" radius="lg" size="sm"
            aria-label={t("common.back")}
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-black text-default-900 dark:text-zinc-100">{t("order.order_code")} #{ord.order_code}</h1>
            {ord.createdAt && (
              <p className="text-sm text-default-400 dark:text-zinc-500">
                {t("order.placed_on")} {new Date(ord.createdAt).toLocaleDateString("vi-VN")}
              </p>
            )}
          </div>
        </div>
        <Chip
          color={STATUS_COLOR[ord.status] || "default"}
          variant="flat"
          size="md"
          className="font-bold"
        >
          {STATUS_LABEL[ord.status] || ord.status}
        </Chip>
      </div>

      {/* Products */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card radius="xl" shadow="sm" className="mb-4 border border-default-100 dark:border-zinc-700 dark:bg-zinc-900">
          <CardBody className="p-5">
            <h3 className="font-bold text-default-900 dark:text-zinc-100 mb-4">{t("order.products_section")}</h3>
            <div className="space-y-3">
              {(ord.items || []).map((it, idx) => {
                const existingReview = reviewMap.get(it.product_id);
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-default-100 dark:bg-zinc-700 flex-shrink-0">
                          {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-default-900 dark:text-zinc-100">{it.name}</p>
                          {it.variant_text && <p className="text-xs text-default-400 dark:text-zinc-500">{it.variant_text}</p>}
                          <p className="text-xs text-default-400 dark:text-zinc-500">{t("order.qty_short")} {it.qty}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-default-800 dark:text-zinc-200 whitespace-nowrap">
                          {formatCurrency(it.total || it.price * it.qty)}
                        </p>
                        {isDelivered && (
                          existingReview ? (
                            <div className="flex items-center gap-1">
                              <Chip size="sm" variant="flat" color="success" startContent={<CheckCircle2 size={12} />}>
                                {t("order.reviewed")}
                              </Chip>
                              <Button
                                size="sm" variant="light" radius="lg" color="primary"
                                onPress={() => openReviewModal(it)}
                                className="font-medium min-w-0 px-2"
                              >
                                {t("order.edit_review")}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm" variant="bordered" radius="lg" color="warning"
                              startContent={<Star size={14} />}
                              onPress={() => openReviewModal(it)}
                              className="font-medium"
                            >
                              {t("order.write_review")}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Divider className="my-4" />
            <div className="flex justify-end items-center gap-2">
              <span className="text-default-400 dark:text-zinc-500 text-sm">{t("order.total_label")}</span>
              <span className="font-black text-primary text-lg">{formatCurrency(Number(ord.total_price))}</span>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Shipping & tracking */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card radius="xl" shadow="sm" className="mb-4 border border-default-100">
          <CardBody className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-primary" />
              <h3 className="font-bold text-default-900">{t("order.shipping_section")}</h3>
              {ord.shipping_provider && (
                <Chip size="sm" variant="flat" color="primary">{ord.shipping_provider}</Chip>
              )}
            </div>

            {(track?.ghn_order_code || track?.expected_delivery) && (
              <div className="flex flex-wrap gap-3 mb-4 text-sm">
                {track.ghn_order_code && (
                  <div className="flex items-center gap-2">
                    <span className="text-default-400">{t("order.tracking_code")}</span>
                    <Chip size="sm" color="secondary" variant="flat">{track.ghn_order_code}</Chip>
                  </div>
                )}
                {track.expected_delivery && (
                  <div className="flex items-center gap-2">
                    <span className="text-default-400">{t("order.expected_delivery")}</span>
                    <span className="font-medium text-default-700">
                      {new Date(track.expected_delivery).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {track?.steps?.length ? (
              <div className="space-y-0">
                {[...track.steps].reverse().map((s, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex gap-3"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isFirst ? "bg-primary text-white" : "bg-default-100 text-default-400"
                        }`}>
                          {isFirst ? <CheckCircle2 size={14} /> : <Circle size={12} />}
                        </div>
                        {idx < track.steps.length - 1 && (
                          <div className="w-px flex-1 bg-default-200 my-1 min-h-[24px]" />
                        )}
                      </div>
                      <div className={`pb-4 flex-1 ${idx === track.steps.length - 1 ? "pb-0" : ""}`}>
                        <p className={`text-sm font-semibold ${isFirst ? "text-primary" : "text-default-600"}`}>
                          {s.text}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-default-400">
                            {s.at ? new Date(s.at).toLocaleString("vi-VN") : ""}
                          </span>
                          {s.note && <span className="text-xs text-default-400">· {s.note}</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-default-400 py-2">
                <Package size={16} /> {t("order.no_shipping_info")}
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 flex-wrap"
      >
        {["order_created", "pending", "payment_pending", "confirmed", "processing"].includes(ord.status) && (
          <Button
            color="danger" variant="bordered" radius="lg" size="sm"
            onPress={async () => {
              if (!confirm(t("order.cancel_confirm"))) return;
              await orderService.cancel(id);
              await load();
            }}
          >
            {t("order.cancel")}
          </Button>
        )}
        {ord.status === "delivered" && (
          <Button variant="bordered" radius="lg" size="sm" onPress={() => { setRefundType("refund"); setReason(""); setOpenRefund(true); }}>
            {t("order.refund_return")}
          </Button>
        )}
        {ord.status === "return_rejected" && (
          <Button variant="bordered" radius="lg" size="sm" color="warning"
            onPress={() => { setRefundType("refund"); setReason(""); setOpenRefund(true); }}>
            {t("order.resubmit")}
          </Button>
        )}
        <Button
          color="primary" radius="lg" size="sm"
          startContent={<RefreshCw size={14} />}
          onPress={async () => { await orderService.reorder(id); nav("/cart"); }}
          className="font-medium"
        >
          {t("order.reorder")}
        </Button>
      </motion.div>

      {/* Refund / Return / Exchange modal */}
      <Modal isOpen={openRefund} onOpenChange={setOpenRefund} radius="2xl" backdrop="blur" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="font-black text-default-900">{t("order.refund_modal_title")}</ModalHeader>
              <ModalBody className="space-y-4">
                <p className="text-xs text-default-400">{t("order.refund_deadline")}</p>

                <div>
                  <p className="text-sm font-semibold text-default-700 mb-2">{t("order.refund_type")}</p>
                  <div className="flex gap-2 flex-wrap">
                    {REFUND_TYPES.map((rt) => (
                      <button
                        key={rt.key}
                        type="button"
                        onClick={() => setRefundType(rt.key)}
                        className={`flex-1 min-w-[100px] rounded-xl border-2 px-3 py-2 text-left transition-all ${
                          refundType === rt.key
                            ? "border-primary bg-primary/5"
                            : "border-default-200 hover:border-default-300"
                        }`}
                      >
                        <p className={`text-sm font-bold ${refundType === rt.key ? "text-primary" : "text-default-700"}`}>{rt.label}</p>
                        <p className="text-xs text-default-400">{rt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-default-700 mb-2">{t("common.reason")}</p>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("common.reason") + "…"}
                    className="w-full border border-default-300 rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary resize-none transition-colors"
                  />
                </div>

                {refundType === "return" && (
                  <p className="text-xs text-warning-600 bg-warning-50 rounded-xl px-3 py-2">
                    {t("order.return_note")}
                  </p>
                )}
                {refundType === "exchange" && (
                  <p className="text-xs text-primary-600 bg-primary-50 rounded-xl px-3 py-2">
                    {t("order.exchange_note")}
                  </p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>{t("common.close")}</Button>
                <Button
                  color="primary" radius="lg"
                  isDisabled={!reason.trim()}
                  onPress={async () => {
                    await orderService.refund(id, { reason, type: refundType });
                    onClose();
                    await load();
                  }}
                >
                  {t("order.send_request")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Review modal */}
      <ReviewModal
        isOpen={reviewOpen}
        onOpenChange={setReviewOpen}
        item={reviewItem}
        orderId={id}
        existingReview={reviewItem ? reviewMap.get(reviewItem.product_id) : undefined}
        onSuccess={onReviewSuccess}
      />
    </PageContainer>
  );
}
