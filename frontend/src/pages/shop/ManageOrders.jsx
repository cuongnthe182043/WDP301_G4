import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Pagination, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Spinner, Textarea, Divider, Tooltip,
} from "@heroui/react";
import {
  Search, Eye, CheckCircle, XCircle, Truck, Package,
  MapPin, Phone, User, CreditCard, Clock, RefreshCw,
} from "lucide-react";
import { shopOrderApi } from "../../services/shopManagementService";
import { useToast } from "../../components/common/ToastProvider";

// ─────────────────────────────────────────────────────────────────────────────
// Status config — shared constant
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  order_created:         { label: "Chờ xác nhận",     color: "warning",   group: "pending" },
  payment_pending:       { label: "Chờ thanh toán",    color: "warning",   group: "pending" },
  payment_failed:        { label: "TT thất bại",       color: "danger",    group: "pending" },
  payment_confirmed:     { label: "Đã thanh toán",     color: "primary",   group: "processing" },
  processing:            { label: "Đang xử lý",        color: "primary",   group: "processing" },
  packed:                { label: "Đã đóng gói",       color: "primary",   group: "processing" },
  picking:               { label: "Đang lấy hàng",     color: "secondary", group: "shipping" },
  in_transit:            { label: "Đang vận chuyển",   color: "secondary", group: "shipping" },
  out_for_delivery:      { label: "Đang giao hàng",    color: "secondary", group: "shipping" },
  delivered:             { label: "Hoàn thành",        color: "success",   group: "done" },
  delivery_failed:       { label: "Giao thất bại",     color: "danger",    group: "shipping" },
  cancelled_by_customer: { label: "KH đã hủy",        color: "default",   group: "cancelled" },
  cancelled_by_shop:     { label: "Shop đã hủy",      color: "default",   group: "cancelled" },
  return_requested:      { label: "Yêu cầu hoàn",     color: "warning",   group: "return" },
  return_approved:       { label: "Đã duyệt hoàn",    color: "primary",   group: "return" },
  return_rejected:       { label: "Từ chối hoàn",     color: "danger",    group: "return" },
  refund_pending:        { label: "Đang hoàn tiền",    color: "warning",   group: "return" },
  refund_completed:      { label: "Đã hoàn tiền",     color: "success",   group: "done" },
  // legacy
  pending:               { label: "Chờ xác nhận",     color: "warning",   group: "pending" },
  confirmed:             { label: "Đã xác nhận",      color: "primary",   group: "processing" },
  shipping:              { label: "Đang giao",        color: "secondary", group: "shipping" },
  canceled_by_customer:  { label: "KH đã hủy",       color: "default",   group: "cancelled" },
  canceled_by_shop:      { label: "Shop đã hủy",     color: "default",   group: "cancelled" },
};

// Status tab groups
const STATUS_TABS = [
  { key: "",                                                                              label: "Tất cả" },
  { key: "order_created,payment_pending,pending",                                        label: "Chờ xác nhận" },
  { key: "payment_confirmed,processing,packed,confirmed",                                label: "Đang xử lý" },
  { key: "picking,in_transit,out_for_delivery,shipping",                                 label: "Vận chuyển" },
  { key: "delivered",                                                                    label: "Hoàn thành" },
  { key: "cancelled_by_customer,cancelled_by_shop,canceled_by_customer,canceled_by_shop", label: "Đã hủy" },
  { key: "return_requested,return_approved,return_rejected,refund_pending,refund_completed", label: "Hoàn đổi" },
];

// Helper functions
const formatVND  = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
const formatDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "-";

function StatusChip({ status, size = "sm" }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "default" };
  return <Chip size={size} color={cfg.color} variant="flat">{cfg.label}</Chip>;
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
  { status: "order_created",     label: "Đặt hàng" },
  { status: "confirmed",         label: "Xác nhận" },
  { status: "processing",        label: "Xử lý" },
  { status: "packed",            label: "Đóng gói" },
  { status: "picking",           label: "Lấy hàng" },
  { status: "in_transit",        label: "Vận chuyển" },
  { status: "out_for_delivery",  label: "Đang giao" },
  { status: "delivered",         label: "Hoàn thành" },
];

const STEP_ORDER = TIMELINE_STEPS.map((s) => s.status);

function StatusTimeline({ status }) {
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
              <span className={`text-[10px] text-center leading-tight ${done ? "text-default-700 font-medium" : "text-default-400"}`}>
                {step.label}
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
  const LIMIT = 15;

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

  // Tracking modal
  const [trackData, setTrackData]   = useState(null);
  const [trackOpen, setTrackOpen]   = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // ── Load orders ──────────────────────────────────────────────────────────
  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (activeTab) params.status = activeTab;
      if (searchTerm) params.q = searchTerm;
      const res = await shopOrderApi.getAll(params);
      setOrders(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTotalPages(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Lỗi tải đơn hàng");
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
      toast.error(e?.response?.data?.message || "Lỗi tải chi tiết");
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
      toast.success("Đã xác nhận đơn hàng");
      load(page);
      if (detailOpen && detail?._id === id) {
        const res = await shopOrderApi.getById(id);
        setDetail(res.data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Lỗi xác nhận đơn");
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
      toast.error("Vui lòng nhập lý do hủy đơn");
      return;
    }
    setCancelLoading(true);
    try {
      await shopOrderApi.cancel(cancelTarget.id, cancelReason.trim());
      toast.success("Đã hủy đơn hàng");
      setCancelTarget(null);
      setCancelReason("");
      load(page);
      if (detailOpen && detail?._id === cancelTarget.id) setDetailOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Lỗi hủy đơn");
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Update status (packed ↔ processing) ──────────────────────────────────
  const handleUpdateStatus = async (id, status) => {
    setActionLoading(true);
    try {
      await shopOrderApi.updateStatus(id, status);
      toast.success("Đã cập nhật trạng thái");
      load(page);
      if (detailOpen && detail?._id === id) {
        const res = await shopOrderApi.getById(id);
        setDetail(res.data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Lỗi cập nhật trạng thái");
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
      toast.success(`Đã gửi GHN thành công! Mã vận đơn: ${res.data?.ghn_order_code || ""}`);
      setGhnTarget(null);
      load(page);
      if (detailOpen && detail?._id === ghnTarget._id) {
        const r = await shopOrderApi.getById(ghnTarget._id);
        setDetail(r.data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Lỗi gửi GHN");
    } finally {
      setGhnLoading(false);
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
      toast.error("Lỗi tải thông tin vận chuyển");
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
          <h1 className="text-xl font-black text-default-900">Quản lý đơn hàng</h1>
          <p className="text-sm text-default-400">Tổng {total} đơn</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input size="sm" placeholder="Tìm mã đơn..." value={searchInput}
            onValueChange={setSearchInput} radius="lg" className="w-48"
            startContent={<Search size={14} />} />
          <Button size="sm" type="submit" variant="bordered" radius="lg">Tìm</Button>
          <Button size="sm" variant="light" radius="lg" isIconOnly
            onPress={() => load(page)} title="Làm mới">
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
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : orders.length === 0 ? (
            <p className="text-center py-12 text-default-400">Không có đơn hàng nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Mã đơn", "Khách hàng", "Sản phẩm", "Tổng tiền", "Thanh toán", "Trạng thái", "GHN", "Ngày đặt", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-default-50 transition-colors">
                    {/* Order code */}
                    <td className="px-4 py-3 font-bold text-default-900 font-mono text-xs whitespace-nowrap">
                      {o.order_code}
                    </td>
                    {/* Customer */}
                    <td className="px-4 py-3 text-default-600 text-xs max-w-[120px] truncate">
                      {o.customer?.name || o.shipping_address?.name || "—"}
                    </td>
                    {/* Item count */}
                    <td className="px-4 py-3 text-default-500 text-xs">
                      {(o.items || []).length} sp
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
                          {o.payment_status === "paid" ? "Đã TT" : o.payment_status === "failed" ? "Thất bại" : "Chờ TT"}
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
                        <Tooltip content="Chi tiết">
                          <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(o._id)}>
                            <Eye size={14} />
                          </Button>
                        </Tooltip>

                        {CONFIRMABLE.has(o.status) && (
                          <Tooltip content="Xác nhận đơn">
                            <Button isIconOnly size="sm" variant="light" color="primary"
                              onPress={() => handleConfirm(o._id)} isDisabled={actionLoading}>
                              <CheckCircle size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {START_PROCESSING.has(o.status) && (
                          <Tooltip content="Bắt đầu xử lý">
                            <Button isIconOnly size="sm" variant="light" color="primary"
                              onPress={() => handleUpdateStatus(o._id, "processing")} isDisabled={actionLoading}>
                              <Package size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {GHN_PUSHABLE.has(o.status) && !o.ghn_order_code && (
                          <Tooltip content="Gửi GHN">
                            <Button isIconOnly size="sm" variant="light" color="secondary"
                              onPress={() => openGhnModal(o)} isDisabled={actionLoading}>
                              <Truck size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {IN_SHIPPING.has(o.status) && o.ghn_order_code && (
                          <Tooltip content="Tracking">
                            <Button isIconOnly size="sm" variant="light" color="secondary"
                              onPress={() => openTrackModal(o._id)}>
                              <MapPin size={14} />
                            </Button>
                          </Tooltip>
                        )}

                        {CANCELLABLE.has(o.status) && (
                          <Tooltip content="Hủy đơn">
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
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={detailOpen} onOpenChange={(o) => !o && setDetailOpen(false)}
        radius="xl" size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Package size={18} />
                Đơn hàng #{detail?.order_code}
              </ModalHeader>
              <ModalBody className="space-y-4 pb-4">
                {detailLoading || !detail ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : (
                  <>
                    {/* Status timeline */}
                    <div>
                      <p className="text-xs font-semibold text-default-500 uppercase mb-2">Trạng thái</p>
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
                          <span>Ngày đặt:</span>
                          <span className="text-default-700 font-medium">{formatDate(detail.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-default-500">
                          <CreditCard size={13} />
                          <span>Thanh toán:</span>
                          <span className="text-default-700 font-medium">{detail.payment_method}</span>
                          <Chip size="sm" color={detail.payment_status === "paid" ? "success" : "warning"} variant="flat">
                            {detail.payment_status === "paid" ? "Đã TT" : "Chờ TT"}
                          </Chip>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {detail.expected_delivery && (
                          <div className="flex items-center gap-2 text-default-500">
                            <Truck size={13} />
                            <span>Dự kiến giao:</span>
                            <span className="text-default-700 font-medium">{formatDate(detail.expected_delivery)}</span>
                          </div>
                        )}
                        {detail.cancel_reason && (
                          <div className="text-xs text-danger bg-danger-50 rounded-lg p-2">
                            Lý do hủy: {detail.cancel_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <Divider />

                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-default-500 uppercase mb-2">Sản phẩm ({(detail.items || []).length})</p>
                      <div className="space-y-2">
                        {(detail.items || []).map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-sm border border-default-100 rounded-xl p-3 gap-3">
                            {item.image_url && (
                              <img src={item.image_url} alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-default-400 text-xs">x{item.qty} · {formatVND(item.price)}/cái</p>
                            </div>
                            <p className="font-semibold whitespace-nowrap">{formatVND(item.total || item.price * item.qty)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border border-default-100 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between text-sm text-default-600">
                        <span>Phí vận chuyển:</span>
                        <span>{formatVND(detail.shipping_fee)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Tổng cộng:</span>
                        <span className="text-primary">{formatVND(detail.total_price)}</span>
                      </div>
                    </div>

                    {/* Shipping address */}
                    {detail.shipping_address && (
                      <div className="text-sm border border-default-100 rounded-xl p-3">
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">Địa chỉ giao hàng</p>
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
                      <div className="text-sm border border-default-100 rounded-xl p-3">
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">Khách hàng</p>
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-default-400" />
                          <span className="font-medium">{detail.customer.name}</span>
                          <span className="text-default-400">{detail.customer.email}</span>
                        </div>
                      </div>
                    )}

                    {/* GHN tracking preview */}
                    {detail.ghn_detail && (
                      <div className="text-sm border border-default-100 rounded-xl p-3">
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">
                          Vận chuyển GHN — {detail.ghn_detail.status}
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

                    {/* Status history */}
                    {(detail.status_history || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">Lịch sử trạng thái</p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {[...detail.status_history].reverse().map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs border-l-2 border-default-200 pl-3">
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
                        <CheckCircle size={14} /> Xác nhận đơn
                      </Button>
                    )}
                    {detail.status === "confirmed" && (
                      <Button size="sm" color="primary" variant="bordered" radius="lg" isDisabled={actionLoading}
                        onPress={() => handleUpdateStatus(detail._id, "processing")}>
                        <Package size={14} /> Bắt đầu xử lý
                      </Button>
                    )}
                    {detail.status === "processing" && (
                      <Button size="sm" color="primary" variant="bordered" radius="lg" isDisabled={actionLoading}
                        onPress={() => handleUpdateStatus(detail._id, "packed")}>
                        <Package size={14} /> Đánh dấu đã đóng gói
                      </Button>
                    )}
                    {detail.status === "packed" && (
                      <Button size="sm" color="primary" variant="bordered" radius="lg" isDisabled={actionLoading}
                        onPress={() => handleUpdateStatus(detail._id, "processing")}>
                        Quay lại Đang xử lý
                      </Button>
                    )}
                    {GHN_PUSHABLE.has(detail.status) && !detail.ghn_order_code && (
                      <Button size="sm" color="secondary" radius="lg" isDisabled={actionLoading}
                        onPress={() => { onClose(); openGhnModal(detail); }}>
                        <Truck size={14} /> Gửi GHN
                      </Button>
                    )}
                    {IN_SHIPPING.has(detail.status) && detail.ghn_order_code && (
                      <Button size="sm" color="secondary" variant="bordered" radius="lg"
                        onPress={() => { onClose(); openTrackModal(detail._id); }}>
                        <MapPin size={14} /> Tracking
                      </Button>
                    )}
                    {CANCELLABLE.has(detail.status) && (
                      <Button size="sm" color="danger" variant="bordered" radius="lg" isDisabled={actionLoading}
                        onPress={() => { onClose(); openCancelModal(detail); }}>
                        <XCircle size={14} /> Hủy đơn
                      </Button>
                    )}
                  </div>
                  <Button variant="light" onPress={onClose}>Đóng</Button>
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
              <ModalHeader>Hủy đơn hàng #{cancelTarget?.orderCode}</ModalHeader>
              <ModalBody>
                <Textarea label="Lý do hủy *" placeholder="Nhập lý do hủy đơn (bắt buộc)..."
                  value={cancelReason} onValueChange={setCancelReason} radius="lg" minRows={3}
                  isRequired />
                <p className="text-xs text-default-400">
                  Đơn hàng sẽ bị hủy. Nếu đã gửi GHN, hệ thống sẽ tự động hủy vận đơn.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Không</Button>
                <Button color="danger" isLoading={cancelLoading}
                  isDisabled={!cancelReason.trim()}
                  onPress={handleCancel}>
                  Xác nhận hủy
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
                <Truck size={18} /> Xác nhận gửi GHN
              </ModalHeader>
              <ModalBody className="space-y-3">
                <p className="text-sm text-default-700">
                  Bạn sắp tạo vận đơn GHN cho đơn hàng{" "}
                  <span className="font-bold font-mono">{ghnTarget?.order_code}</span>.
                </p>
                {ghnTarget && (
                  <div className="border border-default-100 rounded-xl p-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-default-500">Khách hàng:</span>
                      <span className="font-medium">{ghnTarget.shipping_address?.name || ghnTarget.customer?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">Địa chỉ:</span>
                      <span className="font-medium text-right max-w-[200px]">
                        {[ghnTarget.shipping_address?.ward, ghnTarget.shipping_address?.district, ghnTarget.shipping_address?.city].filter(Boolean).join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">Phương thức TT:</span>
                      <span className="font-medium">{ghnTarget.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">{ghnTarget.payment_method === "COD" ? "Thu hộ (COD):" : "Giá trị:"}</span>
                      <span className="font-bold text-primary">{formatVND(ghnTarget.total_price)}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-warning-600 bg-warning-50 rounded-lg p-2">
                  Sau khi gửi GHN, bạn sẽ không thể hủy đơn trực tiếp mà cần liên hệ GHN.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Hủy bỏ</Button>
                <Button color="secondary" isLoading={ghnLoading} onPress={handlePushGhn}>
                  <Truck size={14} /> Xác nhận gửi GHN
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
                <MapPin size={18} /> Theo dõi vận chuyển
              </ModalHeader>
              <ModalBody>
                {trackLoading ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : trackData ? (
                  <div className="space-y-4">
                    {trackData.ghn_order_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-default-500">Mã GHN:</span>
                        <Chip color="secondary" variant="flat">{trackData.ghn_order_code}</Chip>
                        {trackData.ghn_status && <StatusChip status={trackData.ghn_status} />}
                      </div>
                    )}
                    {trackData.expected_delivery && (
                      <p className="text-sm">
                        <span className="text-default-500">Dự kiến giao: </span>
                        <span className="font-medium">{formatDate(trackData.expected_delivery)}</span>
                      </p>
                    )}

                    {/* GHN logs */}
                    {(trackData.tracking_logs || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">Nhật ký vận chuyển</p>
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
                        <p className="text-xs font-semibold text-default-500 uppercase mb-2">Lịch sử nội bộ</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {[...trackData.status_history].reverse().map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs border-l-2 border-default-200 pl-3">
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
                  <p className="text-center text-default-400 py-6">Không có thông tin vận chuyển</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Đóng</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
