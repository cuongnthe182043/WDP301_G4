import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner, Chip, Avatar,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea, Tooltip,
  Tabs, Tab, Badge, Progress,
} from "@heroui/react";
import {
  Search, RefreshCw, Eye, ShieldBan, ShieldCheck, AlertTriangle, Shield,
  Users, Activity, FileWarning, Flag, Scale, Zap, TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import moderationService from "../../services/moderationService";
import UserModerationDetail from "./UserModerationDetail";
import PaginationBar from "../../components/ui/PaginationBar";

const STATUS_COLOR = {
  active: "success", warning: "warning", suspended: "danger",
  banned_permanent: "danger", banned: "danger", inactive: "default",
};

const SEVERITY_COLOR = { 1: "default", 2: "warning", 3: "danger", 4: "danger" };

function useLocaleDate() {
  const { i18n } = useTranslation();
  const locale = i18n.language === "vi" ? "vi-VN" : "en-US";
  const formatDate = (d) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const formatDateTime = (d) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleString(locale);
  };
  return { formatDate, formatDateTime };
}

// ---------------------------------------------------------------------------
// Stats cards
// ---------------------------------------------------------------------------
function StatsCards({ stats, loading }) {
  const { t } = useTranslation();
  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!stats) return null;

  const cards = [
    { label: t("admin.mod_stat_total_users"),       value: stats.totalUsers,        icon: Users,         color: "primary" },
    { label: t("admin.mod_stat_active"),             value: stats.activeUsers,       icon: Activity,      color: "success" },
    { label: t("admin.mod_stat_banned"),             value: stats.bannedUsers,       icon: ShieldBan,     color: "danger" },
    { label: t("admin.mod_stat_warnings"),           value: stats.warningUsers,      icon: AlertTriangle, color: "warning" },
    { label: t("admin.mod_stat_pending_reports"),    value: stats.pendingReports,    icon: Flag,          color: "secondary" },
    { label: t("admin.mod_stat_pending_violations"), value: stats.pendingViolations, icon: FileWarning,   color: "warning" },
    { label: t("admin.mod_stat_pending_appeals"),    value: stats.pendingAppeals,    icon: Scale,         color: "primary" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} radius="xl" shadow="sm">
          <CardBody className="p-3 flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-lg bg-${color}/10 flex items-center justify-center`}>
              <Icon size={16} className={`text-${color}`} />
            </div>
            <p className="text-lg font-bold text-default-800">{value ?? 0}</p>
            <p className="text-[10px] text-default-400 text-center leading-tight">{label}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------
function UsersTab({ onRefreshStats }) {
  const { t } = useTranslation();
  const { formatDate } = useLocaleDate();
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("");

  // Modals
  const [detailUser, setDetailUser] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [banDays, setBanDays] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banLoading, setBanLoading] = useState(false);
  const [warnTarget, setWarnTarget] = useState(null);
  const [warnReason, setWarnReason] = useState("");
  const [warnLoading, setWarnLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: limit };
      if (q) params.q = q;
      if (statusFilter) params.status = statusFilter;
      if (sortBy) params.sort_by = sortBy;
      const data = await moderationService.listUsers(params);
      setUsers(data.items);
      setTotal(data.total);
    } catch { toast.error(t("admin.load_failed")); }
    finally { setLoading(false); }
  }, [q, statusFilter, sortBy, limit]);

  useEffect(() => { setPage(1); load(1); }, [q, statusFilter, sortBy]); // eslint-disable-line
  useEffect(() => { load(page); }, [page]); // eslint-disable-line

  async function handleBan() {
    setBanLoading(true);
    try {
      await moderationService.banUser(banTarget._id, {
        days: banDays ? Number(banDays) : undefined,
        reason: banReason,
      });
      toast.success(t("admin.users_banned_ok"));
      setBanTarget(null); setBanDays(""); setBanReason("");
      load(page);
      onRefreshStats();
    } catch (e) { toast.error(e.message); }
    finally { setBanLoading(false); }
  }

  async function handleUnban(user) {
    try {
      await moderationService.unbanUser(user._id);
      toast.success(t("admin.users_unbanned_ok"));
      load(page);
      onRefreshStats();
    } catch (e) { toast.error(e.message); }
  }

  async function handleWarn() {
    setWarnLoading(true);
    try {
      await moderationService.warnUser(warnTarget._id, { reason: warnReason });
      toast.success(t("admin.users_warned_ok"));
      setWarnTarget(null); setWarnReason("");
      load(page);
      onRefreshStats();
    } catch (e) { toast.error(e.message); }
    finally { setWarnLoading(false); }
  }

  // Detail modal
  if (detailUser) {
    return (
      <UserModerationDetail
        userId={detailUser._id}
        onBack={() => { setDetailUser(null); load(page); }}
        onBan={(u) => { setDetailUser(null); setBanTarget(u); }}
        onUnban={(u) => { handleUnban(u); setDetailUser(null); }}
        onWarn={(u) => { setDetailUser(null); setWarnTarget(u); }}
      />
    );
  }

  return (
    <>
      {/* Filters */}
      <Card radius="xl" shadow="sm" className="mb-4">
        <CardBody className="p-3 flex flex-row gap-3 flex-wrap">
          <Input
            size="sm" className="flex-1 min-w-[180px]"
            placeholder={t("admin.mod_search_placeholder")}
            startContent={<Search size={14} className="text-default-400" />}
            value={q} onValueChange={setQ}
          />
          <Select
            size="sm" className="w-36"
            placeholder={t("admin.mod_filter_status")}
            selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
            onSelectionChange={(k) => setStatusFilter(Array.from(k)[0] || "")}
          >
            {[
              { key: "", label: t("admin.mod_filter_all") },
              { key: "active", label: t("admin.mod_status_active") },
              { key: "warning", label: t("admin.mod_status_warning") },
              { key: "banned", label: t("admin.mod_status_banned") },
            ].map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </Select>
          <Select
            size="sm" className="w-44"
            placeholder={t("admin.mod_sort_by")}
            selectedKeys={sortBy ? new Set([sortBy]) : new Set()}
            onSelectionChange={(k) => setSortBy(Array.from(k)[0] || "")}
          >
            {[
              { key: "", label: t("admin.mod_sort_newest") },
              { key: "trust_score_asc", label: t("admin.mod_sort_trust_asc") },
              { key: "trust_score_desc", label: t("admin.mod_sort_trust_desc") },
              { key: "warnings", label: t("admin.mod_sort_warnings") },
            ].map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </Select>
        </CardBody>
      </Card>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-default-400">
              <Users size={36} />
              <p className="text-sm">{t("admin.mod_no_users")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-default-50 border-b border-divider">
                  <tr>
                    {[
                      t("admin.user_detail_username"),
                      t("admin.user_detail_status"),
                      t("admin.mod_trust_score"),
                      t("admin.user_detail_warnings"),
                      t("admin.user_detail_ban_until"),
                      t("common.actions"),
                    ].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => {
                    const isBanned = user.is_banned || user.status === "suspended" || user.status === "banned_permanent" || user.status === "banned";
                    return (
                      <tr key={user._id} className={`border-b border-divider last:border-0 ${i % 2 ? "bg-default-50/40" : ""} ${isBanned ? "bg-danger-50/20" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar src={user.avatar_url} name={user.name?.charAt(0)} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-default-800 text-[13px] truncate">{user.name}</p>
                              <p className="text-default-400 text-[11px]">{user.email}</p>
                              <Chip size="sm" variant="flat" color={user.role_id?.name === "shop_owner" ? "warning" : "primary"} className="mt-0.5">
                                {user.role_id?.name || "\u2014"}
                              </Chip>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Chip size="sm" color={STATUS_COLOR[user.status] || "default"} variant="flat">
                            {t(`admin.mod_status_${user.status}`, user.status)}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress
                              size="sm" className="w-16"
                              value={user.trust_score ?? 80}
                              color={user.trust_score >= 60 ? "success" : user.trust_score >= 30 ? "warning" : "danger"}
                            />
                            <span className="text-xs font-mono font-semibold">{user.trust_score ?? 80}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {user.warning_count > 0 ? (
                            <Chip size="sm" color={user.warning_count >= 3 ? "danger" : "warning"} variant="flat">
                              {user.warning_count}x
                            </Chip>
                          ) : <span className="text-default-300 text-xs">{"\u2014"}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isBanned ? (
                            <div>
                              <Chip size="sm" color="danger" variant="flat">
                                {user.ban_type === "permanent" || user.status === "banned_permanent"
                                  ? t("moderation_account.ban_permanent_label")
                                  : t("moderation_account.ban_temporary_label")}
                              </Chip>
                              {user.ban_end && (
                                <p className="text-[10px] text-danger-500 mt-0.5">{formatDate(user.ban_end)}</p>
                              )}
                            </div>
                          ) : <span className="text-default-300 text-xs">{"\u2014"}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Tooltip content={t("common.view")}>
                              <Button isIconOnly size="sm" variant="light" onPress={() => setDetailUser(user)}>
                                <Eye size={14} />
                              </Button>
                            </Tooltip>
                            <Tooltip content={t("admin.warn")}>
                              <Button isIconOnly size="sm" variant="light" color="warning" onPress={() => setWarnTarget(user)}>
                                <AlertTriangle size={14} />
                              </Button>
                            </Tooltip>
                            {isBanned ? (
                              <Tooltip content={t("admin.unban")}>
                                <Button isIconOnly size="sm" variant="light" color="success" onPress={() => handleUnban(user)}>
                                  <ShieldCheck size={14} />
                                </Button>
                              </Tooltip>
                            ) : (
                              <Tooltip content={t("admin.ban")}>
                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => setBanTarget(user)}>
                                  <ShieldBan size={14} />
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* Ban Modal */}
      <Modal isOpen={!!banTarget} onClose={() => { setBanTarget(null); setBanDays(""); setBanReason(""); }} size="md">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <ShieldBan size={18} className="text-danger" />
            {t("admin.users_ban_title", { name: banTarget?.name })}
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Select
              label={t("admin.users_ban_days_label")}
              placeholder={t("admin.users_ban_days_placeholder")}
              selectedKeys={banDays ? new Set([banDays]) : new Set()}
              onSelectionChange={(k) => setBanDays(Array.from(k)[0] || "")}
            >
              {[
                { key: "3",  label: `3 ${t("common.days")}` },
                { key: "7",  label: `7 ${t("common.days")}` },
                { key: "30", label: `30 ${t("common.days")}` },
                { key: "",   label: t("moderation_account.ban_permanent_label") },
              ].map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </Select>
            <Textarea
              label={t("admin.users_ban_reason_label")}
              placeholder={t("admin.users_ban_reason_placeholder")}
              value={banReason} onValueChange={setBanReason}
              minRows={2}
            />
            {!banDays && (
              <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 text-xs text-danger-700">
                <strong>{t("common.warning")}:</strong> {t("admin.users_ban_days_hint")}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => { setBanTarget(null); setBanDays(""); setBanReason(""); }}>{t("common.cancel")}</Button>
            <Button color="danger" isLoading={banLoading} onPress={handleBan}>
              {t("admin.users_ban_confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Warn Modal */}
      <Modal isOpen={!!warnTarget} onClose={() => { setWarnTarget(null); setWarnReason(""); }} size="sm">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning" />
            {t("admin.users_warn_title", { name: warnTarget?.name })}
          </ModalHeader>
          <ModalBody>
            <Textarea
              label={t("admin.users_warn_reason_label")}
              placeholder={t("admin.users_warn_reason_placeholder")}
              value={warnReason} onValueChange={setWarnReason}
              minRows={2}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => { setWarnTarget(null); setWarnReason(""); }}>{t("common.cancel")}</Button>
            <Button color="warning" isLoading={warnLoading} onPress={handleWarn}>{t("admin.users_warn_confirm")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Violations tab
// ---------------------------------------------------------------------------
function ViolationsTab() {
  const { t } = useTranslation();
  const { formatDateTime } = useLocaleDate();
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await moderationService.listViolations({ page: p, limit: limit, status: statusFilter || undefined });
      setItems(data.items);
      setTotal(data.total);
    } catch { toast.error(t("admin.load_failed")); }
    finally { setLoading(false); }
  }, [statusFilter, limit]);

  useEffect(() => { setPage(1); load(1); }, [statusFilter]); // eslint-disable-line
  useEffect(() => { load(page); }, [page]); // eslint-disable-line

  async function handleReview(id, status) {
    try {
      await moderationService.reviewViolation(id, { status });
      toast.success(`${t("admin.mod_review_violation")}: ${status}`);
      load(page);
    } catch (e) { toast.error(e.message); }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <div className="flex gap-3 mb-4">
        <Select
          size="sm" className="w-36"
          placeholder={t("admin.mod_filter_status")}
          selectedKeys={new Set([statusFilter])}
          onSelectionChange={(k) => setStatusFilter(Array.from(k)[0] || "")}
        >
          {[
            { key: "", label: t("admin.mod_filter_all") },
            { key: "pending", label: t("admin.mod_appeal_status_pending") },
            { key: "confirmed", label: t("admin.mod_confirm_violation") },
            { key: "dismissed", label: t("admin.mod_dismiss_violation") },
          ].map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
        </Select>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-default-400">
              <FileWarning size={36} />
              <p className="text-sm">{t("admin.mod_no_violations")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-default-50 border-b border-divider">
                  <tr>
                    {[
                      t("admin.user_detail_username"),
                      t("common.type"),
                      t("common.severity"),
                      t("common.description"),
                      "Auto?",
                      t("common.status"),
                      t("common.date"),
                      t("common.actions"),
                    ].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((v, i) => (
                    <tr key={v._id} className={`border-b border-divider last:border-0 ${i % 2 ? "bg-default-50/40" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={v.user_id?.avatar_url} name={v.user_id?.name?.charAt(0)} size="sm" />
                          <div>
                            <p className="font-semibold text-[13px]">{v.user_id?.name || "\u2014"}</p>
                            <p className="text-[11px] text-default-400">{v.user_id?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Chip size="sm" variant="flat">{t(`admin.mod_violation_${v.type}`, v.type)}</Chip>
                      </td>
                      <td className="px-4 py-3">
                        <Chip size="sm" color={SEVERITY_COLOR[v.severity]} variant="flat">
                          L{v.severity} - {t(`admin.mod_severity_${v.severity}`)}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-default-600 truncate">{v.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        {v.auto_detected ? (
                          <Chip size="sm" color="secondary" variant="flat">Auto</Chip>
                        ) : <span className="text-default-300 text-xs">Manual</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Chip size="sm" color={v.status === "pending" ? "warning" : v.status === "confirmed" ? "danger" : "default"} variant="flat">
                          {v.status}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 text-xs text-default-500">{formatDateTime(v.createdAt)}</td>
                      <td className="px-4 py-3">
                        {v.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" color="danger" variant="flat" onPress={() => handleReview(v._id, "confirmed")}>
                              {t("admin.mod_confirm_violation")}
                            </Button>
                            <Button size="sm" variant="flat" onPress={() => handleReview(v._id, "dismissed")}>
                              {t("admin.mod_dismiss_violation")}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------
function ReportsTab() {
  const { t } = useTranslation();
  const { formatDateTime } = useLocaleDate();
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveNote, setResolveNote] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await moderationService.listReports({ page: p, limit: limit, status: statusFilter || undefined });
      setItems(data.items);
      setTotal(data.total);
    } catch { toast.error(t("admin.load_failed")); }
    finally { setLoading(false); }
  }, [statusFilter, limit]);

  useEffect(() => { setPage(1); load(1); }, [statusFilter]); // eslint-disable-line
  useEffect(() => { load(page); }, [page]); // eslint-disable-line

  async function handleResolve(status) {
    try {
      await moderationService.resolveReport(resolveTarget._id, { status, resolution_note: resolveNote });
      toast.success(`${t("admin.mod_confirm_resolve")}: ${status}`);
      setResolveTarget(null); setResolveNote("");
      load(page);
    } catch (e) { toast.error(e.message); }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <div className="flex gap-3 mb-4">
        <Select
          size="sm" className="w-36"
          placeholder={t("admin.mod_filter_status")}
          selectedKeys={new Set([statusFilter])}
          onSelectionChange={(k) => setStatusFilter(Array.from(k)[0] || "")}
        >
          {[
            { key: "", label: t("admin.mod_filter_all") },
            { key: "pending", label: t("admin.mod_report_status_pending") },
            { key: "resolved", label: t("admin.mod_report_status_resolved") },
            { key: "rejected", label: t("admin.mod_report_status_rejected") },
          ].map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
        </Select>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-default-400">
              <Flag size={36} />
              <p className="text-sm">{t("admin.mod_no_reports")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-default-50 border-b border-divider">
                  <tr>
                    {["Reporter", "Target", t("common.reason"), t("common.status"), t("common.date"), t("common.actions")].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={r._id} className={`border-b border-divider last:border-0 ${i % 2 ? "bg-default-50/40" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={r.reporter_id?.avatar_url} name={r.reporter_id?.name?.charAt(0)} size="sm" />
                          <p className="text-[13px] font-medium">{r.reporter_id?.name || "\u2014"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={r.target_id?.avatar_url} name={r.target_id?.name?.charAt(0)} size="sm" />
                          <div>
                            <p className="text-[13px] font-medium">{r.target_id?.name || "\u2014"}</p>
                            <Chip size="sm" variant="flat" color={r.target_id?.status === "active" ? "success" : "danger"}>
                              {t(`admin.mod_status_${r.target_id?.status}`, r.target_id?.status)}
                            </Chip>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium">{r.reason}</p>
                        {r.description && <p className="text-[11px] text-default-400 truncate max-w-[150px]">{r.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Chip size="sm" color={r.status === "pending" ? "warning" : r.status === "resolved" ? "success" : "default"} variant="flat">
                          {t(`admin.mod_report_status_${r.status}`, r.status)}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 text-xs text-default-500">{formatDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        {r.status === "pending" && (
                          <Button size="sm" variant="flat" color="primary" onPress={() => setResolveTarget(r)}>{t("admin.mod_review_violation")}</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* Resolve Modal */}
      <Modal isOpen={!!resolveTarget} onClose={() => { setResolveTarget(null); setResolveNote(""); }} size="sm">
        <ModalContent>
          <ModalHeader>{t("admin.mod_confirm_resolve")}</ModalHeader>
          <ModalBody>
            <div className="bg-default-50 rounded-xl p-3 text-xs mb-3">
              <p><strong>Reporter:</strong> {resolveTarget?.reporter_id?.name}</p>
              <p><strong>Target:</strong> {resolveTarget?.target_id?.name}</p>
              <p><strong>{t("common.reason")}:</strong> {resolveTarget?.reason}</p>
            </div>
            <Textarea
              label={t("admin.mod_resolution_note")}
              placeholder={t("admin.mod_resolution_note") + "..."}
              value={resolveNote} onValueChange={setResolveNote}
              minRows={2}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => handleResolve("rejected")}>{t("admin.mod_confirm_reject")}</Button>
            <Button color="success" onPress={() => handleResolve("resolved")}>{t("admin.mod_confirm_resolve")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Appeals tab
// ---------------------------------------------------------------------------
function AppealsTab() {
  const { t } = useTranslation();
  const { formatDate, formatDateTime } = useLocaleDate();
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await moderationService.listAppeals({ page: p, limit: limit, status: "pending" });
      setItems(data.items);
      setTotal(data.total);
    } catch { toast.error(t("admin.load_failed")); }
    finally { setLoading(false); }
  }, [limit]);

  useEffect(() => { load(1); }, []); // eslint-disable-line
  useEffect(() => { load(page); }, [page]); // eslint-disable-line

  async function handleReview(status) {
    try {
      await moderationService.reviewAppeal(reviewTarget._id, { status, admin_note: adminNote });
      toast.success(`${t("admin.mod_tab_appeals")}: ${status}`);
      setReviewTarget(null); setAdminNote("");
      load(page);
    } catch (e) { toast.error(e.message); }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Card radius="xl" shadow="sm">
      <CardBody className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-default-400">
            <Scale size={36} />
            <p className="text-sm">{t("admin.mod_no_appeals")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-divider">
                <tr>
                  {[
                    t("admin.user_detail_username"),
                    t("moderation_account.ban_reason_label"),
                    t("moderation_account.appeal_title"),
                    t("common.date"),
                    t("common.actions"),
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((a, i) => (
                  <tr key={a._id} className={`border-b border-divider last:border-0 ${i % 2 ? "bg-default-50/40" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={a.user_id?.avatar_url} name={a.user_id?.name?.charAt(0)} size="sm" />
                        <div>
                          <p className="font-semibold text-[13px]">{a.user_id?.name}</p>
                          <p className="text-[11px] text-default-400">{a.user_id?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-default-600 max-w-[150px] truncate">
                      {a.user_id?.ban_reason || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-xs text-default-600 max-w-[200px]">
                      {a.reason}
                    </td>
                    <td className="px-4 py-3 text-xs text-default-500">{formatDateTime(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="flat" color="primary" onPress={() => setReviewTarget(a)}>
                        {t("admin.mod_review_violation")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* Review Appeal Modal */}
      <Modal isOpen={!!reviewTarget} onClose={() => { setReviewTarget(null); setAdminNote(""); }} size="md">
        <ModalContent>
          <ModalHeader>{t("admin.mod_tab_appeals")} - {t("admin.mod_review_violation")}</ModalHeader>
          <ModalBody>
            <div className="bg-default-50 rounded-xl p-3 space-y-2 text-xs mb-3">
              <p><strong>{t("admin.user_detail_username")}:</strong> {reviewTarget?.user_id?.name} ({reviewTarget?.user_id?.email})</p>
              <p><strong>{t("moderation_account.ban_reason_label")}:</strong> {reviewTarget?.user_id?.ban_reason || "\u2014"}</p>
              <p><strong>{t("admin.user_detail_ban_until")}:</strong> {formatDate(reviewTarget?.user_id?.ban_end)}</p>
              <p><strong>{t("moderation_account.appeal_title")}:</strong> {reviewTarget?.reason}</p>
            </div>
            <Textarea
              label={t("admin.mod_admin_note")}
              placeholder={t("admin.mod_admin_note") + "..."}
              value={adminNote} onValueChange={setAdminNote}
              minRows={2}
            />
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="flat" onPress={() => handleReview("rejected")}>{t("admin.mod_reject_appeal")}</Button>
            <Button color="success" onPress={() => handleReview("approved")}>{t("admin.mod_approve_appeal")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AdminModeration() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detectionLoading, setDetectionLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await moderationService.getDashboard();
      setStats(data);
    } catch { /* ignore */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, []); // eslint-disable-line

  async function handleRunDetection() {
    setDetectionLoading(true);
    try {
      const res = await moderationService.runDetection();
      const total = Object.values(res.data || {}).reduce((s, arr) => s + (arr?.length || 0), 0);
      toast.success(`${t("admin.mod_run_detection_success")} (${total})`);
      loadStats();
    } catch (e) { toast.error(e.message); }
    finally { setDetectionLoading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900 flex items-center gap-2">
            <Shield size={22} /> {t("admin.moderation_title")}
          </h1>
          <p className="text-sm text-default-500 mt-0.5">{t("admin.moderation_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="flat" color="warning"
            startContent={<Zap size={14} />}
            isLoading={detectionLoading}
            onPress={handleRunDetection}
          >
            {t("admin.mod_run_detection")}
          </Button>
          <Button size="sm" variant="flat" startContent={<RefreshCw size={14} />} onPress={loadStats}>
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} loading={statsLoading} />

      {/* Tabs */}
      <Tabs
        aria-label="Moderation tabs"
        color="primary"
        variant="underlined"
        classNames={{ tabList: "gap-6" }}
      >
        <Tab
          key="users"
          title={
            <div className="flex items-center gap-2">
              <Users size={14} /> {t("admin.mod_tab_users")}
            </div>
          }
        >
          <div className="mt-4">
            <UsersTab onRefreshStats={loadStats} />
          </div>
        </Tab>
        <Tab
          key="violations"
          title={
            <div className="flex items-center gap-2">
              <FileWarning size={14} /> {t("admin.mod_tab_violations")}
              {stats?.pendingViolations > 0 && (
                <Badge content={stats.pendingViolations} color="warning" size="sm" />
              )}
            </div>
          }
        >
          <div className="mt-4"><ViolationsTab /></div>
        </Tab>
        <Tab
          key="reports"
          title={
            <div className="flex items-center gap-2">
              <Flag size={14} /> {t("admin.mod_tab_reports")}
              {stats?.pendingReports > 0 && (
                <Badge content={stats.pendingReports} color="danger" size="sm" />
              )}
            </div>
          }
        >
          <div className="mt-4"><ReportsTab /></div>
        </Tab>
        <Tab
          key="appeals"
          title={
            <div className="flex items-center gap-2">
              <Scale size={14} /> {t("admin.mod_tab_appeals")}
              {stats?.pendingAppeals > 0 && (
                <Badge content={stats.pendingAppeals} color="primary" size="sm" />
              )}
            </div>
          }
        >
          <div className="mt-4"><AppealsTab /></div>
        </Tab>
      </Tabs>
    </div>
  );
}
