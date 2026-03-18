import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Skeleton, Chip } from "@heroui/react";
import {
  Bell, Package, CreditCard, Tag, Settings,
  Check, CheckCheck, Trash2, ChevronRight, Filter,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useTranslation } from "react-i18next";

const NOTIF_META = {
  "order.placed":    { Icon: Package,    color: "#2563EB", bg: "#EFF6FF",  label: "Đơn hàng" },
  "order.confirmed": { Icon: Package,    color: "#7C3AED", bg: "#EDE9FE",  label: "Đơn hàng" },
  "order.shipped":   { Icon: Package,    color: "#0284C7", bg: "#E0F2FE",  label: "Đơn hàng" },
  "order.delivered": { Icon: Package,    color: "#16A34A", bg: "#DCFCE7",  label: "Đơn hàng" },
  "order.cancelled": { Icon: Package,    color: "#DC2626", bg: "#FEE2E2",  label: "Đơn hàng" },
  "payment.success": { Icon: CreditCard, color: "#16A34A", bg: "#DCFCE7",  label: "Thanh toán" },
  "payment.failed":  { Icon: CreditCard, color: "#DC2626", bg: "#FEE2E2",  label: "Thanh toán" },
  "system.password": { Icon: Settings,   color: "#D97706", bg: "#FEF3C7",  label: "Hệ thống" },
  "system.security": { Icon: Settings,   color: "#DC2626", bg: "#FEE2E2",  label: "Hệ thống" },
  order:             { Icon: Package,    color: "#2563EB", bg: "#EFF6FF",  label: "Đơn hàng" },
  payment:           { Icon: CreditCard, color: "#16A34A", bg: "#DCFCE7",  label: "Thanh toán" },
  system:            { Icon: Settings,   color: "#D97706", bg: "#FEF3C7",  label: "Hệ thống" },
  promotion:         { Icon: Tag,        color: "#DB2777", bg: "#FCE7F3",  label: "Khuyến mãi" },
};

function getMeta(n) {
  return NOTIF_META[n.subtype] || NOTIF_META[n.type] || NOTIF_META.system;
}

function useTimeAgo() {
  const { t } = useTranslation();
  return (date) => {
    try {
      const diff = Date.now() - new Date(date).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return t("notification.just_now");
      if (m < 60) return t("notification.minutes_ago", { count: m });
      const h = Math.floor(m / 60);
      if (h < 24) return t("notification.hours_ago", { count: h });
      const d = Math.floor(h / 24);
      if (d < 7) return t("notification.days_ago", { count: d });
      return new Date(date).toLocaleDateString();
    } catch { return ""; }
  };
}

function formatDate(date) {
  try {
    const d = new Date(date);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    return `${hh}:${mm} • ${dd}/${mo}/${d.getFullYear()}`;
  } catch { return ""; }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-gray-100">
          <Skeleton className="w-11 h-11 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 rounded-lg" />
            <Skeleton className="h-3 w-full rounded-lg" />
            <Skeleton className="h-3 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single notification card ─────────────────────────────────────────────────
function NotifCard({ n, onMarkRead, onDelete, onNavigate }) {
  const { Icon, color, bg } = getMeta(n);
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: n.isRead ? "#ffffff" : "#F0F7FF",
        border: n.isRead ? "1.5px solid #F1F5F9" : "1.5px solid #BFDBFE",
        boxShadow: hovered
          ? "0 4px 20px rgba(29,78,216,0.10)"
          : n.isRead ? "none" : "0 2px 8px rgba(29,78,216,0.06)",
        transition: "all 0.2s",
      }}
      onClick={() => {
        if (!n.isRead) onMarkRead(n._id);
        if (n.link) onNavigate(n.link);
      }}
    >
      <div className="flex gap-4 p-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: bg }}
        >
          <Icon size={20} style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-xs font-black leading-tight"
                  style={{ color: n.isRead ? "#374151" : "#111827" }}
                >
                  {n.title}
                </span>
                {!n.isRead && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "#2563EB" }}
                  />
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                {n.message}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <Chip size="sm" variant="flat"
                  style={{ background: bg, color, fontSize: 10, height: 18, fontWeight: 700 }}>
                  {label}
                </Chip>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {timeAgo(n.createdAt)}
                </span>
                <span className="text-[10px] text-gray-300 hidden sm:block">
                  {formatDate(n.createdAt)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!n.isRead && (
                    <button
                      onClick={() => onMarkRead(n._id)}
                      title="Đánh dấu đã đọc"
                      className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Check size={13} className="text-blue-500" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(n._id)}
                    title="Xoá thông báo"
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                  {n.link && (
                    <button
                      onClick={() => { if (!n.isRead) onMarkRead(n._id); onNavigate(n.link); }}
                      title="Xem chi tiết"
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight size={13} className="text-gray-400" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    notifications, unreadCount, loading, hasMore,
    markRead, markAllRead, deleteNotif, loadMore,
  } = useNotifications();

  const TYPE_FILTERS = [
    { key: "all",       label: t("order.filter_all") },
    { key: "order",     label: t("nav.orders") },
    { key: "payment",   label: t("checkout.payment_method") },
    { key: "promotion", label: t("admin.moderation") },
    { key: "system",    label: t("admin.system_config") },
  ];

  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  return (
    <div className="min-h-screen" style={{ background: "#F0F6FF" }}>
      {/* ── Floating orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: "absolute", width: 400, height: 400, top: -100, right: -100, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07), transparent 70%)" }} />
        <div style={{ position: "absolute", width: 300, height: 300, bottom: 100, left: -80, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-16">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
                style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)" }}
              >
                <Bell size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-blue-900 leading-tight">{t("notification.title")}</h1>
                <p className="text-xs text-blue-400 font-semibold mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} ${t("notification.mark_all_read")}` : t("notification.mark_all_read")}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="flat"
                color="primary"
                radius="xl"
                startContent={<CheckCheck size={13} />}
                onPress={markAllRead}
                className="font-bold text-xs"
              >
                {t("notification.mark_all_read")}
              </Button>
            )}
          </div>
        </motion.div>

        {/* ── Filter chips ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide"
        >
          <Filter size={14} className="text-blue-400 flex-shrink-0 mt-1.5" />
          {TYPE_FILTERS.map((f) => {
            const active = filter === f.key;
            const count = f.key === "all"
              ? notifications.length
              : notifications.filter((n) => n.type === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
                style={active
                  ? { background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", color: "#fff", boxShadow: "0 2px 8px rgba(29,78,216,0.3)" }
                  : { background: "#fff", color: "#374151", border: "1.5px solid #E2E8F0" }
                }
              >
                {f.label}
                {count > 0 && (
                  <span
                    className="rounded-full px-1.5 text-[10px] font-black"
                    style={{ background: active ? "rgba(255,255,255,0.25)" : "#EFF6FF", color: active ? "#fff" : "#2563EB" }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* ── List ── */}
        {loading && notifications.length === 0 ? (
          <NotifSkeleton />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)" }}
            >
              <Bell size={36} className="text-blue-300" />
            </motion.div>
            <div className="text-center">
              <p className="font-black text-gray-600 text-base">{t("notification.empty")}</p>
              <p className="text-sm text-gray-400 mt-1">
                {t("notification.empty")}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filtered.map((n) => (
                <NotifCard
                  key={n._id}
                  n={n}
                  onMarkRead={markRead}
                  onDelete={deleteNotif}
                  onNavigate={navigate}
                />
              ))}
            </AnimatePresence>

            {/* Load more */}
            {hasMore && (
              <div className="pt-2 text-center">
                <Button
                  variant="flat"
                  color="primary"
                  radius="xl"
                  size="sm"
                  isLoading={loading}
                  onPress={loadMore}
                  className="font-bold"
                >
                  Tải thêm thông báo
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
