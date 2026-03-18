import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card, CardBody, Button, Chip, Tabs, Tab, Textarea, Input, Modal,
  ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem,
} from "@heroui/react";
import { MessageSquare, Plus, Clock } from "lucide-react";
import { supportService } from "../../services/supportService";
import { useToast } from "../../components/common/ToastProvider";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { useTranslation } from "react-i18next";

const STATUS_COLOR = {
  open: "warning",
  in_progress: "primary",
  escalated: "danger",
  closed: "default",
};
const PRIORITY_COLOR = { low: "default", medium: "warning", high: "danger" };

export default function Tickets() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const STATUS_LABEL = {
    open:        t("support.status_open"),
    in_progress: t("support.status_in_progress"),
    escalated:   t("support.status_escalated"),
    closed:      t("support.status_closed"),
  };

  const [tab, setTab] = useState("open");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [subject,    setSubject]    = useState("");
  const [message,    setMessage]    = useState("");
  const [priority,   setPriority]   = useState(new Set(["medium"]));
  const [submitting, setSubmitting] = useState(false);

  const load = async (status) => {
    setLoading(true);
    try {
      const data = await supportService.getTickets(status && status !== "all" ? { status } : {});
      setTickets(data.tickets || []);
    } catch (e) {
      toast.error(e?.message || t("common.error"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(tab === "all" ? undefined : tab); }, [tab]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      return toast.error(t("common.required_fields"));
    }
    setSubmitting(true);
    try {
      await supportService.createTicket({
        subject: subject.trim(),
        message: message.trim(),
        priority: Array.from(priority)[0] || "medium",
      });
      toast.success(t("support.ticket_created"));
      setSubject(""); setMessage(""); setPriority(new Set(["medium"]));
      onClose();
      load(tab === "all" ? undefined : tab);
    } catch (e) {
      toast.error(e?.message || t("common.error"));
    } finally { setSubmitting(false); }
  };

  return (
    <PageContainer wide>
      <div className="flex items-center justify-between mb-7">
        <motion.h1
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-default-900"
        >
          {t("support.tickets")}
        </motion.h1>
        <Button
          color="primary" radius="xl" onPress={onOpen}
          startContent={<Plus size={16} />}
          className="font-semibold shadow-sm"
        >
          {t("support.new_ticket")}
        </Button>
      </div>

      <Tabs
        selectedKey={tab}
        onSelectionChange={setTab}
        variant="underlined"
        color="primary"
        className="mb-5"
      >
        <Tab key="open"        title={t("support.status_open")} />
        <Tab key="in_progress" title={t("support.status_in_progress")} />
        <Tab key="closed"      title={t("support.status_closed")} />
        <Tab key="all"         title={t("support.tab_all")} />
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
          title={t("support.no_tickets")}
          description={t("support.no_tickets_desc")}
          actionLabel={t("support.new_ticket")}
          onAction={onOpen}
        />
      ) : (
        <motion.div
          className="space-y-3"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden" animate="show"
        >
          <AnimatePresence>
            {tickets.map((tk) => (
              <motion.div
                key={tk._id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                exit={{ opacity: 0, x: -16 }}
              >
                <Card
                  as={Link}
                  to={`/tickets/${tk._id}`}
                  isPressable
                  radius="xl"
                  shadow="sm"
                  className="border border-default-100 hover:border-primary/30 transition-colors w-full"
                >
                  <CardBody className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-default-900 truncate">{tk.subject}</p>
                        <p className="text-sm text-default-500 mt-0.5 line-clamp-1">{tk.message}</p>
                        <p className="text-xs text-default-300 mt-1.5 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(tk.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Chip size="sm" color={STATUS_COLOR[tk.status]} variant="flat" className="font-semibold">
                          {STATUS_LABEL[tk.status] || tk.status}
                        </Chip>
                        <Chip size="sm" color={PRIORITY_COLOR[tk.priority]} variant="dot">
                          {tk.priority}
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

      <Modal isOpen={isOpen} onClose={onClose} radius="2xl" backdrop="blur" size="lg">
        <ModalContent>
          <ModalHeader className="font-black text-lg">{t("support.create_ticket")}</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label={t("support.subject")}
              placeholder={t("support.subject_placeholder")}
              value={subject}
              onValueChange={setSubject}
              radius="lg"
              maxLength={100}
            />
            <Textarea
              label={t("support.detail")}
              placeholder={t("support.detail_placeholder")}
              value={message}
              onValueChange={setMessage}
              radius="lg"
              minRows={4}
            />
            <Select
              label={t("support.priority")}
              selectedKeys={priority}
              onSelectionChange={setPriority}
              radius="lg"
            >
              <SelectItem key="low">{t("support.priority_low")}</SelectItem>
              <SelectItem key="medium">{t("support.priority_medium")}</SelectItem>
              <SelectItem key="high">{t("support.priority_high")}</SelectItem>
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" radius="lg" onPress={onClose}>{t("common.cancel")}</Button>
            <Button
              color="primary" radius="lg"
              onPress={handleSubmit}
              isLoading={submitting}
              isDisabled={!subject.trim() || !message.trim()}
              className="font-semibold"
            >
              {t("support.submit_ticket")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
