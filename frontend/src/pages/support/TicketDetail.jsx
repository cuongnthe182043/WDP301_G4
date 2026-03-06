import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Chip, Divider } from "@heroui/react";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { supportService } from "../../services/supportService";
import { useToast } from "../../components/common/ToastProvider";
import PageContainer from "../../components/ui/PageContainer.jsx";

const STATUS_COLOR = {
  open: "warning", in_progress: "primary", escalated: "danger", closed: "default",
};
const STATUS_LABEL = {
  open: "Đang mở", in_progress: "Đang xử lý", escalated: "Khẩn cấp", closed: "Đã đóng",
};

export default function TicketDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await supportService.getTicket(id);
        setTicket(t);
      } catch (e) {
        toast.error(e?.message || "Không tải được ticket");
        nav("/tickets");
      } finally { setLoading(false); }
    })();
  }, [id]);

  const handleClose = async () => {
    setClosing(true);
    try {
      const updated = await supportService.closeTicket(id);
      setTicket(updated);
      toast.success("Ticket đã được đóng.");
    } catch (e) {
      toast.error(e?.message || "Không đóng được ticket");
    } finally { setClosing(false); }
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card radius="2xl" shadow="sm" className="border border-default-100">
            <CardBody className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 className="text-xl font-black text-default-900 flex-1">{ticket.subject}</h1>
                <Chip color={STATUS_COLOR[ticket.status]} variant="flat" className="font-bold shrink-0">
                  {STATUS_LABEL[ticket.status] || ticket.status}
                </Chip>
              </div>

              <Divider className="mb-4" />

              <p className="text-default-600 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>

              {Array.isArray(ticket.images) && ticket.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {ticket.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-xl border border-default-100" />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 mt-5 text-xs text-default-400">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Tạo lúc {new Date(ticket.createdAt).toLocaleString("vi-VN")}
                </span>
                {ticket.order_id && (
                  <span>
                    Đơn hàng:{" "}
                    <Link to={`/orders/${ticket.order_id}`} className="text-primary font-semibold hover:underline">
                      {ticket.order_id}
                    </Link>
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Activity Log */}
        {Array.isArray(ticket.logs) && ticket.logs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card radius="2xl" shadow="sm" className="border border-default-100">
              <CardBody className="p-5">
                <h3 className="font-bold text-default-900 mb-4 flex items-center gap-2">
                  <MessageSquare size={16} className="text-default-400" />
                  Lịch sử hoạt động
                </h3>
                <div className="space-y-3">
                  {ticket.logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm text-default-700">{log.action}</p>
                        <p className="text-xs text-default-400">
                          {new Date(log.created_at).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        {ticket.status !== "closed" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Button
              color="danger"
              variant="flat"
              radius="xl"
              onPress={handleClose}
              isLoading={closing}
              startContent={<CheckCircle2 size={16} />}
              className="font-semibold"
            >
              Đóng ticket (đã giải quyết)
            </Button>
          </motion.div>
        )}
      </div>
    </PageContainer>
  );
}
