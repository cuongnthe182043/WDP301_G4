import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card, CardBody, Button, Chip, Tabs, Tab, Textarea, Input, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Divider,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from "@heroui/react";
import {
  MessageSquare, Send, ShieldCheck, Search, Filter, User, Store, ShoppingBag,
  Truck, Package2, CreditCard, HelpCircle, CheckCircle2, Clock, AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { supportService } from "../../services/supportService";
import { useToast } from "../../components/common/ToastProvider";
import { useTheme } from "../../context/ThemeContext";

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
  shop:     { bg: "#10b98118", border: "#10b98130", label: "Shop",        iconColor: "#10b981", Icon: Store },
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
      <div className={`max-w-[70%] flex flex-col gap-1 ${reply.role !== "customer" ? "items-end" : ""}`}>
        <span className="text-xs text-default-400">{s.label}</span>
        <div className="rounded-2xl px-4 py-3 border" style={{ background: s.bg, borderColor: s.border }}>
          <p className="text-sm text-default-800 whitespace-pre-wrap leading-relaxed">{reply.message}</p>
        </div>
        <span className="text-xs text-default-300">{new Date(reply.createdAt).toLocaleString("vi-VN")}</span>
      </div>
    </div>
  );
}

export default function AdminTickets() {
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [tickets,  setTickets]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [tab,      setTab]    = useState("open");
  const [search,   setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(new Set([]));

  // Action panel state
  const [replyMsg,    setReplyMsg]    = useState("");
  const [sending,     setSending]     = useState(false);
  const [newStatus,   setNewStatus]   = useState(new Set([]));
  const [newPriority, setNewPriority] = useState(new Set([]));
  const [adminNote,   setAdminNote]   = useState("");
  const [resolution,  setResolution]  = useState("");
  const [updating,    setUpdating]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (tab !== "all")      params.status = tab;
      if (search.trim())      params.search = search.trim();
      const tf = Array.from(typeFilter)[0];
      if (tf) params.type = tf;
      const data = await supportService.adminGetTickets(params);
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(e?.message || "Không thể tải danh sách");
    } finally { setLoading(false); }
  }, [tab, search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (tk) => {
    setSelected(null);
    setDetailLoading(true);
    onOpen();
    try {
      const ticket = await supportService.adminGetTicket(tk._id);
      setSelected(ticket);
      setNewStatus(new Set([ticket.status]));
      setNewPriority(new Set([ticket.priority]));
      setAdminNote(ticket.admin_note || "");
      setResolution(ticket.resolution || "");
      setReplyMsg("");
    } catch (e) {
      toast.error("Không thể tải chi tiết");
      onClose();
    } finally { setDetailLoading(false); }
  };

  const handleSendReply = async () => {
    if (!replyMsg.trim() || !selected) return;
    setSending(true);
    try {
      const updated = await supportService.adminAddReply(selected._id, { message: replyMsg.trim() });
      setSelected(updated);
      setReplyMsg("");
      toast.success("Đã gửi phản hồi");
      load();
    } catch (e) { toast.error(e?.message || "Có lỗi xảy ra"); }
    finally { setSending(false); }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const updated = await supportService.adminUpdateTicket(selected._id, {
        status:     Array.from(newStatus)[0],
        priority:   Array.from(newPriority)[0],
        admin_note: adminNote,
        resolution,
      });
      setSelected(updated);
      toast.success("Đã cập nhật khiếu nại");
      load();
    } catch (e) { toast.error(e?.message || "Có lỗi xảy ra"); }
    finally { setUpdating(false); }
  };

  // Stats
  const stats = [
    { label: "Tổng", count: total, color: "#6366f1" },
    { label: "Đang mở", count: tickets.filter(t => t.status === "open").length, color: "#f97316" },
    { label: "Đang xử lý", count: tickets.filter(t => t.status === "in_progress").length, color: "#3b82f6" },
    { label: "Leo thang", count: tickets.filter(t => t.status === "escalated").length, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: isDark ? "#e8eaed" : "#1e293b" }}>
            Quản lý Khiếu nại
          </h1>
          <p className="text-sm mt-0.5" style={{ color: isDark ? "#6b7280" : "#64748b" }}>
            Xem xét và xử lý khiếu nại từ khách hàng
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} radius="2xl" shadow="sm" className="border border-default-100">
            <CardBody className="p-4">
              <p className="text-xs text-default-500 mb-1">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.count}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card radius="2xl" shadow="sm" className="border border-default-100">
        <CardBody className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Tìm theo tiêu đề..."
              value={search}
              onValueChange={setSearch}
              radius="lg" size="sm"
              startContent={<Search size={14} className="text-default-400" />}
              className="w-64"
            />
            <Select
              placeholder="Loại khiếu nại"
              selectedKeys={typeFilter}
              onSelectionChange={setTypeFilter}
              radius="lg" size="sm"
              className="w-44"
            >
              {Object.entries(TYPE_INFO).map(([k, v]) => (
                <SelectItem key={k}>{v.label}</SelectItem>
              ))}
            </Select>
            {(search || Array.from(typeFilter).length > 0) && (
              <Button variant="light" size="sm" radius="lg" onPress={() => { setSearch(""); setTypeFilter(new Set([])); }}>
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabs + Table */}
      <Tabs selectedKey={tab} onSelectionChange={setTab} variant="underlined" color="primary">
        <Tab key="open"        title="Đang mở" />
        <Tab key="in_progress" title="Đang xử lý" />
        <Tab key="escalated"   title="Leo thang" />
        <Tab key="closed"      title="Đã đóng" />
        <Tab key="all"         title="Tất cả" />
      </Tabs>

      <Card radius="2xl" shadow="sm" className="border border-default-100">
        <CardBody className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-default-100 animate-pulse" />)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-default-400">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
              <p>Không có khiếu nại nào</p>
            </div>
          ) : (
            <div className="divide-y divide-default-100">
              {tickets.map(tk => {
                const typeInfo = TYPE_INFO[tk.type] || TYPE_INFO.general;
                const TypeIcon = typeInfo.icon;
                return (
                  <button
                    key={tk._id}
                    onClick={() => openDetail(tk)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-default-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}>
                      <TypeIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: isDark ? "#e8eaed" : "#1e293b" }}>
                        {tk.subject}
                      </p>
                      <p className="text-xs text-default-400 mt-0.5 truncate">{tk.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-default-400">
                        <Clock size={10} />
                        {new Date(tk.createdAt).toLocaleDateString("vi-VN")}
                        <span>•</span>
                        <span style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                        {tk.replies?.length > 0 && (
                          <>
                            <span>•</span>
                            <MessageSquare size={10} />
                            {tk.replies.length}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Chip size="sm" color={STATUS_COLOR[tk.status]} variant="flat" className="font-semibold">
                        {STATUS_LABEL[tk.status]}
                      </Chip>
                      <Chip size="sm" color={PRIORITY_COLOR[tk.priority]} variant="dot" className="text-xs">
                        {PRIORITY_LABEL[tk.priority]}
                      </Chip>
                    </div>
                    <ChevronRight size={14} className="text-default-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} radius="2xl" backdrop="blur" size="4xl" scrollBehavior="inside">
        <ModalContent>
          {detailLoading || !selected ? (
            <>
              <ModalHeader>Đang tải...</ModalHeader>
              <ModalBody>
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-default-100 animate-pulse" />)}
                </div>
              </ModalBody>
            </>
          ) : (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg">{selected.subject}</span>
                  <Chip size="sm" color={STATUS_COLOR[selected.status]} variant="flat" className="font-bold">
                    {STATUS_LABEL[selected.status]}
                  </Chip>
                </div>
                <div className="flex items-center gap-3 text-xs text-default-400 font-normal">
                  <span>{TYPE_INFO[selected.type]?.label || selected.type}</span>
                  {selected.category && <span>• {selected.category}</span>}
                  <span>• {new Date(selected.createdAt).toLocaleString("vi-VN")}</span>
                  {selected.order_id && <span>• Đơn: #{selected.order_id.slice(-8).toUpperCase()}</span>}
                </div>
              </ModalHeader>

              <ModalBody className="gap-5">
                <div className="grid grid-cols-2 gap-5">
                  {/* Left: conversation */}
                  <div className="space-y-4">
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

                    {/* Replies */}
                    {selected.replies?.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-xs font-semibold text-default-500 flex items-center gap-1">
                          <MessageSquare size={12} /> Hội thoại ({selected.replies.length})
                        </p>
                        {selected.replies.map(r => <ReplyBubble key={r._id} reply={r} />)}
                      </div>
                    )}

                    {/* Reply box */}
                    {selected.status !== "closed" && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Viết phản hồi cho khách hàng..."
                          value={replyMsg}
                          onValueChange={setReplyMsg}
                          radius="lg" minRows={3}
                        />
                        <Button
                          color="primary" radius="lg" size="sm"
                          isLoading={sending}
                          isDisabled={!replyMsg.trim()}
                          onPress={handleSendReply}
                          startContent={<Send size={14} />}
                          className="font-semibold w-full"
                        >
                          Gửi phản hồi cho khách
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Right: action panel */}
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-default-700">Xử lý khiếu nại</p>

                    <Select label="Trạng thái" selectedKeys={newStatus} onSelectionChange={setNewStatus} radius="lg" size="sm">
                      <SelectItem key="open">Đang mở</SelectItem>
                      <SelectItem key="in_progress">Đang xử lý</SelectItem>
                      <SelectItem key="escalated">Leo thang</SelectItem>
                      <SelectItem key="closed">Đóng</SelectItem>
                    </Select>

                    <Select label="Mức độ ưu tiên" selectedKeys={newPriority} onSelectionChange={setNewPriority} radius="lg" size="sm">
                      <SelectItem key="low">Thấp</SelectItem>
                      <SelectItem key="medium">Trung bình</SelectItem>
                      <SelectItem key="high">Cao</SelectItem>
                    </Select>

                    <Textarea
                      label="Ghi chú nội bộ (admin only)"
                      placeholder="Ghi chú cho team xử lý..."
                      value={adminNote}
                      onValueChange={setAdminNote}
                      radius="lg" minRows={3} size="sm"
                    />

                    <Textarea
                      label="Hướng giải quyết"
                      placeholder="Ghi rõ hướng giải quyết khi đóng khiếu nại..."
                      value={resolution}
                      onValueChange={setResolution}
                      radius="lg" minRows={3} size="sm"
                    />

                    <Button
                      color="primary" radius="lg" className="w-full font-semibold"
                      isLoading={updating}
                      onPress={handleUpdate}
                    >
                      Lưu thay đổi
                    </Button>

                    <Divider />

                    {/* Logs */}
                    {selected.logs?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-default-500 mb-2 flex items-center gap-1">
                          <Clock size={11} /> Lịch sử
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selected.logs.map((log, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-default-300 mt-1.5 shrink-0" />
                              <div>
                                <p className="text-default-600">{log.action}</p>
                                <p className="text-default-400">{new Date(log.created_at).toLocaleString("vi-VN")}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="pt-2">
                <Button variant="light" radius="lg" onPress={onClose}>Đóng</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
