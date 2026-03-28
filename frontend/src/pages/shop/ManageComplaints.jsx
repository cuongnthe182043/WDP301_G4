import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card, CardBody, Button, Chip, Tabs, Tab, Textarea, Modal,
  ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Divider,
} from "@heroui/react";
import {
  MessageSquare, Send, Store, ShoppingBag, Truck, Package2, CreditCard,
  HelpCircle, Clock, User, ShieldCheck, ChevronRight,
} from "lucide-react";
import { supportService } from "../../services/supportService";
import { useToast } from "../../components/common/ToastProvider";

const STATUS_COLOR  = { open: "warning", in_progress: "primary", escalated: "danger", closed: "default" };
const STATUS_LABEL  = { open: "Đang mở", in_progress: "Đang xử lý", escalated: "Leo thang", closed: "Đã đóng" };
const PRIORITY_COLOR = { low: "default", medium: "warning", high: "danger" };
const PRIORITY_LABEL = { low: "Thấp", medium: "Trung bình", high: "Cao" };

const TYPE_INFO = {
  order:    { label: "Đơn hàng",      icon: ShoppingBag, color: "#f97316" },
  shop:     { label: "Khiếu nại shop", icon: Store,       color: "#6366f1" },
  delivery: { label: "Vận chuyển",    icon: Truck,        color: "#0ea5e9" },
  product:  { label: "Sản phẩm",      icon: Package2,     color: "#10b981" },
  payment:  { label: "Thanh toán",    icon: CreditCard,   color: "#ec4899" },
  general:  { label: "Khác",          icon: HelpCircle,   color: "#64748b" },
};

const ROLE_STYLE = {
  customer: { bg: "#6366f118", border: "#6366f130", label: "Khách hàng", iconColor: "#6366f1", Icon: User },
  admin:    { bg: "#ef444418", border: "#ef444430", label: "Admin",       iconColor: "#ef4444", Icon: ShieldCheck },
  shop:     { bg: "#10b98118", border: "#10b98130", label: "Shop của bạn",iconColor: "#10b981", Icon: Store },
};

function ReplyBubble({ reply }) {
  const s = ROLE_STYLE[reply.role] || ROLE_STYLE.customer;
  const RoleIcon = s.Icon;
  return (
    <div className={`flex gap-3 ${reply.role === "customer" ? "flex-row" : "flex-row-reverse"}`}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: s.bg, color: s.iconColor }}>
        <RoleIcon size={14} />
      </div>
      <div className={`max-w-[72%] flex flex-col gap-1 ${reply.role !== "customer" ? "items-end" : ""}`}>
        <span className="text-xs text-default-400">{s.label}</span>
        <div className="rounded-2xl px-4 py-3 border" style={{ background: s.bg, borderColor: s.border }}>
          <p className="text-sm text-default-800 whitespace-pre-wrap leading-relaxed">{reply.message}</p>
        </div>
        <span className="text-xs text-default-300">{new Date(reply.createdAt).toLocaleString("vi-VN")}</span>
      </div>
    </div>
  );
}

export default function ManageComplaints() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState("open");
  const [replyMsg, setReplyMsg] = useState("");
  const [sending,  setSending]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab !== "all" ? { status: tab } : {};
      const data = await supportService.shopGetTickets(params);
      setTickets(data.tickets || []);
    } catch (e) {
      toast.error(e?.message || "Không thể tải danh sách");
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (tk) => {
    setSelected(null);
    setDetailLoading(true);
    setReplyMsg("");
    onOpen();
    try {
      const ticket = await supportService.shopGetTicket(tk._id);
      setSelected(ticket);
    } catch (e) {
      toast.error("Không thể tải chi tiết");
      onClose();
    } finally { setDetailLoading(false); }
  };

  const handleReply = async () => {
    if (!replyMsg.trim() || !selected) return;
    setSending(true);
    try {
      const updated = await supportService.shopAddReply(selected._id, { message: replyMsg.trim() });
      setSelected(updated);
      setReplyMsg("");
      toast.success("Đã gửi phản hồi");
      load();
    } catch (e) { toast.error(e?.message || "Có lỗi xảy ra"); }
    finally { setSending(false); }
  };

  const openCount = tickets.filter(t => t.status === "open").length;

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-black text-default-900">Khiếu nại từ khách hàng</h1>
          <p className="text-sm text-default-500 mt-0.5">
            Xem và phản hồi các khiếu nại liên quan đến shop của bạn
          </p>
        </div>
        {openCount > 0 && (
          <Chip color="warning" variant="flat" className="font-bold">
            {openCount} chưa xử lý
          </Chip>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs selectedKey={tab} onSelectionChange={setTab} variant="underlined" color="primary">
        <Tab key="open"        title="Đang mở" />
        <Tab key="in_progress" title="Đang xử lý" />
        <Tab key="closed"      title="Đã đóng" />
        <Tab key="all"         title="Tất cả" />
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-default-100 animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <Card radius="2xl" shadow="sm" className="border border-default-100">
          <CardBody className="p-12 text-center text-default-400">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Không có khiếu nại nào trong mục này</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(tk => {
            const typeInfo = TYPE_INFO[tk.type] || TYPE_INFO.general;
            const TypeIcon = typeInfo.icon;
            return (
              <motion.div key={tk._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card isPressable radius="2xl" shadow="sm" className="border border-default-100 hover:border-primary/30 transition-colors w-full"
                  onPress={() => openDetail(tk)}>
                  <CardBody className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}>
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
                              {STATUS_LABEL[tk.status]}
                            </Chip>
                            <Chip size="sm" color={PRIORITY_COLOR[tk.priority]} variant="dot" className="text-xs">
                              {PRIORITY_LABEL[tk.priority]}
                            </Chip>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-default-400">
                          <Clock size={10} />
                          {new Date(tk.createdAt).toLocaleDateString("vi-VN")}
                          <span style={{ color: typeInfo.color }} className="font-medium">• {typeInfo.label}</span>
                          {tk.replies?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare size={10} /> {tk.replies.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-default-300 shrink-0 mt-1" />
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} radius="2xl" backdrop="blur" size="2xl" scrollBehavior="inside">
        <ModalContent>
          {detailLoading || !selected ? (
            <>
              <ModalHeader>Đang tải...</ModalHeader>
              <ModalBody>
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-default-100 animate-pulse" />)}
                </div>
              </ModalBody>
            </>
          ) : (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-lg">{selected.subject}</span>
                  <Chip size="sm" color={STATUS_COLOR[selected.status]} variant="flat" className="font-bold">
                    {STATUS_LABEL[selected.status]}
                  </Chip>
                </div>
                <div className="flex items-center gap-2 text-xs text-default-400 font-normal flex-wrap">
                  <span>{TYPE_INFO[selected.type]?.label || selected.type}</span>
                  {selected.category && <span>• {selected.category}</span>}
                  <span>• {new Date(selected.createdAt).toLocaleString("vi-VN")}</span>
                  {selected.order_id && <span>• Đơn: #{selected.order_id.slice(-8).toUpperCase()}</span>}
                </div>
              </ModalHeader>

              <ModalBody className="gap-4">
                {/* Original message */}
                <div className="p-4 rounded-xl bg-default-50 border border-default-100">
                  <p className="text-xs font-semibold text-default-500 mb-2">Nội dung khiếu nại</p>
                  <p className="text-sm text-default-700 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
                  {Array.isArray(selected.images) && selected.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selected.images.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Conversation */}
                {selected.replies?.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-default-500 flex items-center gap-1">
                      <MessageSquare size={12} /> Hội thoại ({selected.replies.length})
                    </p>
                    {selected.replies.map(r => <ReplyBubble key={r._id} reply={r} />)}
                  </div>
                )}

                {/* Resolution */}
                {selected.resolution && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-success/8 border border-success/20 text-sm text-success-700">
                    <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                    <div><span className="font-bold">Hướng giải quyết: </span>{selected.resolution}</div>
                  </div>
                )}

                {/* Reply box */}
                {selected.status !== "closed" && (
                  <>
                    <Divider />
                    <Textarea
                      label="Phản hồi của shop"
                      placeholder="Nhập nội dung phản hồi cho khách hàng..."
                      value={replyMsg}
                      onValueChange={setReplyMsg}
                      radius="lg" minRows={4}
                    />
                  </>
                )}
              </ModalBody>

              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Đóng</Button>
                {selected.status !== "closed" && (
                  <Button
                    color="primary" radius="lg"
                    isLoading={sending}
                    isDisabled={!replyMsg.trim()}
                    onPress={handleReply}
                    startContent={<Send size={14} />}
                    className="font-semibold"
                  >
                    Gửi phản hồi
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
