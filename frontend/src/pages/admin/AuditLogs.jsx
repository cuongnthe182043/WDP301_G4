import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner, Chip, Tooltip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Tabs, Tab,
} from "@heroui/react";
import {
  Search, RefreshCw, Download, Clock, User, Database, Globe,
  Shield, Activity, AlertTriangle, Filter, X,
  LogIn, LogOut, UserPlus, Key, ShoppingBag, Package, Tag, FolderTree,
  Monitor, Eye, Truck, CreditCard, Undo2, Ticket, TicketPercent, Image, Zap,
  Star, MessageSquare, Wallet, Store, FileText, Hash, ListFilter,
  ChevronRight, Layers,
} from "lucide-react";
import apiClient from "../../services/apiClient";
import PaginationBar from "../../components/ui/PaginationBar";

const api = {
  list: (p) => apiClient.get("/admin/audit-logs", { params: p }).then((r) => r.data),
  actions: () => apiClient.get("/admin/audit-logs/actions").then((r) => r.data.data),
  collections: () => apiClient.get("/admin/audit-logs/collections").then((r) => r.data.data),
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", { hour12: false });
}

function formatRelative(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày trước`;
  return "";
}

function parseUserAgent(ua) {
  if (!ua || ua === "unknown") return { browser: "Unknown", os: "Unknown", short: "Unknown" };
  let browser = "Unknown", os = "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Postman")) browser = "Postman";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  return { browser, os, short: `${browser} / ${os}` };
}

/* ── Action Config ─────────────────────────────────────────────────────────── */

const ACTION_CONFIG = {
  "auth.login":             { icon: LogIn,         color: "success",   label: "Login" },
  "auth.login_failed":      { icon: AlertTriangle, color: "danger",    label: "Login Failed" },
  "auth.logout":            { icon: LogOut,        color: "default",   label: "Logout" },
  "auth.register":          { icon: UserPlus,      color: "primary",   label: "Register" },
  "auth.change_password":   { icon: Key,           color: "warning",   label: "Password Changed" },
  "product.approve":        { icon: Package,       color: "success",   label: "Product Approved" },
  "product.reject":         { icon: Package,       color: "danger",    label: "Product Rejected" },
  "product.auto_approve":   { icon: Package,       color: "success",   label: "Auto Approved" },
  "product.auto_reject":    { icon: Package,       color: "danger",    label: "Auto Rejected" },
  "product.auto_flag":      { icon: AlertTriangle, color: "warning",   label: "Auto Flagged" },
  "product.bulk_approve":   { icon: Package,       color: "success",   label: "Bulk Approve" },
  "product.bulk_reject":    { icon: Package,       color: "danger",    label: "Bulk Reject" },
  "product.batch_moderate": { icon: Shield,        color: "secondary", label: "Batch Moderate" },
  "shop.approve":           { icon: ShoppingBag,   color: "success",   label: "Shop Approved" },
  "shop.suspend":           { icon: ShoppingBag,   color: "danger",    label: "Shop Suspended" },
  "shop.reject":            { icon: ShoppingBag,   color: "danger",    label: "Shop Rejected" },
  "shop.register":          { icon: Store,         color: "primary",   label: "Shop Registered" },
  "category.create":        { icon: FolderTree,    color: "success",   label: "Category Created" },
  "category.update":        { icon: FolderTree,    color: "primary",   label: "Category Updated" },
  "category.delete":        { icon: FolderTree,    color: "danger",    label: "Category Deleted" },
  "brand.create":           { icon: Tag,           color: "success",   label: "Brand Created" },
  "brand.update":           { icon: Tag,           color: "primary",   label: "Brand Updated" },
  "brand.delete":           { icon: Tag,           color: "danger",    label: "Brand Deleted" },
  "user.ban":               { icon: User,          color: "danger",    label: "User Banned" },
  "user.warn":              { icon: User,          color: "warning",   label: "User Warned" },
  "user.unban":             { icon: User,          color: "success",   label: "User Unbanned" },
  "user.update_role":       { icon: Shield,        color: "warning",   label: "Role Updated" },
  "user.update_profile":    { icon: User,          color: "primary",   label: "Profile Updated" },
  "order.create":           { icon: FileText,      color: "primary",   label: "Order Created" },
  "order.confirm":          { icon: Truck,         color: "success",   label: "Order Confirmed" },
  "order.cancel_by_shop":   { icon: Truck,         color: "danger",    label: "Cancelled by Shop" },
  "order.cancel_by_customer":{ icon: Truck,        color: "warning",   label: "Cancelled by Customer" },
  "order.push_ghn":         { icon: Truck,         color: "primary",   label: "Pushed to GHN" },
  "order.update_status":    { icon: Truck,         color: "secondary", label: "Status Updated" },
  "payment.create":         { icon: CreditCard,    color: "primary",   label: "Payment Created" },
  "payment.capture":        { icon: CreditCard,    color: "success",   label: "Payment Captured" },
  "payment.refund":         { icon: CreditCard,    color: "warning",   label: "Payment Refunded" },
  "refund.request":         { icon: Undo2,         color: "warning",   label: "Refund Requested" },
  "refund.approve":         { icon: Undo2,         color: "success",   label: "Refund Approved" },
  "refund.reject":          { icon: Undo2,         color: "danger",    label: "Refund Rejected" },
  "refund.complete":        { icon: Undo2,         color: "success",   label: "Refund Completed" },
  "voucher.create":         { icon: TicketPercent, color: "success",   label: "Voucher Created" },
  "voucher.update":         { icon: TicketPercent, color: "primary",   label: "Voucher Updated" },
  "voucher.delete":         { icon: TicketPercent, color: "danger",    label: "Voucher Deleted" },
  "voucher.toggle":         { icon: TicketPercent, color: "warning",   label: "Voucher Toggled" },
  "flashsale.create":       { icon: Zap,           color: "success",   label: "Flash Sale Created" },
  "flashsale.update":       { icon: Zap,           color: "primary",   label: "Flash Sale Updated" },
  "flashsale.delete":       { icon: Zap,           color: "danger",    label: "Flash Sale Deleted" },
  "review.submit":          { icon: Star,          color: "primary",   label: "Review Submitted" },
  "review.approve":         { icon: Star,          color: "success",   label: "Review Approved" },
  "review.delete":          { icon: Star,          color: "danger",    label: "Review Deleted" },
  "review.reply":           { icon: MessageSquare, color: "primary",   label: "Review Replied" },
  "review.toggle_hide":     { icon: Star,          color: "warning",   label: "Review Visibility" },
  "wallet.withdraw":        { icon: Wallet,        color: "warning",   label: "Withdrawal Request" },
  "banner.create":          { icon: Image,         color: "success",   label: "Banner Created" },
  "banner.update":          { icon: Image,         color: "primary",   label: "Banner Updated" },
  "banner.delete":          { icon: Image,         color: "danger",    label: "Banner Deleted" },
  "ticket.create":          { icon: Ticket,        color: "primary",   label: "Ticket Created" },
  "ticket.close":           { icon: Ticket,        color: "default",   label: "Ticket Closed" },
  "api_key.create":         { icon: Key,           color: "success",   label: "API Key Created" },
  "api_key.reveal":         { icon: Key,           color: "warning",   label: "API Key Revealed" },
  "api_key.update":         { icon: Key,           color: "primary",   label: "API Key Updated" },
  "api_key.delete":         { icon: Key,           color: "danger",    label: "API Key Deleted" },
  "system_config.update":   { icon: Shield,        color: "warning",   label: "Config Updated" },
  "system_config.test_smtp":{ icon: Shield,        color: "secondary", label: "SMTP Test" },
};

/* Color tokens for action badges */
const BADGE_STYLE = {
  success:   { bg: "bg-emerald-500/10 dark:bg-emerald-400/10", text: "text-emerald-600 dark:text-emerald-400",  ring: "ring-emerald-500/20 dark:ring-emerald-400/20" },
  danger:    { bg: "bg-rose-500/10 dark:bg-rose-400/10",       text: "text-rose-600 dark:text-rose-400",        ring: "ring-rose-500/20 dark:ring-rose-400/20" },
  warning:   { bg: "bg-amber-500/10 dark:bg-amber-400/10",     text: "text-amber-600 dark:text-amber-400",      ring: "ring-amber-500/20 dark:ring-amber-400/20" },
  primary:   { bg: "bg-blue-500/10 dark:bg-blue-400/10",       text: "text-blue-600 dark:text-blue-400",        ring: "ring-blue-500/20 dark:ring-blue-400/20" },
  secondary: { bg: "bg-violet-500/10 dark:bg-violet-400/10",   text: "text-violet-600 dark:text-violet-400",    ring: "ring-violet-500/20 dark:ring-violet-400/20" },
  default:   { bg: "bg-zinc-500/10 dark:bg-zinc-400/10",       text: "text-zinc-600 dark:text-[#9ea3b5]",        ring: "ring-zinc-500/20 dark:ring-zinc-400/20" },
};

const ACTION_GROUPS = {
  all:          { label: "All",         icon: ListFilter },
  auth:         { label: "Auth",        icon: LogIn },
  order:        { label: "Orders",      icon: FileText },
  payment:      { label: "Payments",    icon: CreditCard },
  refund:       { label: "Refunds",     icon: Undo2 },
  product:      { label: "Products",    icon: Package },
  shop:         { label: "Shops",       icon: ShoppingBag },
  user:         { label: "Users",       icon: User },
  category:     { label: "Categories", icon: FolderTree },
  brand:        { label: "Brands",      icon: Tag },
  voucher:      { label: "Vouchers",    icon: TicketPercent },
  flashsale:    { label: "Flash Sales", icon: Zap },
  review:       { label: "Reviews",     icon: Star },
  banner:       { label: "Banners",     icon: Image },
  wallet:       { label: "Wallet",      icon: Wallet },
  ticket:       { label: "Tickets",     icon: Ticket },
  api_key:      { label: "API Keys",    icon: Key },
  system_config:{ label: "System",      icon: Shield },
};

function getActionConfig(action) {
  if (ACTION_CONFIG[action]) return ACTION_CONFIG[action];
  const verb = action.split(".")[1] || "";
  const colorMap = { create: "success", update: "primary", delete: "danger", approve: "success", reject: "danger" };
  return { icon: Activity, color: colorMap[verb] || "default", label: action };
}

/* ── Action Badge ──────────────────────────────────────────────────────────── */
function ActionBadge({ action = "" }) {
  const cfg = getActionConfig(action);
  const Icon = cfg.icon;
  const style = BADGE_STYLE[cfg.color] || BADGE_STYLE.default;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold font-mono ring-1 ${style.bg} ${style.text} ${style.ring} transition-all`}>
      <Icon size={11} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

/* ── Stat Card ─────────────────────────────────────────────────────────────── */
const STAT_PALETTE = {
  indigo:  { gradient: "from-indigo-500/20 to-indigo-600/5", icon: "text-indigo-400", border: "border-indigo-500/20", glow: "shadow-indigo-500/10" },
  blue:    { gradient: "from-blue-500/20 to-blue-600/5",     icon: "text-blue-400",   border: "border-blue-500/20",   glow: "shadow-blue-500/10" },
  violet:  { gradient: "from-violet-500/20 to-violet-600/5", icon: "text-violet-400", border: "border-violet-500/20", glow: "shadow-violet-500/10" },
  emerald: { gradient: "from-emerald-500/20 to-emerald-600/5", icon: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
};

function StatCard({ icon: Icon, label, value, accent = "indigo" }) {
  const p = STAT_PALETTE[accent] || STAT_PALETTE.indigo;
  return (
    <div className={`relative overflow-hidden rounded-xl border ${p.border} bg-white dark:bg-[#131620] shadow-lg ${p.glow} p-5 group hover:shadow-xl transition-all duration-300`}>
      {/* gradient wash */}
      <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-60 pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] mb-2">{label}</p>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg bg-white/50 dark:bg-[#1a1e2e]/80 ${p.icon}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

/* ── Section Label ─────────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 dark:text-[#6b7280] mb-2">{children}</p>
  );
}

/* ── Main Component ────────────────────────────────────────────────────────── */
export default function AuditLogs() {
  const { t } = useTranslation();

  const [limit,    setLimit]    = useState(20);
  const [loading,  setLoading]  = useState(true);
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);

  const [actor,      setActor]      = useState("");
  const [actionQ,    setActionQ]    = useState("");
  const [collection, setCollection] = useState("");
  const [from,       setFrom]       = useState("");
  const [to,         setTo]         = useState("");
  const [activeTab,  setActiveTab]  = useState("all");

  const [actions,     setActions]     = useState([]);
  const [collections, setCollections] = useState([]);
  const [detailLog,   setDetailLog]   = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filteredActions = useMemo(() => {
    if (activeTab === "all") return actions;
    return actions.filter((a) => a.startsWith(activeTab + "."));
  }, [actions, activeTab]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: limit };
      if (actor)      params.actor      = actor;
      if (collection) params.collection = collection;
      if (from)       params.from       = from;
      if (to)         params.to         = to;
      if (actionQ) {
        params.action = actionQ;
      } else if (activeTab !== "all") {
        params.action = activeTab + ".";
      }
      const res = await api.list(params);
      setLogs(res.data);
      setTotal(res.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [actor, actionQ, collection, from, to, page, limit, activeTab]);

  useEffect(() => {
    api.actions().then(setActions).catch(() => {});
    api.collections().then(setCollections).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); load(1); }, [actor, actionQ, collection, from, to, activeTab]);
  useEffect(() => { load(page); }, [page]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = logs.filter((l) => new Date(l.createdAt).toDateString() === today).length;
    const uniqueActors = new Set(logs.map((l) => l.actor_id?._id || l.actor_id)).size;
    const uniqueIPs = new Set(logs.filter((l) => l.ip_address).map((l) => l.ip_address)).size;
    return { todayCount, uniqueActors, uniqueIPs };
  }, [logs]);

  function exportCSV() {
    if (!logs.length) return;
    const header = ["Time", "Actor", "Email", "Action", "Collection", "Target ID", "IP Address", "Device", "Metadata"];
    const rows = logs.map((l) => {
      const ua = parseUserAgent(l.user_agent);
      return [
        formatDate(l.createdAt), l.actor_id?.full_name || l.actor_id || "System",
        l.actor_id?.email || "", l.action, l.target_collection || "",
        l.target_id || "", l.ip_address || "", ua.short,
        l.metadata ? JSON.stringify(l.metadata) : "",
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setActor(""); setActionQ(""); setCollection(""); setFrom(""); setTo(""); setActiveTab("all");
  }

  const hasFilters = actor || actionQ || collection || from || to || activeTab !== "all";

  const availableTabs = useMemo(() => {
    const prefixes = new Set(actions.map((a) => a.split(".")[0]));
    return ["all", ...Object.keys(ACTION_GROUPS).filter((k) => k !== "all" && prefixes.has(k))];
  }, [actions]);

  /* ── Table header columns ────────────────────────────────────────────────── */
  const cols = [
    { label: "#",                              cls: "w-12 text-center pl-4" },
    { label: t("admin.audit_col_actor"),       cls: "min-w-[180px]" },
    { label: t("admin.audit_col_action"),      cls: "min-w-[160px]" },
    { label: t("admin.audit_col_target"),      cls: "min-w-[180px]" },
    { label: t("admin.audit_col_ip"),          cls: "min-w-[130px]" },
    { label: "Device",                         cls: "min-w-[140px]" },
    { label: t("admin.audit_col_date"),        cls: "min-w-[170px]" },
    { label: "",                               cls: "w-14 text-center pr-4" },
  ];

  return (
    <div className="space-y-6 min-h-screen bg-zinc-50 dark:bg-[#0a0a0f] px-0 py-0">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between flex-wrap gap-4 pt-1">
        <div className="flex items-center gap-3">
          {/* accent bar */}
          <div className="w-1 h-10 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 shrink-0" />
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
              {t("admin.audit_logs")}
            </h1>
            <p className="text-xs text-zinc-400 dark:text-[#6b7280] mt-1 font-medium">
              {t("admin.audit_logs_subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load(page)}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-[#2e3347]/80 bg-white dark:bg-[#131620] text-zinc-600 dark:text-[#c8cbd4] hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm"
          >
            <RefreshCw size={13} /> {t("common.reset")}
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-600/20"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ══ STATS ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Layers}   label="Total Logs"          value={total.toLocaleString()} accent="indigo" />
        <StatCard icon={Clock}    label="Today (this page)"   value={stats.todayCount}        accent="blue" />
        <StatCard icon={User}     label="Actors (this page)"  value={stats.uniqueActors}      accent="violet" />
        <StatCard icon={Globe}    label="IPs (this page)"     value={stats.uniqueIPs}         accent="emerald" />
      </div>

      {/* ══ FILTERS + TABS PANEL ════════════════════════════════════════════ */}
      <div className="rounded-xl border border-zinc-200 dark:border-[#222738] bg-white dark:bg-[#131620] shadow-sm overflow-hidden">

        {/* Tab strip */}
        <div className="border-b border-zinc-100 dark:border-[#222738] px-4 pt-3">
          <div className="flex items-center gap-1 flex-wrap pb-0">
            {availableTabs.map((key) => {
              const grp = ACTION_GROUPS[key] || { label: key, icon: Activity };
              const GrpIcon = grp.icon;
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setActionQ(""); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-md border-b-2 transition-all duration-150 ${
                    isActive
                      ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-500/10"
                      : "border-transparent text-zinc-500 dark:text-[#9ea3b5] hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <GrpIcon size={12} />
                  {grp.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter row */}
        <div className="px-4 py-3 flex flex-wrap items-end gap-2.5">
          {/* Actor search */}
          <div className="relative w-full sm:w-52">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder={t("admin.audit_actor_placeholder")}
              className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all"
            />
          </div>

          {/* Action select */}
          <Select
            size="sm" radius="sm" variant="bordered"
            placeholder={t("admin.audit_action_placeholder")}
            selectedKeys={actionQ ? new Set([actionQ]) : new Set()}
            onSelectionChange={(k) => setActionQ(Array.from(k)[0] || "")}
            className="w-full sm:w-52"
            classNames={{
              trigger: "h-9 min-h-9 border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 data-[hover=true]:border-zinc-300 dark:data-[hover=true]:border-zinc-600",
              value: "text-xs",
            }}
            startContent={<Filter size={12} className="text-zinc-400 shrink-0" />}
          >
            {["", ...filteredActions].map((a) => (
              <SelectItem key={a} value={a} className="text-xs">{a || t("common.all")}</SelectItem>
            ))}
          </Select>

          {/* Collection select */}
          <Select
            size="sm" radius="sm" variant="bordered"
            placeholder={t("admin.audit_collection_placeholder")}
            selectedKeys={collection ? new Set([collection]) : new Set()}
            onSelectionChange={(k) => setCollection(Array.from(k)[0] || "")}
            className="w-full sm:w-44"
            classNames={{
              trigger: "h-9 min-h-9 border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 data-[hover=true]:border-zinc-300 dark:data-[hover=true]:border-zinc-600",
              value: "text-xs",
            }}
            startContent={<Database size={12} className="text-zinc-400 shrink-0" />}
          >
            {["", ...collections].map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c || t("common.all")}</SelectItem>
            ))}
          </Select>

          {/* Date from */}
          <div className="relative w-full sm:w-40">
            <label className="absolute -top-4 left-0 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{t("common.date_from")}</label>
            <input
              type="date" value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all"
            />
          </div>

          {/* Date to */}
          <div className="relative w-full sm:w-40">
            <label className="absolute -top-4 left-0 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{t("common.date_to")}</label>
            <input
              type="date" value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all mt-4 sm:mt-0"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ══ TABLE ═══════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-zinc-200 dark:border-[#222738] bg-white dark:bg-[#131620] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-xs text-zinc-400 dark:text-[#6b7280] font-medium animate-pulse">Loading logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#1a1e2e] flex items-center justify-center">
              <Search size={24} className="text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-500 dark:text-[#9ea3b5]">{t("common.no_data")}</p>
              <p className="text-xs text-zinc-400 dark:text-[#6b7280] mt-1">Thay đổi bộ lọc hoặc chọn tab khác</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-[#222738]">
                  {cols.map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 dark:text-[#6b7280] bg-zinc-50/80 dark:bg-[#1a1e2e]/40 whitespace-nowrap ${h.cls}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const rowNum = (page - 1) * limit + i + 1;
                  const ua = parseUserAgent(log.user_agent);
                  const rel = formatRelative(log.createdAt);
                  const isEven = i % 2 === 0;
                  return (
                    <tr
                      key={log._id}
                      className={`group border-b border-zinc-50 dark:border-[#222738]/60 last:border-0 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-colors duration-100 ${isEven ? "" : "bg-zinc-50/30 dark:bg-[#1a1e2e]/20"}`}
                    >
                      {/* # */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600 font-mono tabular-nums">{rowNum}</span>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-700">
                            {log.actor_id?.avatar
                              ? <img src={log.actor_id.avatar} alt="" className="w-8 h-8 object-cover rounded-full" />
                              : <User size={13} className="text-zinc-400 dark:text-[#6b7280]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-zinc-800 dark:text-[#e8eaed] truncate max-w-[150px] leading-tight">
                              {log.actor_id?.full_name || "System"}
                            </p>
                            {log.actor_id?.email && (
                              <p className="text-[10px] text-zinc-400 dark:text-[#6b7280] truncate max-w-[150px] mt-0.5 font-medium">
                                {log.actor_id.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5">
                        <ActionBadge action={log.action} />
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {log.target_collection && (
                            <span className="text-[11px] font-semibold text-zinc-600 dark:text-[#c8cbd4] bg-zinc-100 dark:bg-[#1a1e2e] px-2 py-0.5 rounded-md">
                              {log.target_collection}
                            </span>
                          )}
                          {log.target_id && (
                            <Tooltip content={log.target_id} radius="sm">
                              <span className="text-[10px] font-mono text-zinc-400 dark:text-[#6b7280] bg-zinc-100 dark:bg-[#1a1e2e]/80 px-1.5 py-0.5 rounded cursor-default border border-zinc-200 dark:border-[#2e3347]">
                                …{log.target_id.slice(-7)}
                              </span>
                            </Tooltip>
                          )}
                          {!log.target_collection && !log.target_id && (
                            <span className="text-zinc-300 dark:text-zinc-600">—</span>
                          )}
                        </div>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-[#9ea3b5] tabular-nums">
                          {log.ip_address || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </span>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3.5">
                        <Tooltip content={log.user_agent || "Unknown"} radius="sm">
                          <div className="flex items-center gap-1.5 cursor-default">
                            <Monitor size={12} className="text-zinc-400 dark:text-[#6b7280] shrink-0" />
                            <span className="text-[11px] text-zinc-500 dark:text-[#9ea3b5] truncate max-w-[110px]">{ua.short}</span>
                          </div>
                        </Tooltip>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-[12px] font-medium text-zinc-700 dark:text-[#c8cbd4] tabular-nums">{formatDate(log.createdAt)}</p>
                        {rel && <p className="text-[10px] text-zinc-400 dark:text-[#6b7280] mt-0.5">{rel}</p>}
                      </td>

                      {/* Detail button */}
                      <td className="px-4 py-3.5 text-center pr-4">
                        <button
                          onClick={() => setDetailLog(log)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e] text-zinc-500 dark:text-[#9ea3b5] hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ PAGINATION ══════════════════════════════════════════════════════ */}
      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* ══ DETAIL MODAL ════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!detailLog}
        onOpenChange={(o) => !o && setDetailLog(null)}
        radius="lg" size="2xl" backdrop="blur"
        classNames={{
          base: "bg-white dark:bg-[#131620] border border-zinc-200 dark:border-[#222738] shadow-2xl",
          header: "border-b border-zinc-100 dark:border-[#222738] pb-4",
          body: "pt-4",
          footer: "border-t border-zinc-100 dark:border-[#222738] pt-3",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">{t("admin.audit_col_detail")}</p>
                  {detailLog && (
                    <p className="text-[10px] font-mono font-normal text-zinc-400 dark:text-[#6b7280] mt-0.5">{detailLog._id}</p>
                  )}
                </div>
              </ModalHeader>

              <ModalBody className="pb-5">
                {detailLog && (
                  <div className="space-y-3">
                    {/* 2×2 info grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        {
                          label: t("admin.audit_col_actor"),
                          content: (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-700">
                                {detailLog.actor_id?.avatar
                                  ? <img src={detailLog.actor_id.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                                  : <User size={11} className="text-zinc-400" />}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-zinc-900 dark:text-[#e8eaed] leading-tight">{detailLog.actor_id?.full_name || "System"}</p>
                                {detailLog.actor_id?.email && <p className="text-[10px] text-zinc-400 dark:text-[#6b7280] font-medium">{detailLog.actor_id.email}</p>}
                              </div>
                            </div>
                          ),
                        },
                        {
                          label: t("admin.audit_col_action"),
                          content: <div className="mt-2"><ActionBadge action={detailLog.action} /></div>,
                        },
                        {
                          label: t("admin.audit_col_ip"),
                          content: (
                            <p className="mt-1.5 text-sm font-mono font-medium text-zinc-700 dark:text-[#c8cbd4] flex items-center gap-1.5">
                              <Globe size={13} className="text-zinc-400" /> {detailLog.ip_address || "—"}
                            </p>
                          ),
                        },
                        {
                          label: t("admin.audit_col_date"),
                          content: (
                            <p className="mt-1.5 text-sm font-medium text-zinc-700 dark:text-[#c8cbd4] flex items-center gap-1.5 tabular-nums">
                              <Clock size={13} className="text-zinc-400" /> {formatDate(detailLog.createdAt)}
                            </p>
                          ),
                        },
                      ].map((card, i) => (
                        <div key={i} className="p-3.5 rounded-xl border border-zinc-100 dark:border-[#222738] bg-zinc-50 dark:bg-[#1a1e2e]/50">
                          <SectionLabel>{card.label}</SectionLabel>
                          {card.content}
                        </div>
                      ))}
                    </div>

                    {/* Target */}
                    <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-[#222738] bg-zinc-50 dark:bg-[#1a1e2e]/50">
                      <SectionLabel>{t("admin.audit_col_target")}</SectionLabel>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Database size={13} className="text-zinc-400 shrink-0" />
                        <span className="text-sm font-semibold text-zinc-700 dark:text-[#c8cbd4]">{detailLog.target_collection || "—"}</span>
                        {detailLog.target_id && (
                          <span className="text-[11px] font-mono text-zinc-500 dark:text-[#9ea3b5] bg-white dark:bg-[#131620] px-2 py-0.5 rounded-md border border-zinc-200 dark:border-[#2e3347] break-all">
                            {detailLog.target_id}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* User Agent */}
                    <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-[#222738] bg-zinc-50 dark:bg-[#1a1e2e]/50">
                      <SectionLabel>User Agent</SectionLabel>
                      <div className="flex items-center gap-2 mt-1.5 mb-1.5">
                        <Monitor size={13} className="text-zinc-400 shrink-0" />
                        <span className="text-sm font-semibold text-zinc-700 dark:text-[#c8cbd4]">{parseUserAgent(detailLog.user_agent).short}</span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400 dark:text-[#6b7280] break-all leading-relaxed bg-white dark:bg-[#131620] rounded-lg p-2.5 border border-zinc-100 dark:border-[#2e3347]/50">
                        {detailLog.user_agent || "—"}
                      </p>
                    </div>

                    {/* Metadata */}
                    {detailLog.metadata && Object.keys(detailLog.metadata).length > 0 && (
                      <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-[#222738] bg-zinc-50 dark:bg-[#1a1e2e]/50">
                        <SectionLabel>Metadata</SectionLabel>
                        <div className="mt-1.5 space-y-0 rounded-lg overflow-hidden border border-zinc-100 dark:border-[#2e3347]/50 bg-white dark:bg-[#131620]">
                          {Object.entries(detailLog.metadata).map(([key, val], idx, arr) => (
                            <div
                              key={key}
                              className={`flex items-start gap-3 px-3 py-2.5 ${idx !== arr.length - 1 ? "border-b border-zinc-50 dark:border-[#222738]" : ""}`}
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] min-w-[80px] shrink-0 mt-0.5">{key}</span>
                              <span className="text-[11px] font-mono text-zinc-700 dark:text-[#c8cbd4] break-all leading-relaxed">
                                {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>

              <ModalFooter className="pt-3">
                <button
                  onClick={onClose}
                  className="h-9 px-5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e] text-zinc-600 dark:text-[#c8cbd4] hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                >
                  {t("common.cancel")}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}