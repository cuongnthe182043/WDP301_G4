import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Chip, Select, SelectItem, Avatar, Tabs, Tab,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner, Input,
} from "@heroui/react";
import { CheckCircle, Trash2, AlertTriangle, Ban, ShieldOff, Star, Eye, EyeOff } from "lucide-react";
import apiClient from "../../services/apiClient";
import { useToast } from "../../components/common/ToastProvider";
import PaginationBar from "../../components/ui/PaginationBar";

// ─── API helpers ─────────────────────────────────────────────────────────────
const adminApi = {
  reviews:      (p) => apiClient.get("/admin/moderation/reviews", { params: p }).then(r => r.data),
  approve:      (id) => apiClient.patch(`/admin/moderation/reviews/${id}/approve`).then(r => r.data),
  toggleHide:   (id) => apiClient.patch(`/admin/moderation/reviews/${id}/hide`).then(r => r.data),
  delete:       (id) => apiClient.patch(`/admin/moderation/reviews/${id}/delete`).then(r => r.data),
  users:        (p) => apiClient.get("/admin/moderation/users", { params: p }).then(r => r.data),
  warn:         (id, reason) => apiClient.post(`/admin/moderation/users/${id}/warn`, { reason }).then(r => r.data),
  ban:          (id, days, reason) => apiClient.post(`/admin/moderation/users/${id}/ban`, { days, reason }).then(r => r.data),
  unban:        (id) => apiClient.post(`/admin/moderation/users/${id}/unban`).then(r => r.data),
};

const STATUS_COLOR = { visible: "success", hidden: "warning", pending: "danger", deleted: "default" };
const formatDate   = (d) => d ? new Date(d).toLocaleString("vi-VN") : "—";

function StarRow({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={11} className={i <= value ? "text-warning fill-warning" : "text-default-200"} />
      ))}
    </div>
  );
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────
function ReviewsTab() {
  const { t } = useTranslation();
  const toast = useToast();

  const STATUS_LABEL = {
    visible: t("admin.review_status_visible"),
    hidden:  t("admin.review_status_hidden"),
    pending: t("admin.review_status_pending"),
    deleted: t("admin.review_status_deleted"),
  };

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [tp, setTp]           = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [limit, setLimit] = useState(20);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const res = await adminApi.reviews({ page: pg, limit: limit, status: statusFilter || undefined });
      setReviews(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTp(Math.ceil((res.data?.total || 0) / limit));
    } catch { toast.error(t("admin.refund_load_error")); }
    finally { setLoading(false); }
  }, [page, limit, statusFilter]);

  useEffect(() => { load(page); }, [page, statusFilter]);

  const approve = async (id) => {
    try { await adminApi.approve(id); toast.success(t("admin.admin_review_approve")); load(page); }
    catch (e) { toast.error(e?.message); }
  };
  const toggleHide = async (id, currentStatus) => {
    try {
      const res = await adminApi.toggleHide(id);
      toast.success(res.data?.status === "hidden" ? t("admin.admin_review_hide") : t("admin.admin_review_show"));
      load(page);
    } catch (e) { toast.error(e?.message); }
  };
  const remove = async (id) => {
    if (!confirm(t("admin.admin_review_delete"))) return;
    try { await adminApi.delete(id); toast.success(t("admin.admin_review_delete")); load(page); }
    catch (e) { toast.error(e?.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select size="sm" className="w-40" radius="lg"
          selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
          onSelectionChange={(k) => { setStatusFilter(Array.from(k)[0] || ""); setPage(1); }}>
          <SelectItem key="pending">{t("admin.review_status_pending")}</SelectItem>
          <SelectItem key="hidden">{t("admin.review_status_hidden")}</SelectItem>
          <SelectItem key="visible">{t("admin.review_status_visible")}</SelectItem>
        </Select>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0">
          {loading ? <div className="flex justify-center py-10"><Spinner /></div>
          : reviews.length === 0 ? <p className="text-center py-10 text-default-400">{t("admin.admin_review_none")}</p>
          : (
            <div className="divide-y divide-default-100">
              {reviews.map((r) => (
                <div key={r._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar src={r.user_id?.avatar_url} size="sm" name={r.user_id?.username?.[0]?.toUpperCase()} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{r.user_id?.username || "—"}</span>
                          <StarRow value={r.rating} />
                          <Chip size="sm" color={STATUS_COLOR[r.status]} variant="flat">
                            {STATUS_LABEL[r.status] || r.status}
                          </Chip>
                          <span className="text-xs text-default-400">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-default-700 mt-1">{r.comment || <em className="text-default-400">{t("admin.admin_review_no_content")}</em>}</p>
                        {r.flagged_reason && (
                          <p className="text-xs text-danger mt-1 flex items-center gap-1">
                            <AlertTriangle size={11} /> {r.flagged_reason}
                          </p>
                        )}
                        {r.product_id && <p className="text-xs text-default-400 mt-1">{t("admin.admin_review_product_label")} {r.product_id.name}</p>}
                        {r.user_id && (
                          <p className="text-xs text-default-400">
                            {t("admin.admin_review_warning_label")} <span className="font-bold text-warning">{r.user_id.warning_count || 0}</span>
                            {r.user_id.status === "banned" && <Chip size="sm" color="danger" variant="flat" className="ml-1">{t("admin.admin_review_banned")}</Chip>}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {r.status !== "visible" && (
                        <Button size="sm" variant="flat" color="success" startContent={<CheckCircle size={12} />}
                          onPress={() => approve(r._id)}>
                          {t("admin.admin_review_approve")}
                        </Button>
                      )}
                      <Button size="sm" variant="flat" color="warning" isIconOnly
                        title={r.status === "hidden" ? t("admin.admin_review_show") : t("admin.admin_review_hide")}
                        onPress={() => toggleHide(r._id, r.status)}>
                        {r.status === "hidden" ? <Eye size={14} /> : <EyeOff size={14} />}
                      </Button>
                      <Button size="sm" variant="flat" color="danger" isIconOnly onPress={() => remove(r._id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [tp, setTp]           = useState(1);

  // Ban modal
  const [banTarget, setBanTarget] = useState(null);
  const [banDays,   setBanDays]   = useState("");
  const [banReason, setBanReason] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [limit, setLimit] = useState(20);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const res = await adminApi.users({ page: pg, limit: limit });
      setUsers(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTp(Math.ceil((res.data?.total || 0) / limit));
    } catch { toast.error(t("admin.refund_load_error")); }
    finally { setLoading(false); }
  }, [page, limit]);

  useEffect(() => { load(page); }, [page]);

  const warn = async (id) => {
    try { await adminApi.warn(id, t("admin.warn")); toast.success(t("admin.warn")); load(page); }
    catch (e) { toast.error(e?.message); }
  };

  const submitBan = async () => {
    if (!banTarget) return;
    setSaving(true);
    try {
      await adminApi.ban(banTarget._id, banDays ? Number(banDays) : undefined, banReason || undefined);
      toast.success(t("admin.ban"));
      setBanTarget(null);
      load(page);
    } catch (e) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  const unban = async (id) => {
    try { await adminApi.unban(id); toast.success(t("admin.unban")); load(page); }
    catch (e) { toast.error(e?.message); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-default-400">{t("admin.admin_users_total", { count: total })}</p>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? <div className="flex justify-center py-10"><Spinner /></div>
          : users.length === 0 ? <p className="text-center py-10 text-default-400">{t("admin.admin_users_none")}</p>
          : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {[
                    t("admin.admin_users_col_user"),
                    t("admin.admin_users_col_email"),
                    t("admin.admin_users_col_violations"),
                    t("admin.admin_users_col_status"),
                    t("admin.admin_users_col_banned_until"),
                    "",
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-default-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm">{u.name}</div>
                      <div className="text-xs text-default-400">@{u.username}</div>
                    </td>
                    <td className="px-4 py-3 text-default-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={u.warning_count >= 5 ? "danger" : u.warning_count >= 3 ? "warning" : "default"} variant="flat">
                        {t("admin.admin_users_violations", { count: u.warning_count })}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={u.status === "banned" ? "danger" : "success"} variant="flat">
                        {u.status === "banned" ? t("admin.admin_users_banned") : t("admin.admin_users_active")}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-xs text-default-400">
                      {u.ban_until
                        ? new Date(u.ban_until).toLocaleDateString("vi-VN")
                        : u.status === "banned"
                          ? t("admin.admin_users_permanent")
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {u.status !== "banned" && (
                          <>
                            <Button size="sm" variant="light" color="warning" onPress={() => warn(u._id)}
                              startContent={<AlertTriangle size={12} />}>
                              {t("admin.admin_users_warn_btn")}
                            </Button>
                            <Button size="sm" variant="flat" color="danger" onPress={() => { setBanTarget(u); setBanDays(""); setBanReason(""); }}
                              startContent={<Ban size={12} />}>
                              {t("admin.admin_users_ban_btn")}
                            </Button>
                          </>
                        )}
                        {u.status === "banned" && (
                          <Button size="sm" variant="flat" color="success" onPress={() => unban(u._id)}
                            startContent={<ShieldOff size={12} />}>
                            {t("admin.admin_users_unban_btn")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* Ban Modal */}
      <Modal isOpen={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("admin.admin_ban_title", { name: banTarget?.name })}</ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label={t("admin.admin_ban_days")}
                  type="number" min="1"
                  value={banDays}
                  onValueChange={setBanDays}
                  placeholder={t("admin.admin_ban_days_placeholder")}
                  radius="lg"
                />
                <Input
                  label={t("admin.admin_ban_reason")}
                  value={banReason}
                  onValueChange={setBanReason}
                  placeholder={t("admin.admin_ban_reason_placeholder")}
                  radius="lg"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
                <Button color="danger" isLoading={saving} onPress={submitBan}>{t("admin.admin_ban_confirm")}</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminReviews() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-default-900">{t("admin.admin_reviews_title")}</h1>
        <p className="text-sm text-default-400">{t("admin.admin_reviews_subtitle")}</p>
      </div>

      <Tabs radius="lg" color="primary">
        <Tab key="reviews" title={t("admin.admin_reviews_tab")}>
          <ReviewsTab />
        </Tab>
        <Tab key="users" title={t("admin.admin_users_tab")}>
          <UsersTab />
        </Tab>
      </Tabs>
    </div>
  );
}
