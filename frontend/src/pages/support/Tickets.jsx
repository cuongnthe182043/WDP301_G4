import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card, CardBody, Button, Chip, Tabs, Tab, Textarea, Input, Modal,
  ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem,
} from "@heroui/react";
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { supportService } from "../../services/supportService";
import { useToast } from "../../components/common/ToastProvider";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";

const STATUS_COLOR = {
  open: "warning",
  in_progress: "primary",
  escalated: "danger",
  closed: "default",
};
const STATUS_LABEL = {
  open: "Đang mở",
  in_progress: "Đang xử lý",
  escalated: "Khẩn cấp",
  closed: "Đã đóng",
};
const PRIORITY_COLOR = { low: "default", medium: "warning", high: "danger" };

export default function Tickets() {
  const nav = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [tab, setTab] = useState("open");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState(new Set(["medium"]));
  const [submitting, setSubmitting] = useState(false);

  const load = async (status) => {
    setLoading(true);
    try {
      const data = await supportService.getTickets(status && status !== "all" ? { status } : {});
      setTickets(data.tickets || []);
    } catch (e) {
      toast.error(e?.message || "Không tải được tickets");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(tab === "all" ? undefined : tab); }, [tab]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      return toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung.");
    }
    setSubmitting(true);
    try {
      await supportService.createTicket({
        subject: subject.trim(),
        message: message.trim(),
        priority: Array.from(priority)[0] || "medium",
      });
      toast.success("Ticket đã được tạo. Chúng tôi sẽ phản hồi sớm nhất!");
      setSubject(""); setMessage(""); setPriority(new Set(["medium"]));
      onClose();
      load(tab === "all" ? undefined : tab);
    } catch (e) {
      toast.error(e?.message || "Không tạo được ticket");
    } finally { setSubmitting(false); }
  };

  return (
    <PageContainer wide>
      <div className="flex items-center justify-between mb-7">
        <motion.h1
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-default-900"
        >
          Hỗ trợ & Khiếu nại
        </motion.h1>
        <Button
          color="primary" radius="xl" onPress={onOpen}
          startContent={<Plus size={16} />}
          className="font-semibold shadow-sm"
        >
          Tạo ticket mới
        </Button>
      </div>

      <Tabs
        selectedKey={tab}
        onSelectionChange={setTab}
        variant="underlined"
        color="primary"
        className="mb-5"
      >
        <Tab key="open"        title="Đang mở" />
        <Tab key="in_progress" title="Đang xử lý" />
        <Tab key="closed"      title="Đã đóng" />
        <Tab key="all"         title="Tất cả" />
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-default-100 animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Chưa có yêu cầu hỗ trợ"
          description="Nếu bạn gặp vấn đề với đơn hàng hoặc sản phẩm, hãy tạo ticket để được hỗ trợ."
          actionLabel="Tạo ticket mới"
          onAction={onOpen}
        />
      ) : (
        <motion.div
          className="space-y-3"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden" animate="show"
        >
          <AnimatePresence>
            {tickets.map((t) => (
              <motion.div
                key={t._id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                exit={{ opacity: 0, x: -16 }}
              >
                <Card
                  as={Link}
                  to={`/tickets/${t._id}`}
                  isPressable
                  radius="xl"
                  shadow="sm"
                  className="border border-default-100 hover:border-primary/30 transition-colors w-full"
                >
                  <CardBody className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-default-900 truncate">{t.subject}</p>
                        <p className="text-sm text-default-500 mt-0.5 line-clamp-1">{t.message}</p>
                        <p className="text-xs text-default-300 mt-1.5 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Chip size="sm" color={STATUS_COLOR[t.status]} variant="flat" className="font-semibold">
                          {STATUS_LABEL[t.status] || t.status}
                        </Chip>
                        <Chip size="sm" color={PRIORITY_COLOR[t.priority]} variant="dot">
                          {t.priority}
                        </Chip>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Ticket Modal */}
      <Modal isOpen={isOpen} onClose={onClose} radius="2xl" backdrop="blur" size="lg">
        <ModalContent>
          <ModalHeader className="font-black text-lg">Tạo yêu cầu hỗ trợ mới</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label="Tiêu đề"
              placeholder="Mô tả ngắn vấn đề của bạn..."
              value={subject}
              onValueChange={setSubject}
              radius="lg"
              maxLength={100}
            />
            <Textarea
              label="Nội dung chi tiết"
              placeholder="Mô tả chi tiết vấn đề, đính kèm mã đơn hàng nếu có..."
              value={message}
              onValueChange={setMessage}
              radius="lg"
              minRows={4}
            />
            <Select
              label="Mức độ ưu tiên"
              selectedKeys={priority}
              onSelectionChange={setPriority}
              radius="lg"
            >
              <SelectItem key="low">Thấp</SelectItem>
              <SelectItem key="medium">Trung bình</SelectItem>
              <SelectItem key="high">Cao - Khẩn cấp</SelectItem>
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" radius="lg" onPress={onClose}>Huỷ</Button>
            <Button
              color="primary" radius="lg"
              onPress={handleSubmit}
              isLoading={submitting}
              isDisabled={!subject.trim() || !message.trim()}
              className="font-semibold"
            >
              Gửi yêu cầu
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
