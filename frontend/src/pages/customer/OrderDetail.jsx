import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

const STATUS_LABEL = {
  pending:          "Chờ xác nhận",
  confirmed:        "Đang xử lý",
  processing:       "Đang xử lý",
  shipping:         "Đang giao",
  delivered:        "Hoàn thành",
  canceled:         "Đã hủy",
  refund_pending:   "Chờ hoàn/đổi",
  refund_completed: "Đã hoàn/đổi",
};

const STATUS_COLOR = {
  pending: "warning", confirmed: "primary", processing: "primary",
  shipping: "secondary", delivered: "success", canceled: "default",
  refund_pending: "warning", refund_completed: "success",
};

export default function OrderDetail() {
  const { id } = useParams();
  const nav    = useNavigate();
  const [ord,        setOrd]        = useState(null);
  const [track,      setTrack]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [openRefund, setOpenRefund] = useState(false);
  const [reason,     setReason]     = useState("");

  // Review state — Map<product_id, reviewDoc> for edit support
  const [reviewMap, setReviewMap] = useState(new Map());
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await orderService.detail(id);
      setOrd(d);
      const t = await orderService.tracking(id).catch(() => null);
      setTrack(t);
      // Load existing reviews for this order
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

  const onReviewSuccess = () => {
    // Reload reviews for this order to refresh the map
    load();
  };

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
      <p className="text-default-400">Không tìm thấy đơn hàng.</p>
    </PageContainer>
  );

  const isDelivered = ord.status === "delivered";

  return (
    <PageContainer wide={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            as={Link} to="/orders"
            isIconOnly variant="bordered" radius="lg" size="sm"
            aria-label="Quay lại"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-black text-default-900">Đơn #{ord.order_code}</h1>
            {ord.createdAt && (
              <p className="text-sm text-default-400">
                Đặt ngày {new Date(ord.createdAt).toLocaleDateString("vi-VN")}
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
        <Card radius="xl" shadow="sm" className="mb-4 border border-default-100">
          <CardBody className="p-5">
            <h3 className="font-bold text-default-900 mb-4">Sản phẩm</h3>
            <div className="space-y-3">
              {(ord.items || []).map((it, idx) => {
                const existingReview = reviewMap.get(it.product_id);
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-default-100 flex-shrink-0">
                          {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-default-900">{it.name}</p>
                          {it.variant_text && <p className="text-xs text-default-400">{it.variant_text}</p>}
                          <p className="text-xs text-default-400">SL: {it.qty}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-default-800 whitespace-nowrap">
                          {formatCurrency(it.total || it.price * it.qty)}
                        </p>
                        {isDelivered && (
                          existingReview ? (
                            <div className="flex items-center gap-1">
                              <Chip size="sm" variant="flat" color="success" startContent={<CheckCircle2 size={12} />}>
                                Đã đánh giá
                              </Chip>
                              <Button
                                size="sm" variant="light" radius="lg" color="primary"
                                onPress={() => openReviewModal(it)}
                                className="font-medium min-w-0 px-2"
                              >
                                Sửa
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm" variant="bordered" radius="lg" color="warning"
                              startContent={<Star size={14} />}
                              onPress={() => openReviewModal(it)}
                              className="font-medium"
                            >
                              Đánh giá
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
              <span className="text-default-400 text-sm">Tổng cộng:</span>
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
              <h3 className="font-bold text-default-900">Vận chuyển</h3>
              {ord.shipping_provider && (
                <Chip size="sm" variant="flat" color="primary">{ord.shipping_provider}</Chip>
              )}
            </div>

            {/* Tracking timeline */}
            {track?.steps?.length ? (
              <div className="space-y-0">
                {track.steps.map((s, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className="flex gap-3"
                    >
                      {/* Timeline line + dot */}
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
                      {/* Step content */}
                      <div className={`pb-4 flex-1 ${idx === track.steps.length - 1 ? "pb-0" : ""}`}>
                        <p className={`text-sm font-semibold ${isFirst ? "text-primary" : "text-default-700"}`}>
                          {s.text}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.code && <Chip size="sm" variant="flat" className="text-xs">{s.code}</Chip>}
                          <span className="text-xs text-default-400">{new Date(s.at).toLocaleString("vi-VN")}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-default-400 py-2">
                <Package size={16} /> Chưa có thông tin vận chuyển.
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
        {["pending", "confirmed", "processing"].includes(ord.status) && (
          <Button
            color="danger" variant="bordered" radius="lg" size="sm"
            onPress={async () => {
              if (!confirm("Hủy đơn hàng này?")) return;
              await orderService.cancel(id);
              await load();
            }}
          >
            Hủy đơn
          </Button>
        )}
        {ord.status === "delivered" && (
          <Button variant="bordered" radius="lg" size="sm" onPress={() => setOpenRefund(true)}>
            Yêu cầu hoàn/đổi
          </Button>
        )}
        <Button
          color="primary" radius="lg" size="sm"
          startContent={<RefreshCw size={14} />}
          onPress={async () => { await orderService.reorder(id); nav("/cart"); }}
          className="font-medium"
        >
          Mua lại
        </Button>
      </motion.div>

      {/* Refund modal */}
      <Modal isOpen={openRefund} onOpenChange={setOpenRefund} radius="2xl" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="font-black text-default-900">Yêu cầu hoàn/đổi</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500 mb-3">Yêu cầu trong 3 ngày kể từ khi giao thành công.</p>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nêu rõ lý do hoàn/đổi hàng…"
                  className="w-full border border-default-300 rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary resize-none transition-colors"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Đóng</Button>
                <Button
                  color="primary" radius="lg"
                  isDisabled={!reason.trim()}
                  onPress={async () => {
                    await orderService.refund(id, { reason });
                    onClose();
                    await load();
                  }}
                >
                  Gửi yêu cầu
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
