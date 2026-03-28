import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card, CardBody, Button, Chip, Tabs, Tab, Textarea, Input, Modal,
  ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem,
  Divider,
} from "@heroui/react";
import {
  MessageSquare, Plus, Clock, ShoppingBag, Store, Truck, Package2,
  CreditCard, HelpCircle, Search, ChevronRight, AlertCircle,
} from "lucide-react";
import { supportService } from "../../services/supportService";
import { useToast } from "../../components/common/ToastProvider";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { useTranslation } from "react-i18next";
import apiClient from "../../services/apiClient";

const STATUS_COLOR = {
  open: "warning", in_progress: "primary", escalated: "danger", closed: "default",
};
const STATUS_LABEL = { open: "Đang mở", in_progress: "Đang xử lý", escalated: "Leo thang", closed: "Đã đóng" };
const PRIORITY_COLOR = { low: "default", medium: "warning", high: "danger" };
const PRIORITY_LABEL = { low: "Thấp", medium: "Trung bình", high: "Cao" };

const TICKET_TYPES = [
  { key: "order",    label: "Vấn đề đơn hàng",   icon: ShoppingBag,  color: "#f97316", needsOrder: true },
  { key: "shop",     label: "Khiếu nại shop",     icon: Store,        color: "#6366f1", needsOrder: false },
  { key: "delivery", label: "Vận chuyển",          icon: Truck,        color: "#0ea5e9", needsOrder: true },
  { key: "product",  label: "Sản phẩm lỗi",       icon: Package2,     color: "#10b981", needsOrder: true },
  { key: "payment",  label: "Thanh toán",          icon: CreditCard,   color: "#ec4899", needsOrder: false },
  { key: "general",  label: "Khác",                icon: HelpCircle,   color: "#64748b", needsOrder: false },
];

const TYPE_CATEGORIES = {
  order:    ["Đơn hàng bị trì hoãn", "Đơn hàng sai", "Hủy đơn hàng", "Đơn hàng chưa nhận được", "Khác"],
  shop:     ["Hàng giả / hàng nhái", "Mô tả không đúng", "Thái độ bán hàng kém", "Vi phạm chính sách", "Khác"],
  delivery: ["Giao hàng chậm", "Mất hàng", "Hàng bị hư hại", "Sai địa chỉ", "Khác"],
  product:  ["Sản phẩm lỗi", "Sai màu / size", "Chất lượng kém", "Hàng giả", "Khác"],
  payment:  ["Thanh toán bị trừ nhưng chưa xử lý", "Hoàn tiền chưa về", "Lỗi thanh toán", "Khác"],
  general:  ["Hỗ trợ tài khoản", "Góp ý / phản hồi", "Chính sách", "Khác"],
};

export default function Tickets() {
  const nav = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [tab,     setTab]     = useState("open");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orders,  setOrders]  = useState([]);

  // Form state
  const [type,     setType]     = useState("general");
  const [category, setCategory] = useState(new Set([]));
  const [orderId,  setOrderId]  = useState(new Set([]));
  const [subject,  setSubject]  = useState("");
  const [message,  setMessage]  = useState("");
  const [priority, setPriority] = useState(new Set(["medium"]));
  const [submitting, setSubmitting] = useState(false);

  const selectedType = TICKET_TYPES.find(t => t.key === type);

  const load = useCallback(async (status) => {
    setLoading(true);
    try {
      const data = await supportService.getTickets(status && status !== "all" ? { status } : {});
      setTickets(data.tickets || []);
    } catch (e) {
      toast.error(e?.message || "Có lỗi xảy ra");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(tab === "all" ? undefined : tab); }, [tab, load]);

  const handleOpen = async () => {
    // Load orders for linking
    if (orders.length === 0) {
      try {
        const r = await apiClient.get("/orders", { params: { limit: 50 } });
        setOrders(r.data?.data?.orders || r.data?.orders || []);
      } catch {}
    }
    setType("general"); setCategory(new Set([])); setOrderId(new Set([]));
    setSubject(""); setMessage(""); setPriority(new Set(["medium"]));
    onOpen();
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      return toast.error("Vui lòng điền đầy đủ tiêu đề và mô tả");
    }
    setSubmitting(true);
    try {
      await supportService.createTicket({
        type,
        category: Array.from(category)[0] || "",
        order_id: Array.from(orderId)[0] || undefined,
        subject:  subject.trim(),
        message:  message.trim(),
        priority: Array.from(priority)[0] || "medium",
      });
      toast.success("Đã gửi khiếu nại thành công");
      onClose();
      load(tab === "all" ? undefined : tab);
    } catch (e) {
      toast.error(e?.message || "Có lỗi xảy ra");
    } finally { setSubmitting(false); }
  };

  return (
    <PageContainer wide>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-7"
      >
        <div>
          <h1 className="text-2xl font-black text-default-900">Hỗ trợ & Khiếu nại</h1>
          <p className="text-sm text-default-500 mt-0.5">Gửi yêu cầu hỗ trợ hoặc khiếu nại về đơn hàng, shop</p>
        </div>
        <Button
          color="primary" radius="xl" onPress={handleOpen}
          startContent={<Plus size={16} />}
          className="font-semibold shadow-sm"
        >
          Tạo khiếu nại
        </Button>
      </motion.div>

      {/* Status Tabs */}
      <Tabs selectedKey={tab} onSelectionChange={setTab} variant="underlined" color="primary" className="mb-5">
        <Tab key="open"        title="Đang mở" />
        <Tab key="in_progress" title="Đang xử lý" />
        <Tab key="escalated"   title="Leo thang" />
        <Tab key="closed"      title="Đã đóng" />
        <Tab key="all"         title="Tất cả" />
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-default-100 animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Không có khiếu nại nào"
          description="Bạn chưa có khiếu nại nào trong mục này"
          actionLabel="Tạo khiếu nại mới"
          onAction={handleOpen}
        />
      ) : (
        <motion.div className="space-y-3"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden" animate="show"
        >
          <AnimatePresence>
            {tickets.map((tk) => {
              const typeInfo = TICKET_TYPES.find(t => t.key === tk.type);
              const TypeIcon = typeInfo?.icon || HelpCircle;
              return (
                <motion.div
                  key={tk._id}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  exit={{ opacity: 0, x: -16 }}
                >
                  <Card
                    as={Link} to={`/tickets/${tk._id}`} isPressable radius="xl" shadow="sm"
                    className="border border-default-100 hover:border-primary/30 transition-colors w-full"
                  >
                    <CardBody className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Type icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${typeInfo?.color}18`, color: typeInfo?.color }}
                        >
                          <TypeIcon size={18} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-default-900 truncate">{tk.subject}</p>
                              <p className="text-sm text-default-500 mt-0.5 line-clamp-1">{tk.message}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <Chip size="sm" color={STATUS_COLOR[tk.status]} variant="flat" className="font-semibold">
                                {STATUS_LABEL[tk.status] || tk.status}
                              </Chip>
                              <Chip size="sm" color={PRIORITY_COLOR[tk.priority]} variant="dot" className="text-xs">
                                {PRIORITY_LABEL[tk.priority] || tk.priority}
                              </Chip>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-default-400">
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(tk.createdAt).toLocaleDateString("vi-VN")}
                            </span>
                            {typeInfo && (
                              <span style={{ color: typeInfo.color }} className="font-medium">{typeInfo.label}</span>
                            )}
                            {tk.category && <span>• {tk.category}</span>}
                            {tk.replies?.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare size={11} />
                                {tk.replies.length} phản hồi
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-default-300 shrink-0 mt-1" />
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isOpen} onClose={onClose} radius="2xl" backdrop="blur" size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="font-black text-lg pb-2">Tạo khiếu nại mới</ModalHeader>
          <ModalBody className="gap-5 pb-2">
            {/* Type selector */}
            <div>
              <p className="text-sm font-semibold text-default-700 mb-3">Loại khiếu nại *</p>
              <div className="grid grid-cols-3 gap-2">
                {TICKET_TYPES.map(t => {
                  const Icon = t.icon;
                  const active = type === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => { setType(t.key); setCategory(new Set([])); setOrderId(new Set([])); }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: active ? t.color : "var(--heroui-colors-default-200)",
                        background: active ? `${t.color}12` : "transparent",
                      }}
                    >
                      <Icon size={20} style={{ color: active ? t.color : "var(--heroui-colors-default-400)" }} />
                      <span className="text-xs font-medium leading-tight" style={{ color: active ? t.color : "var(--heroui-colors-default-600)" }}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Divider />

            {/* Category */}
            <Select
              label="Danh mục cụ thể"
              placeholder="Chọn danh mục"
              selectedKeys={category}
              onSelectionChange={setCategory}
              radius="lg"
            >
              {(TYPE_CATEGORIES[type] || []).map(c => (
                <SelectItem key={c}>{c}</SelectItem>
              ))}
            </Select>

            {/* Order picker — only for types that need it */}
            {selectedType?.needsOrder && (
              <Select
                label="Đơn hàng liên quan (tuỳ chọn)"
                placeholder="Chọn đơn hàng..."
                selectedKeys={orderId}
                onSelectionChange={setOrderId}
                radius="lg"
              >
                {orders.map(o => (
                  <SelectItem key={o._id} textValue={o._id}>
                    <span className="font-mono text-xs">{o._id}</span>
                    {o.total_amount && <span className="text-default-500 ml-2">{o.total_amount.toLocaleString("vi-VN")}₫</span>}
                  </SelectItem>
                ))}
              </Select>
            )}

            <Input
              label="Tiêu đề *"
              placeholder="Tóm tắt ngắn gọn vấn đề của bạn"
              value={subject}
              onValueChange={setSubject}
              radius="lg"
              maxLength={100}
              endContent={<span className="text-xs text-default-400">{subject.length}/100</span>}
            />

            <Textarea
              label="Mô tả chi tiết *"
              placeholder="Mô tả đầy đủ vấn đề bạn gặp phải, kèm theo thông tin liên quan..."
              value={message}
              onValueChange={setMessage}
              radius="lg"
              minRows={5}
            />

            <Select
              label="Mức độ ưu tiên"
              selectedKeys={priority}
              onSelectionChange={setPriority}
              radius="lg"
            >
              <SelectItem key="low">Thấp — Không khẩn cấp</SelectItem>
              <SelectItem key="medium">Trung bình — Cần xử lý sớm</SelectItem>
              <SelectItem key="high">Cao — Khẩn cấp</SelectItem>
            </Select>

            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/8 border border-primary/20 text-sm text-primary">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>Chúng tôi sẽ phản hồi trong vòng 24–48 giờ làm việc. Khiếu nại cao sẽ được ưu tiên xử lý trước.</span>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" radius="lg" onPress={onClose}>Hủy</Button>
            <Button
              color="primary" radius="lg" onPress={handleSubmit}
              isLoading={submitting}
              isDisabled={!subject.trim() || !message.trim()}
              className="font-semibold"
            >
              Gửi khiếu nại
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
