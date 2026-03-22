import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { orderService } from "../../services/orderService";
import { reviewService } from "../../services/reviewService";
import { productService } from "../../services/productService";
import chatService from "../../services/chatService";
import { useAuth } from "../../context/AuthContext";
import {
  Card, CardBody, Button, Chip, Divider,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Skeleton, Textarea, Input, Progress,
} from "@heroui/react";
import {
  ArrowLeft, Truck, RefreshCw, CheckCircle2, Circle,
  Package, Star, FileText, AlertTriangle, Wallet,
  MapPin, Phone, CreditCard, Calendar, MessageSquare,
  Download, RotateCcw, ShoppingBag, XCircle, ChevronDown, ChevronUp,
  Store, Tag, Layers, BarChart2, Info, ExternalLink, BadgeCheck, MessageCircle,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import PageContainer from "../../components/ui/PageContainer.jsx";
import ReviewModal from "../../components/common/ReviewModal.jsx";
import { useToast } from "../../components/common/ToastProvider";

// ─── Status maps ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  order_created: "warning",       pending: "warning",
  payment_pending: "warning",     payment_confirmed: "success",
  payment_failed: "danger",
  confirmed: "primary",           processing: "primary",
  packed: "primary",              picking: "secondary",
  in_transit: "secondary",        out_for_delivery: "secondary",
  shipping: "secondary",          delivered: "success",
  delivery_failed: "danger",
  cancelled_by_customer: "default", cancelled_by_shop: "default",
  canceled_by_customer: "default",  canceled_by_shop: "default",
  canceled: "default",
  return_requested: "warning",    return_approved: "primary",
  return_rejected: "danger",      refund_pending: "warning",
  refund_completed: "success",
};

// Timeline steps for visual progress
const PROGRESS_STEPS = [
  { key: "order_created",    icon: <ShoppingBag size={14} /> },
  { key: "confirmed",        icon: <CheckCircle2 size={14} /> },
  { key: "processing",       icon: <Package size={14} /> },
  { key: "picking",          icon: <Truck size={14} /> },
  { key: "in_transit",       icon: <Truck size={14} /> },
  { key: "out_for_delivery", icon: <MapPin size={14} /> },
  { key: "delivered",        icon: <CheckCircle2 size={14} /> },
];
const STEP_RANK = Object.fromEntries(PROGRESS_STEPS.map((s, i) => [s.key, i]));

// Statuses customer can cancel from
const CANCELLABLE = new Set([
  "order_created", "payment_pending", "payment_failed",
  "payment_confirmed", "confirmed", "processing", "pending",
]);

// Statuses for refund/return
const REFUND_ALLOWED = new Set(["delivered", "return_rejected"]);

// PAYMENT method labels/colors
const PAYMENT_COLOR = { COD: "default", PAYPAL: "primary", VNPAY: "secondary", WALLET: "success" };
const PAY_STATUS_COLOR = { paid: "success", pending: "warning", failed: "danger", refunded: "secondary" };

export default function OrderDetail() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const { t }   = useTranslation();
  const toast   = useToast();
  const { isAuthenticated } = useAuth();

  const STATUS_LABEL = {
    order_created: "Đặt hàng thành công",          pending: "Đặt hàng thành công",
    payment_pending: "Chờ thanh toán",             payment_confirmed: "Đã thanh toán",
    payment_failed: "Thanh toán thất bại",         confirmed: "Shop đã xác nhận",
    processing: "Đang chuẩn bị hàng",             packed: "Đã đóng gói",
    picking: "Shipper đang lấy hàng",             in_transit: "Đang vận chuyển",
    out_for_delivery: "Đang giao đến bạn",         shipping: "Đang giao",
    delivered: "Giao hàng thành công",             delivery_failed: "Giao thất bại",
    cancelled_by_customer: "Khách đã hủy",         cancelled_by_shop: "Shop đã hủy",
    canceled_by_customer: "Khách đã hủy",          canceled_by_shop: "Shop đã hủy",
    return_requested: "Yêu cầu hoàn/đổi",          return_approved: "Đã duyệt hoàn/đổi",
    return_rejected: "Từ chối hoàn/đổi",           refund_pending: "Đang xử lý hoàn tiền",
    refund_completed: "Hoàn tiền hoàn tất",
  };

  // ── State ────────────────────────────────────────────────────────────────
  const [ord,         setOrd]         = useState(null);
  const [track,       setTrack]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [reviewMap,   setReviewMap]   = useState(new Map());
  const [refundInfo,  setRefundInfo]  = useState(null); // existing refund for this order
  const [showHistory, setShowHistory] = useState(false);

  // Modals
  const [cancelOpen,      setCancelOpen]      = useState(false);
  const [cancelReason,    setCancelReason]    = useState("");
  const [cancelLoading,   setCancelLoading]   = useState(false);

  const [refundOpen,      setRefundOpen]      = useState(false);
  const [refundType,      setRefundType]      = useState("refund");
  const [refundReason,    setRefundReason]    = useState("");
  const [refundImages,    setRefundImages]    = useState([]); // File[]
  const [refundLoading,   setRefundLoading]   = useState(false);

  const [ticketOpen,      setTicketOpen]      = useState(false);
  const [ticketSubject,   setTicketSubject]   = useState("");
  const [ticketMessage,   setTicketMessage]   = useState("");
  const [ticketLoading,   setTicketLoading]   = useState(false);

  const [reviewItem,   setReviewItem]   = useState(null);
  const [reviewOpen,   setReviewOpen]   = useState(false);
  const [actionLoad,   setActionLoad]   = useState(false);

  // product details map: product_id → { product, variants, brand, category }
  const [productMap,   setProductMap]   = useState(new Map());
  // which item indexes have their details panel open
  const [detailOpen,   setDetailOpen]   = useState(new Set());

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, tr] = await Promise.all([
        orderService.detail(id),
        orderService.tracking(id).catch(() => null),
      ]);
      setOrd(d);
      setTrack(tr);

      if (d?.status === "delivered" || d?.status?.startsWith("return") || d?.status?.startsWith("refund")) {
        try {
          const rvData = await reviewService.getByOrder(id);
          const list = rvData.reviews || rvData || [];
          const map = new Map();
          list.forEach(r => map.set(r.product_id, r));
          setReviewMap(map);
        } catch {}
      }

      // Load existing refund request for this order
      try {
        const allRefunds = await orderService.getMyRefunds();
        const found = allRefunds.find(r => r.order_id === d?._id || r.order_id === id);
        setRefundInfo(found || null);
      } catch {}

      // Fetch live product details for each unique product in the order (non-blocking)
      if (d?.items?.length) {
        const uniqueIds = [...new Set(d.items.map(i => i.product_id).filter(Boolean))];
        const results = await Promise.allSettled(
          uniqueIds.map(pid => productService.getDetail(pid))
        );
        const map = new Map();
        results.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value) {
            map.set(uniqueIds[i], r.value);
          }
        });
        setProductMap(map);
      }
    } catch {
      toast.error("Không thể tải thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [id]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error("Vui lòng nhập lý do hủy"); return; }
    setCancelLoading(true);
    try {
      const res = await orderService.cancel(id, cancelReason.trim());
      const credited = res?.wallet_credited;
      toast.success(credited
        ? `Đã hủy đơn. ${formatCurrency(credited)} hoàn vào ví của bạn.`
        : "Đã hủy đơn hàng thành công."
      );
      setCancelOpen(false);
      setCancelReason("");
      await load();
    } catch (e) {
      toast.error(e?.message || "Không thể hủy đơn");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundReason.trim()) { toast.error("Vui lòng nhập lý do"); return; }
    setRefundLoading(true);
    try {
      let imageUrls = [];
      if (refundImages.length > 0) {
        try {
          const uploaded = await reviewService.uploadImages(refundImages);
          imageUrls = uploaded.map(u => u.url || u);
        } catch { /* proceed without images */ }
      }
      await orderService.refund(id, { reason: refundReason.trim(), type: refundType, images: imageUrls });
      toast.success("Đã gửi yêu cầu hoàn/đổi thành công");
      setRefundOpen(false);
      setRefundReason("");
      setRefundImages([]);
      await load();
    } catch (e) {
      toast.error(e?.message || "Không thể gửi yêu cầu");
    } finally {
      setRefundLoading(false);
    }
  };

  const handleTicketSubmit = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin khiếu nại");
      return;
    }
    setTicketLoading(true);
    try {
      await orderService.createTicket({
        order_id: ord._id,
        shop_id:  ord.shop_id,
        subject:  ticketSubject.trim(),
        message:  ticketMessage.trim(),
      });
      toast.success("Đã gửi khiếu nại. Chúng tôi sẽ phản hồi sớm.");
      setTicketOpen(false);
      setTicketSubject("");
      setTicketMessage("");
    } catch (e) {
      toast.error(e?.message || "Không thể gửi khiếu nại");
    } finally {
      setTicketLoading(false);
    }
  };

  const handleInvoice = async () => {
    setActionLoad(true);
    try {
      const { url } = await orderService.invoice(id);
      window.open(url, "_blank");
    } catch { toast.error("Không thể tải hóa đơn"); }
    finally { setActionLoad(false); }
  };

  const handleReorder = async () => {
    setActionLoad(true);
    try {
      await orderService.reorder(id);
      nav("/cart");
    } catch { toast.error("Không thể thêm vào giỏ"); }
    finally { setActionLoad(false); }
  };

  const toggleDetail = (idx) => {
    setDetailOpen(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const refundDeadlinePassed = () => {
    if (!ord?.updatedAt) return false;
    return (Date.now() - new Date(ord.updatedAt).getTime()) > 3 * 24 * 3600 * 1000;
  };

  const currentRank = STEP_RANK[ord?.status] ?? -1;

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) return (
    <PageContainer wide={false}>
      <Skeleton className="h-8 w-64 rounded-xl mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
      </div>
    </PageContainer>
  );

  if (!ord) return (
    <PageContainer wide={false}>
      <div className="text-center py-20 text-default-400">
        <Package size={48} className="mx-auto mb-4 opacity-30" />
        <p>Không tìm thấy đơn hàng</p>
      </div>
    </PageContainer>
  );

  const isDelivered  = ord.status === "delivered";
  const isCancelled  = ord.status.startsWith("cancel");
  const isReturning  = ord.status.startsWith("return") || ord.status.startsWith("refund");

  const subtotal = (ord.items || []).reduce((s, it) => s + (it.total || it.price * it.qty), 0);

  return (
    <PageContainer wide={false}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button as={Link} to="/orders" isIconOnly variant="bordered" radius="lg" size="sm">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-black text-default-900 dark:text-zinc-100">
              #{ord.order_code}
            </h1>
            <p className="text-xs text-default-400">
              {new Date(ord.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Chip color={PAYMENT_COLOR[ord.payment_method] || "default"} variant="bordered" size="sm">
            {ord.payment_method}
          </Chip>
          <Chip
            color={PAY_STATUS_COLOR[ord.payment_status] || "warning"}
            variant="flat" size="sm" className="font-semibold"
          >
            {ord.payment_status === "paid" ? "Đã thanh toán"
              : ord.payment_status === "refunded" ? "Đã hoàn tiền"
              : ord.payment_status === "failed" ? "Thanh toán lỗi"
              : "Chờ thanh toán"}
          </Chip>
          <Chip
            color={STATUS_COLOR[ord.status] || "default"}
            variant="flat" size="md" className="font-bold"
          >
            {STATUS_LABEL[ord.status] || ord.status}
          </Chip>
        </div>
      </div>

      {/* ── Progress bar (normal flow only) ───────────────────────────────── */}
      {!isCancelled && !isReturning && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card radius="xl" shadow="none" className="mb-4 border border-default-100 dark:border-zinc-700 dark:bg-zinc-900">
            <CardBody className="px-5 py-4">
              <div className="flex items-center gap-0">
                {PROGRESS_STEPS.map((step, i) => {
                  const done    = currentRank >= i;
                  const current = currentRank === i;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          done
                            ? current
                              ? "bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                              : "bg-success text-white"
                            : "bg-default-100 text-default-300"
                        }`}>
                          {step.icon}
                        </div>
                        <span className={`text-[9px] text-center leading-tight max-w-[52px] ${
                          done ? current ? "text-primary font-bold" : "text-success font-medium" : "text-default-300"
                        }`}>
                          {STATUS_LABEL[step.key] || step.key}
                        </span>
                      </div>
                      {i < PROGRESS_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-5 mx-1 rounded-full ${i < currentRank ? "bg-success" : "bg-default-100"}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* ── Cancelled / Return banner ──────────────────────────────────────── */}
      {(isCancelled || isReturning) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className={`rounded-xl px-4 py-3 mb-4 flex items-center gap-3 ${
            isCancelled ? "bg-default-100 dark:bg-zinc-800" : "bg-warning-50 dark:bg-warning-900/20"
          }`}>
            {isCancelled
              ? <XCircle size={18} className="text-default-500 flex-shrink-0" />
              : <RotateCcw size={18} className="text-warning flex-shrink-0" />}
            <div>
              <p className={`text-sm font-bold ${isCancelled ? "text-default-700" : "text-warning-700"}`}>
                {STATUS_LABEL[ord.status] || ord.status}
              </p>
              {ord.cancel_reason && (
                <p className="text-xs text-default-500 mt-0.5">Lý do: {ord.cancel_reason}</p>
              )}
              {ord.payment_status === "refunded" && (
                <p className="text-xs text-success font-semibold mt-0.5">
                  ✓ {formatCurrency(ord.total_price)} đã được hoàn vào ví của bạn
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Products ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card radius="xl" shadow="sm" className="mb-4 border border-default-100 dark:border-zinc-700 dark:bg-zinc-900">
          <CardBody className="p-5">
            <h3 className="font-bold text-default-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <Package size={16} className="text-default-500" />
              Sản phẩm ({(ord.items || []).length})
            </h3>

            <div className="space-y-5">
              {(ord.items || []).map((it, idx) => {
                const existingReview = reviewMap.get(it.product_id);
                const unitAfterDiscount = it.price - (it.discount || 0);
                const lineTotal = it.total ?? unitAfterDiscount * it.qty;
                const hasDiscount = Number(it.discount) > 0;

                // Item-level status chip config
                const ITEM_STATUS_COLOR = {
                  pending: "warning", confirmed: "primary", shipping: "secondary",
                  delivered: "success", returned: "default",
                };
                const ITEM_STATUS_LABEL = {
                  pending: "Chờ xử lý", confirmed: "Đã xác nhận", shipping: "Đang giao",
                  delivered: "Đã giao", returned: "Đã trả",
                };

                return (
                  <div key={idx}>
                    <div className="flex gap-3 sm:gap-4">
                      {/* Image — clickable → product page */}
                      <a
                        href={`/products/${it.product_id}`}
                        className="flex-shrink-0 block"
                        onClick={(e) => { e.preventDefault(); nav(`/products/${it.product_id}`); }}
                      >
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-default-100 dark:bg-zinc-700 border border-default-100 dark:border-zinc-600 hover:opacity-80 transition-opacity">
                          {it.image_url
                            ? <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={22} className="text-default-300" /></div>
                          }
                        </div>
                      </a>

                      {/* Info block */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        {/* Name */}
                        <p
                          className="font-semibold text-sm text-default-900 dark:text-zinc-100 line-clamp-2 cursor-pointer hover:text-primary transition-colors leading-snug"
                          onClick={() => nav(`/products/${it.product_id}`)}
                        >
                          {it.name}
                        </p>

                        {/* Variant */}
                        {it.variant_text && (
                          <span className="text-xs text-default-500 dark:text-zinc-400 bg-default-50 dark:bg-zinc-800 border border-default-100 dark:border-zinc-700 px-2 py-0.5 rounded-lg self-start">
                            {it.variant_text}
                          </span>
                        )}

                        {/* Item status chip */}
                        {it.status && it.status !== "pending" && (
                          <Chip size="sm" color={ITEM_STATUS_COLOR[it.status] || "default"} variant="dot" className="self-start text-xs">
                            {ITEM_STATUS_LABEL[it.status] || it.status}
                          </Chip>
                        )}

                        {/* Refunded qty notice */}
                        {Number(it.refunded_qty) > 0 && (
                          <span className="text-xs text-secondary-600 dark:text-secondary-400 flex items-center gap-1">
                            <RotateCcw size={11} />
                            {it.refunded_qty}/{it.qty} đã hoàn trả
                          </span>
                        )}

                        {/* Pricing row */}
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {hasDiscount ? (
                            <>
                              <span className="text-xs line-through text-default-300 dark:text-zinc-600">
                                {formatCurrency(it.price)}
                              </span>
                              <span className="text-sm font-semibold text-danger">
                                {formatCurrency(unitAfterDiscount)}
                              </span>
                              <Chip size="sm" color="danger" variant="flat" className="text-xs h-5 px-1.5">
                                -{formatCurrency(it.discount)}/sp
                              </Chip>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-default-700 dark:text-zinc-300">
                              {formatCurrency(it.price)}
                            </span>
                          )}
                          <span className="text-xs text-default-400">× {it.qty}</span>
                        </div>

                        {/* Review stars (mobile: below pricing) */}
                        {isDelivered && existingReview && (
                          <div className="flex items-center gap-0.5 sm:hidden">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} size={11} className={n <= existingReview.rating ? "text-warning fill-warning" : "text-default-200"} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right column: total + review */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0 min-w-[72px]">
                        {/* Line total */}
                        <div className="text-right">
                          <p className="font-black text-default-900 dark:text-zinc-100">
                            {formatCurrency(lineTotal)}
                          </p>
                          {hasDiscount && (
                            <p className="text-[10px] text-success leading-tight">
                              Tiết kiệm {formatCurrency(it.discount * it.qty)}
                            </p>
                          )}
                        </div>

                        {/* Review */}
                        {isDelivered && (
                          existingReview ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="hidden sm:flex items-center gap-0.5">
                                {[1,2,3,4,5].map(n => (
                                  <Star key={n} size={11} className={n <= existingReview.rating ? "text-warning fill-warning" : "text-default-200"} />
                                ))}
                              </div>
                              <Button size="sm" variant="light" color="primary" radius="lg"
                                className="text-xs h-7 px-2 min-w-0"
                                onPress={() => { setReviewItem(it); setReviewOpen(true); }}>
                                Sửa đánh giá
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="bordered" color="warning" radius="lg"
                              className="text-xs h-7 px-2"
                              startContent={<Star size={11} />}
                              onPress={() => { setReviewItem(it); setReviewOpen(true); }}>
                              Đánh giá
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    {/* ── Expandable product detail panel ── */}
                    {(() => {
                      const pd = productMap.get(it.product_id);
                      const open = detailOpen.has(idx);
                      return (
                        <div className="mt-3">
                          <button
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-600 transition-colors"
                            onClick={() => toggleDetail(idx)}
                          >
                            <Info size={12} />
                            {open ? "Ẩn thông tin sản phẩm" : "Xem thông tin sản phẩm"}
                            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {open && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 rounded-xl border border-default-100 dark:border-zinc-700 bg-default-50 dark:bg-zinc-800/60 overflow-hidden"
                            >
                              {!pd ? (
                                <div className="p-4 space-y-2">
                                  {[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full rounded-lg" />)}
                                </div>
                              ) : (
                                <div className="p-4 space-y-4 text-sm">

                                  {/* ── Shop seller ── */}
                                  {ord.shop_info && (
                                    <div className="flex items-center gap-3 pb-3 border-b border-default-100 dark:border-zinc-700">
                                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-default-100 dark:bg-zinc-700 flex-shrink-0 border border-default-100">
                                        {ord.shop_info.shop_logo
                                          ? <img src={ord.shop_info.shop_logo} alt={ord.shop_info.shop_name} className="w-full h-full object-cover" />
                                          : <div className="w-full h-full flex items-center justify-center"><Store size={16} className="text-default-300" /></div>
                                        }
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-default-900 dark:text-zinc-100 truncate flex items-center gap-1">
                                          {ord.shop_info.shop_name}
                                          <BadgeCheck size={13} className="text-primary flex-shrink-0" />
                                        </p>
                                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                          {ord.shop_info.rating_avg > 0 && (
                                            <span className="flex items-center gap-0.5 text-xs text-default-500">
                                              <Star size={11} className="text-warning fill-warning" />
                                              {Number(ord.shop_info.rating_avg).toFixed(1)}
                                            </span>
                                          )}
                                          {ord.shop_info.total_products > 0 && (
                                            <span className="text-xs text-default-400">{ord.shop_info.total_products} sản phẩm</span>
                                          )}
                                          {ord.shop_info.followers > 0 && (
                                            <span className="text-xs text-default-400">{ord.shop_info.followers} người theo dõi</span>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm" variant="bordered" radius="lg"
                                        startContent={<ExternalLink size={12} />}
                                        className="text-xs flex-shrink-0"
                                        onPress={() => nav(`/shop/${ord.shop_info.shop_slug}`)}
                                      >
                                        Xem shop
                                      </Button>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">

                                    {/* ── Category ── */}
                                    {pd.category && (
                                      <div className="flex items-start gap-2">
                                        <Tag size={13} className="text-default-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs text-default-400 mb-0.5">Danh mục</p>
                                          <span
                                            className="font-medium text-primary cursor-pointer hover:underline"
                                            onClick={() => nav(`/category/${pd.category.slug}`)}
                                          >
                                            {pd.category.name}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* ── Brand ── */}
                                    {pd.brand && (
                                      <div className="flex items-start gap-2">
                                        <BadgeCheck size={13} className="text-default-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs text-default-400 mb-0.5">Thương hiệu</p>
                                          <div className="flex items-center gap-1.5">
                                            {pd.brand.logo_url && (
                                              <img src={pd.brand.logo_url} alt={pd.brand.name} className="w-4 h-4 object-contain rounded" />
                                            )}
                                            <span className="font-medium">{pd.brand.name}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* ── Stock ── */}
                                    <div className="flex items-start gap-2">
                                      <BarChart2 size={13} className="text-default-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-default-400 mb-0.5">Tồn kho hiện tại</p>
                                        <span className={`font-medium ${pd.product.stock_total > 0 ? "text-success" : "text-danger"}`}>
                                          {pd.product.stock_total > 0 ? `${pd.product.stock_total} còn lại` : "Hết hàng"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* ── Sold count ── */}
                                    <div className="flex items-start gap-2">
                                      <ShoppingBag size={13} className="text-default-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-default-400 mb-0.5">Đã bán</p>
                                        <span className="font-medium">{pd.product.sold_count?.toLocaleString("vi-VN") || 0} đơn</span>
                                      </div>
                                    </div>

                                    {/* ── Rating ── */}
                                    {pd.product.rating_count > 0 && (
                                      <div className="flex items-start gap-2">
                                        <Star size={13} className="text-default-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs text-default-400 mb-0.5">Đánh giá</p>
                                          <div className="flex items-center gap-1.5">
                                            <div className="flex items-center gap-0.5">
                                              {[1,2,3,4,5].map(n => (
                                                <Star key={n} size={11}
                                                  className={n <= Math.round(pd.product.rating_avg) ? "text-warning fill-warning" : "text-default-200"} />
                                              ))}
                                            </div>
                                            <span className="font-medium">{Number(pd.product.rating_avg).toFixed(1)}</span>
                                            <span className="text-default-400 text-xs">({pd.product.rating_count})</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* ── Origin ── */}
                                    {pd.product.detail_info?.origin_country && (
                                      <div className="flex items-start gap-2">
                                        <MapPin size={13} className="text-default-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs text-default-400 mb-0.5">Xuất xứ</p>
                                          <span className="font-medium">{pd.product.detail_info.origin_country}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* ── Materials ── */}
                                  {pd.product.detail_info?.materials?.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <Layers size={13} className="text-default-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-default-400 mb-1">Chất liệu</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {pd.product.detail_info.materials.map((m, i) => (
                                            <Chip key={i} size="sm" variant="flat" color="default" className="text-xs">{m}</Chip>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── Product attributes (free-form) ── */}
                                  {pd.product.attributes && Object.entries(pd.product.attributes).length > 0 && (
                                    <div>
                                      <p className="text-xs text-default-400 mb-1.5 flex items-center gap-1">
                                        <Info size={11} /> Thuộc tính sản phẩm
                                      </p>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                                        {Object.entries(pd.product.attributes).map(([k, v]) => (
                                          <div key={k}>
                                            <span className="text-xs text-default-400 capitalize">{k}: </span>
                                            <span className="text-xs font-medium text-default-700 dark:text-zinc-300">{String(v)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* ── Ordered variant attributes ── */}
                                  {(() => {
                                    const orderedVariant = it.variant_id
                                      ? pd.variants?.find(v => v._id === it.variant_id)
                                      : null;
                                    if (!orderedVariant?.variant_attributes) return null;
                                    const attrs = typeof orderedVariant.variant_attributes === "object"
                                      ? Object.entries(orderedVariant.variant_attributes)
                                      : [];
                                    if (!attrs.length) return null;
                                    return (
                                      <div>
                                        <p className="text-xs text-default-400 mb-1.5 flex items-center gap-1">
                                          <Layers size={11} /> Phân loại bạn đã chọn
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {attrs.map(([k, v]) => (
                                            <Chip key={k} size="sm" color="primary" variant="flat" className="text-xs">
                                              {k}: {String(v)}
                                            </Chip>
                                          ))}
                                          {orderedVariant.sku && (
                                            <Chip size="sm" variant="bordered" className="text-xs font-mono">
                                              SKU: {orderedVariant.sku}
                                            </Chip>
                                          )}
                                          {orderedVariant.stock !== undefined && (
                                            <Chip size="sm" color={orderedVariant.stock > 0 ? "success" : "danger"} variant="flat" className="text-xs">
                                              Còn: {orderedVariant.stock}
                                            </Chip>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* ── Seasons / care ── */}
                                  {(pd.product.detail_info?.seasons?.length > 0 || pd.product.detail_info?.care_instructions) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {pd.product.detail_info.seasons?.length > 0 && (
                                        <div>
                                          <p className="text-xs text-default-400 mb-1">Mùa phù hợp</p>
                                          <div className="flex flex-wrap gap-1">
                                            {pd.product.detail_info.seasons.map(s => (
                                              <Chip key={s} size="sm" variant="flat" color="secondary" className="text-xs capitalize">{s}</Chip>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {pd.product.detail_info.care_instructions && (
                                        <div>
                                          <p className="text-xs text-default-400 mb-1">Hướng dẫn bảo quản</p>
                                          <p className="text-xs text-default-600 dark:text-zinc-400 leading-relaxed">
                                            {pd.product.detail_info.care_instructions}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* ── Tags ── */}
                                  {pd.product.tags?.length > 0 && (
                                    <div>
                                      <p className="text-xs text-default-400 mb-1">Tags</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {pd.product.tags.map(tag => (
                                          <Chip key={tag} size="sm" variant="dot" color="default" className="text-xs">{tag}</Chip>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      );
                    })()}

                    {idx < (ord.items || []).length - 1 && <Divider className="mt-4" />}
                  </div>
                );
              })}
            </div>

            {/* Price breakdown */}
            <div className="mt-5 pt-4 border-t border-default-100 dark:border-zinc-700 space-y-2">
              <div className="flex justify-between text-sm text-default-600 dark:text-zinc-400">
                <span>Tạm tính ({(ord.items || []).reduce((s, i) => s + i.qty, 0)} sản phẩm)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {(ord.items || []).some(i => Number(i.discount) > 0) && (
                <div className="flex justify-between text-sm text-danger">
                  <span>Giảm giá sản phẩm</span>
                  <span>-{formatCurrency((ord.items || []).reduce((s, i) => s + (i.discount || 0) * i.qty, 0))}</span>
                </div>
              )}
              {Number(ord.discount) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Voucher đơn hàng</span>
                  <span>-{formatCurrency(ord.discount)}</span>
                </div>
              )}
              {Number(ord.credits_used) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span className="flex items-center gap-1"><Wallet size={13} /> Xu / điểm thưởng</span>
                  <span>-{formatCurrency(ord.credits_used)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-default-600 dark:text-zinc-400">
                <span>Phí vận chuyển</span>
                <span>
                  {Number(ord.shipping_fee) > 0
                    ? formatCurrency(ord.shipping_fee)
                    : <span className="text-success font-medium">Miễn phí</span>}
                </span>
              </div>
              <Divider />
              <div className="flex justify-between items-center">
                <span className="font-bold text-default-900 dark:text-zinc-100">Tổng cộng</span>
                <span className="font-black text-primary text-xl">{formatCurrency(Number(ord.total_price))}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* ── Order Info ────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card radius="xl" shadow="sm" className="mb-4 border border-default-100 dark:border-zinc-700 dark:bg-zinc-900">
          <CardBody className="p-5">
            <h3 className="font-bold text-default-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-default-500" />
              Thông tin đơn hàng
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-default-500 flex items-center gap-1.5"><Calendar size={13} />Ngày đặt</span>
                <span className="font-medium">{new Date(ord.createdAt).toLocaleString("vi-VN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500 flex items-center gap-1.5"><CreditCard size={13} />Thanh toán</span>
                <div className="flex items-center gap-1.5">
                  <Chip size="sm" color={PAYMENT_COLOR[ord.payment_method] || "default"} variant="flat">
                    {ord.payment_method}
                  </Chip>
                  <Chip size="sm" color={PAY_STATUS_COLOR[ord.payment_status] || "warning"} variant="flat">
                    {ord.payment_status === "paid" ? "Đã thanh toán"
                      : ord.payment_status === "refunded" ? "Đã hoàn tiền"
                      : ord.payment_status === "failed" ? "Thất bại"
                      : "Chờ thanh toán"}
                  </Chip>
                </div>
              </div>
              {ord.shipping_provider && ord.shipping_provider !== "NONE" && (
                <div className="flex justify-between">
                  <span className="text-default-500 flex items-center gap-1.5"><Truck size={13} />Vận chuyển</span>
                  <Chip size="sm" color="secondary" variant="flat">{ord.shipping_provider}</Chip>
                </div>
              )}
              {ord.tracking_code && (
                <div className="flex justify-between">
                  <span className="text-default-500">Mã vận đơn</span>
                  <span className="font-mono text-xs font-bold text-secondary">{ord.tracking_code}</span>
                </div>
              )}
              {ord.expected_delivery && (
                <div className="flex justify-between">
                  <span className="text-default-500">Dự kiến giao</span>
                  <span className="font-medium text-success">{new Date(ord.expected_delivery).toLocaleDateString("vi-VN")}</span>
                </div>
              )}
              {ord.note && (
                <div className="mt-2 bg-default-50 dark:bg-zinc-800 rounded-xl p-3">
                  <p className="text-xs text-default-400 mb-1">Ghi chú đơn hàng</p>
                  <p className="text-sm text-default-700 dark:text-zinc-300">{ord.note}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* ── Shipping Address ──────────────────────────────────────────────── */}
      {ord.shipping_address && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card radius="xl" shadow="sm" className="mb-4 border border-default-100 dark:border-zinc-700 dark:bg-zinc-900">
            <CardBody className="p-5">
              <h3 className="font-bold text-default-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-default-500" />
                Địa chỉ giao hàng
              </h3>
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-default-900 dark:text-zinc-100">
                  {ord.shipping_address.name}
                </p>
                {ord.shipping_address.phone && (
                  <p className="text-default-500 flex items-center gap-1.5">
                    <Phone size={12} /> {ord.shipping_address.phone}
                  </p>
                )}
                <p className="text-default-600 dark:text-zinc-400">
                  {[
                    ord.shipping_address.street,
                    ord.shipping_address.ward,
                    ord.shipping_address.district,
                    ord.shipping_address.city,
                  ].filter(Boolean).join(", ")}
                </p>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* ── Shop info ─────────────────────────────────────────────────────── */}
      {ord.shop_info && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
          <Card radius="xl" shadow="sm" className="mb-4 border border-default-100 dark:border-zinc-700 dark:bg-zinc-900">
            <CardBody className="p-5">
              <h3 className="font-bold text-default-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <Store size={16} className="text-default-500" />
                Thông tin shop bán
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-default-100 dark:bg-zinc-700 flex-shrink-0 border border-default-100">
                  {ord.shop_info.shop_logo
                    ? <img src={ord.shop_info.shop_logo} alt={ord.shop_info.shop_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Store size={18} className="text-default-300" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-default-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {ord.shop_info.shop_name}
                    <BadgeCheck size={14} className="text-primary" />
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-default-500">
                    {ord.shop_info.rating_avg > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={11} className="text-warning fill-warning" />
                        {Number(ord.shop_info.rating_avg).toFixed(1)} sao
                      </span>
                    )}
                    {ord.shop_info.total_products > 0 && (
                      <span>{ord.shop_info.total_products} sản phẩm</span>
                    )}
                    {ord.shop_info.followers > 0 && (
                      <span>{ord.shop_info.followers} người theo dõi</span>
                    )}
                    {ord.shop_info.phone && (
                      <span className="flex items-center gap-1"><Phone size={10} />{ord.shop_info.phone}</span>
                    )}
                  </div>
                  {ord.shop_info.description && (
                    <p className="text-xs text-default-400 mt-1 line-clamp-2">{ord.shop_info.description}</p>
                  )}
                </div>
                <Button
                  size="sm" variant="bordered" radius="lg"
                  startContent={<ExternalLink size={13} />}
                  className="flex-shrink-0"
                  onPress={() => nav(`/shop/${ord.shop_info.shop_slug}`)}
                >
                  Xem shop
                </Button>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* ── Tracking ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card radius="xl" shadow="sm" className="mb-4 border border-default-100 dark:border-zinc-700 dark:bg-zinc-900">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-default-900 dark:text-zinc-100 flex items-center gap-2">
                <Truck size={16} className="text-default-500" />
                Lịch sử vận chuyển
              </h3>
              {(track?.steps?.length ?? 0) > 3 && (
                <Button size="sm" variant="light" radius="lg"
                  endContent={showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  onPress={() => setShowHistory(p => !p)}>
                  {showHistory ? "Thu gọn" : "Xem thêm"}
                </Button>
              )}
            </div>

            {track?.steps?.length ? (
              <div className="space-y-0">
                {([...track.steps].reverse())
                  .slice(0, showHistory ? undefined : 3)
                  .map((s, idx, arr) => {
                    const isFirst = idx === 0;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex gap-3"
                      >
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isFirst ? "bg-primary text-white" : "bg-default-100 dark:bg-zinc-700 text-default-400"
                          }`}>
                            {isFirst ? <CheckCircle2 size={13} /> : <Circle size={11} />}
                          </div>
                          {idx < arr.length - 1 && <div className="w-px flex-1 bg-default-200 dark:bg-zinc-700 my-1 min-h-[20px]" />}
                        </div>
                        <div className="pb-3 flex-1">
                          <p className={`text-sm font-semibold ${isFirst ? "text-primary" : "text-default-700 dark:text-zinc-300"}`}>
                            {s.text}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-default-400">
                              {s.at ? new Date(s.at).toLocaleString("vi-VN") : ""}
                            </span>
                            {s.note && <span className="text-xs text-default-400">· {s.note}</span>}
                            {s.source === "ghn" && <Chip size="sm" color="secondary" variant="flat" className="text-xs">GHN</Chip>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-default-400 py-2">
                <Package size={16} /> Chưa có thông tin vận chuyển
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* ── Refund Status (if exists) ──────────────────────────────────────── */}
      {refundInfo && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <Card radius="xl" shadow="sm" className="mb-4 border border-warning-200 bg-warning-50/40 dark:bg-warning-900/10 dark:border-warning-800">
            <CardBody className="p-5">
              <h3 className="font-bold text-default-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <RotateCcw size={16} className="text-warning" />
                Yêu cầu hoàn/đổi
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-default-500">Loại</span>
                  <Chip size="sm" color={{ refund: "secondary", return: "warning", exchange: "primary" }[refundInfo.type] || "default"} variant="flat">
                    {{ refund: "Hoàn tiền", return: "Trả hàng", exchange: "Đổi hàng" }[refundInfo.type] || refundInfo.type}
                  </Chip>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Trạng thái</span>
                  <Chip size="sm" color={{ pending: "warning", approved: "primary", rejected: "danger", completed: "success" }[refundInfo.status] || "default"} variant="flat">
                    {{ pending: "Đang chờ duyệt", approved: "Đã duyệt", rejected: "Bị từ chối", completed: "Hoàn tất" }[refundInfo.status] || refundInfo.status}
                  </Chip>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Số tiền</span>
                  <span className="font-bold text-primary">{formatCurrency(refundInfo.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Ngày yêu cầu</span>
                  <span>{new Date(refundInfo.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 mt-2">
                  <p className="text-xs text-default-400 mb-1">Lý do</p>
                  <p className="text-sm text-default-700 dark:text-zinc-300">{refundInfo.reason}</p>
                </div>
                {refundInfo.shop_note && (
                  <div className="bg-default-50 dark:bg-zinc-800 rounded-xl p-3">
                    <p className="text-xs text-default-400 mb-1">Phản hồi từ shop</p>
                    <p className="text-sm text-default-700 dark:text-zinc-300">{refundInfo.shop_note}</p>
                  </div>
                )}
                {refundInfo.status === "completed" && (
                  <div className="flex items-center gap-2 text-success text-sm font-semibold mt-1">
                    <Wallet size={14} />
                    {formatCurrency(refundInfo.amount)} đã được hoàn vào ví của bạn
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="flex gap-2 flex-wrap"
      >
        {/* Cancel */}
        {CANCELLABLE.has(ord.status) && (
          <Button color="danger" variant="bordered" radius="lg" size="sm"
            onPress={() => { setCancelReason(""); setCancelOpen(true); }}>
            <XCircle size={14} /> Hủy đơn
          </Button>
        )}

        {/* Refund/Return/Exchange */}
        {REFUND_ALLOWED.has(ord.status) && !refundInfo && !refundDeadlinePassed() && (
          <Button variant="bordered" radius="lg" size="sm"
            onPress={() => { setRefundType("refund"); setRefundReason(""); setRefundImages([]); setRefundOpen(true); }}>
            <RotateCcw size={14} /> Hoàn/Đổi hàng
          </Button>
        )}

        {/* Resubmit if rejected */}
        {ord.status === "return_rejected" && (
          <Button variant="bordered" color="warning" radius="lg" size="sm"
            onPress={() => { setRefundType("refund"); setRefundReason(""); setRefundImages([]); setRefundOpen(true); }}>
            <RotateCcw size={14} /> Gửi lại yêu cầu
          </Button>
        )}

        {/* Invoice */}
        <Button variant="bordered" radius="lg" size="sm" isLoading={actionLoad}
          onPress={handleInvoice}>
          <Download size={14} /> Hóa đơn
        </Button>

        {/* Reorder */}
        <Button color="primary" variant="flat" radius="lg" size="sm" isLoading={actionLoad}
          onPress={handleReorder}>
          <RefreshCw size={14} /> Mua lại
        </Button>

        {/* Complaint */}
        {(isDelivered || isCancelled || isReturning) && (
          <Button variant="bordered" color="warning" radius="lg" size="sm"
            onPress={() => { setTicketSubject(""); setTicketMessage(""); setTicketOpen(true); }}>
            <MessageSquare size={14} /> Khiếu nại
          </Button>
        )}
      </motion.div>

      {/* ═══════════ MODALS ═══════════ */}

      {/* ── Cancel Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={cancelOpen} onOpenChange={setCancelOpen} radius="2xl" backdrop="blur" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2 text-danger">
                <XCircle size={18} /> Hủy đơn hàng
              </ModalHeader>
              <ModalBody className="space-y-3">
                <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-3 text-sm text-danger-700 dark:text-danger-300">
                  <p className="font-semibold mb-1">Lưu ý trước khi hủy:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>Đơn hàng đã thanh toán sẽ được hoàn tiền vào ví.</li>
                    <li>Đơn COD sẽ bị hủy mà không hoàn tiền.</li>
                    <li>Sau khi hủy không thể khôi phục lại đơn.</li>
                  </ul>
                </div>
                <Textarea
                  label="Lý do hủy đơn"
                  placeholder="Nhập lý do bạn muốn hủy đơn hàng này..."
                  value={cancelReason}
                  onValueChange={setCancelReason}
                  radius="lg" minRows={3} isRequired
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Không hủy</Button>
                <Button color="danger" radius="lg"
                  isLoading={cancelLoading}
                  isDisabled={!cancelReason.trim()}
                  onPress={handleCancel}>
                  Xác nhận hủy đơn
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Refund Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={refundOpen} onOpenChange={setRefundOpen} radius="2xl" backdrop="blur" size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="font-black text-default-900">
                <RotateCcw size={18} className="mr-2 text-warning" /> Yêu cầu hoàn/đổi hàng
              </ModalHeader>
              <ModalBody className="space-y-4">
                <p className="text-xs text-default-400 bg-default-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                  Bạn có <strong>3 ngày</strong> kể từ khi nhận hàng để gửi yêu cầu.
                </p>

                {/* Type */}
                <div>
                  <p className="text-sm font-semibold text-default-700 dark:text-zinc-300 mb-2">Loại yêu cầu</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "refund",   label: "Hoàn tiền",   desc: "Trả hàng, lấy lại tiền" },
                      { key: "return",   label: "Trả hàng",    desc: "Gửi trả, không cần tiền" },
                      { key: "exchange", label: "Đổi hàng",    desc: "Đổi sản phẩm khác" },
                    ].map(rt => (
                      <button key={rt.key} type="button" onClick={() => setRefundType(rt.key)}
                        className={`rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                          refundType === rt.key
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-default-200 dark:border-zinc-600 hover:border-default-300"
                        }`}>
                        <p className={`text-sm font-bold ${refundType === rt.key ? "text-primary" : "text-default-700 dark:text-zinc-300"}`}>
                          {rt.label}
                        </p>
                        <p className="text-xs text-default-400 mt-0.5">{rt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <Textarea
                  label="Lý do"
                  placeholder={
                    refundType === "refund"   ? "Sản phẩm không đúng mô tả, bị lỗi..." :
                    refundType === "return"   ? "Sản phẩm không vừa ý, muốn trả lại..." :
                    "Muốn đổi size / màu / mẫu khác..."
                  }
                  value={refundReason}
                  onValueChange={setRefundReason}
                  radius="lg" minRows={3} isRequired
                />

                {/* Evidence images */}
                <div>
                  <p className="text-sm font-semibold text-default-700 dark:text-zinc-300 mb-2">
                    Ảnh minh chứng (tùy chọn, tối đa 5 ảnh)
                  </p>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-default-200 dark:border-zinc-600 rounded-xl py-4 cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="file" accept="image/*" multiple className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []).slice(0, 5);
                        setRefundImages(files);
                      }}
                    />
                    <AlertTriangle size={16} className="text-default-400" />
                    <span className="text-sm text-default-500">
                      {refundImages.length > 0 ? `${refundImages.length} ảnh đã chọn` : "Chọn ảnh minh chứng"}
                    </span>
                  </label>
                  {refundImages.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {refundImages.map((f, i) => (
                        <div key={i} className="relative">
                          <img src={URL.createObjectURL(f)} alt="" className="w-14 h-14 object-cover rounded-lg border border-default-200" />
                          <button
                            onClick={() => setRefundImages(prev => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white rounded-full text-xs flex items-center justify-center"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Type-specific hints */}
                {refundType === "return" && (
                  <p className="text-xs text-warning-600 bg-warning-50 dark:bg-warning-900/20 rounded-xl px-3 py-2">
                    ⚠ Bạn cần đóng gói và gửi trả hàng sau khi yêu cầu được duyệt.
                  </p>
                )}
                {refundType === "exchange" && (
                  <p className="text-xs text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-xl px-3 py-2">
                    ℹ Shop sẽ liên hệ để xác nhận sản phẩm đổi sau khi duyệt yêu cầu.
                  </p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Đóng</Button>
                <Button color="primary" radius="lg"
                  isLoading={refundLoading}
                  isDisabled={!refundReason.trim()}
                  onPress={handleRefundSubmit}>
                  Gửi yêu cầu
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Complaint / Ticket Modal ──────────────────────────────────────── */}
      <Modal isOpen={ticketOpen} onOpenChange={setTicketOpen} radius="2xl" backdrop="blur" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <MessageSquare size={18} className="text-warning" /> Gửi khiếu nại
              </ModalHeader>
              <ModalBody className="space-y-3">
                <p className="text-xs text-default-400 bg-default-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                  Khiếu nại sẽ được gửi tới bộ phận hỗ trợ. Chúng tôi sẽ phản hồi trong vòng 24h.
                </p>
                <Input
                  label="Tiêu đề khiếu nại"
                  placeholder="VD: Sản phẩm không đúng mô tả, shop không phản hồi..."
                  value={ticketSubject}
                  onValueChange={setTicketSubject}
                  radius="lg" isRequired
                />
                <Textarea
                  label="Nội dung chi tiết"
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  value={ticketMessage}
                  onValueChange={setTicketMessage}
                  radius="lg" minRows={4} isRequired
                />
                <div className="text-xs text-default-400 bg-default-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                  Đơn hàng: <span className="font-mono font-bold">#{ord.order_code}</span>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Hủy</Button>
                <Button color="warning" radius="lg"
                  isLoading={ticketLoading}
                  isDisabled={!ticketSubject.trim() || !ticketMessage.trim()}
                  onPress={handleTicketSubmit}>
                  Gửi khiếu nại
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Review Modal ──────────────────────────────────────────────────── */}
      <ReviewModal
        isOpen={reviewOpen}
        onOpenChange={setReviewOpen}
        item={reviewItem}
        orderId={id}
        existingReview={reviewItem ? reviewMap.get(reviewItem.product_id) : undefined}
        onSuccess={load}
      />
    </PageContainer>
  );
}
