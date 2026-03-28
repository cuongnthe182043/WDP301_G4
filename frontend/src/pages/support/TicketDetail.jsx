import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Chip, Divider, Textarea, Avatar } from "@heroui/react";
import {
  ArrowLeft, Clock, CheckCircle2, MessageSquare, Send, ShoppingBag,
  Store, Truck, Package2, CreditCard, HelpCircle, User, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { supportService } from "../../services/supportService";
import { useToast } from "../../components/common/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import PageContainer from "../../components/ui/PageContainer.jsx";

const STATUS_COLOR  = { open: "warning", in_progress: "primary", escalated: "danger", closed: "default" };
const STATUS_LABEL  = { open: "Đang mở", in_progress: "Đang xử lý", escalated: "Leo thang", closed: "Đã đóng" };
const PRIORITY_LABEL = { low: "Thấp", medium: "Trung bình", high: "Cao" };
const PRIORITY_COLOR = { low: "default", medium: "warning", high: "danger" };

const TYPE_INFO = {
  order:    { label: "Đơn hàng",    icon: ShoppingBag,  color: "#f97316" },
  shop:     { label: "Khiếu nại shop", icon: Store,     color: "#6366f1" },
  delivery: { label: "Vận chuyển",   icon: Truck,        color: "#0ea5e9" },
  product:  { label: "Sản phẩm",     icon: Package2,     color: "#10b981" },
  payment:  { label: "Thanh toán",   icon: CreditCard,   color: "#ec4899" },
  general:  { label: "Khác",         icon: HelpCircle,   color: "#64748b" },
};

const ROLE_STYLE = {
  customer: { bg: "bg-primary/10",   border: "border-primary/20",   label: "Bạn",         icon: User,         iconColor: "#6366f1" },
  admin:    { bg: "bg-danger/8",     border: "border-danger/20",    label: "Admin hỗ trợ",icon: ShieldCheck,  iconColor: "#ef4444" },
  shop:     { bg: "bg-success/8",    border: "border-success/20",   label: "Shop",         icon: Store,        iconColor: "#10b981" },
};

function ReplyBubble({ reply, currentUserId }) {
  const isOwn = reply.actor_id === currentUserId || reply.role === "customer";
  const style = ROLE_STYLE[reply.role] || ROLE_STYLE.customer;
  const RoleIcon = style.icon;

  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${style.iconColor}18`, color: style.iconColor }}
      >
        <RoleIcon size={16} />
      </div>
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <span className="text-xs text-default-400 font-medium">{style.label}</span>
        <div className={`rounded-2xl px-4 py-3 border ${style.bg} ${style.border}`}>
          <p className="text-sm text-default-800 leading-relaxed whitespace-pre-wrap">{reply.message}</p>
          {Array.isArray(reply.images) && reply.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {reply.images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-default-200" />
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-default-300">
          {new Date(reply.createdAt).toLocaleString("vi-VN")}
        </span>
      </div>
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const bottomRef = useRef(null);

  const [ticket,   setTicket]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [closing,  setClosing]  = useState(false);
  const [replyMsg, setReplyMsg] = useState("");
  const [sending,  setSending]  = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tk = await supportService.getTicket(id);
        setTicket(tk);
      } catch (e) {
        toast.error(e?.message || "Không tìm thấy khiếu nại");
        nav("/tickets");
      } finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    if (ticket) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.replies?.length]);

  const handleClose = async () => {
    setClosing(true);
    try {
      const updated = await supportService.closeTicket(id);
      setTicket(updated);
      toast.success("Đã đóng khiếu nại");
    } catch (e) {
      toast.error(e?.message || "Có lỗi xảy ra");
    } finally { setClosing(false); }
  };

  const handleReply = async () => {
    if (!replyMsg.trim()) return;
    setSending(true);
    try {
      const updated = await supportService.addReply(id, { message: replyMsg.trim() });
      setTicket(updated);
      setReplyMsg("");
      toast.success("Đã gửi phản hồi");
    } catch (e) {
      toast.error(e?.message || "Có lỗi xảy ra");
    } finally { setSending(false); }
  };

  if (loading) {
    return (
      <PageContainer wide={false}>
        <div className="space-y-4">
          <div className="h-7 w-1/2 bg-default-100 animate-pulse rounded-xl" />
          <div className="h-40 bg-default-100 animate-pulse rounded-2xl" />
        </div>
      </PageContainer>
    );
  }
  if (!ticket) return null;

  const typeInfo = TYPE_INFO[ticket.type] || TYPE_INFO.general;
  const TypeIcon = typeInfo.icon;
  const isClosed = ticket.status === "closed";

  return (
    <PageContainer wide={false}>
      <Button
        as={Link} to="/tickets" variant="light" radius="lg" size="sm"
        startContent={<ArrowLeft size={14} />}
        className="mb-5 -ml-2 text-default-500"
      >
        Quay lại danh sách
      </Button>

      <div className="space-y-4">
        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card radius="2xl" shadow="sm" className="border border-default-100">
            <CardBody className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}
                >
                  <TypeIcon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-xl font-black text-default-900 leading-tight">{ticket.subject}</h1>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Chip color={STATUS_COLOR[ticket.status]} variant="flat" className="font-bold">
                        {STATUS_LABEL[ticket.status] || ticket.status}
                      </Chip>
                      <Chip size="sm" color={PRIORITY_COLOR[ticket.priority]} variant="dot">
                        {PRIORITY_LABEL[ticket.priority] || ticket.priority}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-default-400">
                    <span style={{ color: typeInfo.color }} className="font-semibold">{typeInfo.label}</span>
                    {ticket.category && <span>• {ticket.category}</span>}
                  </div>
                </div>
              </div>

              <Divider className="mb-4" />

              {/* Original message */}
              <div className="p-4 rounded-xl bg-default-50 border border-default-100">
                <p className="text-sm text-default-500 font-medium mb-2">Nội dung khiếu nại ban đầu</p>
                <p className="text-default-700 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
                {Array.isArray(ticket.images) && ticket.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ticket.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-xl border border-default-100" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-4 text-xs text-default-400">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Tạo lúc {new Date(ticket.createdAt).toLocaleString("vi-VN")}
                </span>
                {ticket.order_id && (
                  <span>
                    Đơn hàng:{" "}
                    <Link to={`/orders/${ticket.order_id}`} className="text-primary font-semibold hover:underline">
                      #{ticket.order_id.slice(-8).toUpperCase()}
                    </Link>
                  </span>
                )}
              </div>

              {/* Resolution banner */}
              {ticket.resolution && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-success/8 border border-success/20 text-sm text-success-700">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Hướng giải quyết: </span>
                    {ticket.resolution}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Conversation Thread */}
        {Array.isArray(ticket.replies) && ticket.replies.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card radius="2xl" shadow="sm" className="border border-default-100">
              <CardBody className="p-5">
                <h3 className="font-bold text-default-900 mb-5 flex items-center gap-2">
                  <MessageSquare size={16} className="text-primary" />
                  Hội thoại ({ticket.replies.length} tin nhắn)
                </h3>
                <div className="space-y-5">
                  {ticket.replies.map((reply) => (
                    <ReplyBubble key={reply._id} reply={reply} currentUserId={user?._id} />
                  ))}
                </div>
                <div ref={bottomRef} />
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Reply Box */}
        {!isClosed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card radius="2xl" shadow="sm" className="border border-default-100">
              <CardBody className="p-5">
                <h3 className="font-bold text-default-900 mb-4">Thêm phản hồi</h3>
                <Textarea
                  placeholder="Nhập thông tin bổ sung hoặc cập nhật về vấn đề của bạn..."
                  value={replyMsg}
                  onValueChange={setReplyMsg}
                  radius="lg"
                  minRows={3}
                  className="mb-3"
                />
                <div className="flex items-center justify-between">
                  <Button
                    color="danger" variant="flat" radius="lg" size="sm"
                    onPress={handleClose} isLoading={closing}
                    startContent={<CheckCircle2 size={14} />}
                    className="font-semibold"
                  >
                    Đóng khiếu nại
                  </Button>
                  <Button
                    color="primary" radius="lg"
                    onPress={handleReply} isLoading={sending}
                    isDisabled={!replyMsg.trim()}
                    startContent={<Send size={14} />}
                    className="font-semibold"
                  >
                    Gửi phản hồi
                  </Button>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Activity Log */}
        {Array.isArray(ticket.logs) && ticket.logs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card radius="2xl" shadow="sm" className="border border-default-100">
              <CardBody className="p-5">
                <h3 className="font-semibold text-default-700 mb-4 flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-default-400" />
                  Lịch sử hoạt động
                </h3>
                <div className="space-y-2.5">
                  {ticket.logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-default-300 mt-2 shrink-0" />
                      <div>
                        <p className="text-sm text-default-600">{log.action}</p>
                        <p className="text-xs text-default-400">{new Date(log.created_at).toLocaleString("vi-VN")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {isClosed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-default-50 border border-default-200 text-sm text-default-500">
              <CheckCircle2 size={16} className="text-success" />
              Khiếu nại này đã được đóng.
              {ticket.resolved_at && (
                <span className="ml-1">({new Date(ticket.resolved_at).toLocaleDateString("vi-VN")})</span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </PageContainer>
  );
}
