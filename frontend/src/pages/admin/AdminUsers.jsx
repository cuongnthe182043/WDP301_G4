import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner, Chip, Avatar,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea, Tooltip,
} from "@heroui/react";
import {
  Search, RefreshCw, Eye, ShieldBan, ShieldCheck, AlertTriangle,
  UserCog, Users, Mail, Phone, Calendar, Store, ShoppingBag,
} from "lucide-react";
import apiClient from "../../services/apiClient";
import { toast } from "sonner";
import PaginationBar from "../../components/ui/PaginationBar";

const api = {
  list:       (p)       => apiClient.get("/admin/users", { params: p }).then((r) => r.data.data),
  get:        (id)      => apiClient.get(`/admin/users/${id}`).then((r) => r.data.data),
  roles:      ()        => apiClient.get("/admin/users/roles").then((r) => r.data.data),
  updateRole: (id, rn)  => apiClient.patch(`/admin/users/${id}/role`, { role_name: rn }),
  ban:        (id, d)   => apiClient.post(`/admin/users/${id}/ban`, d),
  unban:      (id)      => apiClient.post(`/admin/users/${id}/unban`),
  warn:       (id, d)   => apiClient.post(`/admin/users/${id}/warn`, d),
};

const STATUS_COLOR = { active: "success", banned: "danger", inactive: "default" };
const ROLE_COLOR   = {
  system_admin: "danger",
  shop_owner:   "warning",
  customer:     "primary",
  sales:        "secondary",
  support:      "default",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

export default function AdminUsers() {
  const { t } = useTranslation();

  const [limit,      setLimit]      = useState(20);
  const [loading,    setLoading]    = useState(true);
  const [users,      setUsers]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [q,          setQ]          = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roles,      setRoles]      = useState([]);

  // Detail modal
  const [detailUser, setDetailUser] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action modals
  const [banTarget,  setBanTarget]  = useState(null);
  const [banDays,    setBanDays]    = useState("");
  const [banReason,  setBanReason]  = useState("");
  const [banLoading, setBanLoading] = useState(false);

  const [warnTarget,  setWarnTarget]  = useState(null);
  const [warnReason,  setWarnReason]  = useState("");
  const [warnLoading, setWarnLoading] = useState(false);

  const [roleTarget,     setRoleTarget]     = useState(null);
  const [selectedRole,   setSelectedRole]   = useState("");
  const [roleLoading,    setRoleLoading]    = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: limit };
      if (q)            params.q      = q;
      if (roleFilter)   params.role   = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await api.list(params);
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, statusFilter, limit, t]);

  useEffect(() => {
    api.roles().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, roleFilter, statusFilter]);

  useEffect(() => { load(page); }, [page]); // eslint-disable-line

  async function openDetail(user) {
    setDetailUser(user);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const data = await api.get(user._id);
      setDetailData(data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleBan() {
    setBanLoading(true);
    try {
      await api.ban(banTarget._id, { days: banDays ? Number(banDays) : undefined, reason: banReason });
      toast.success(t("admin.user_banned_ok"));
      setBanTarget(null);
      setBanDays(""); setBanReason("");
      load(page);
    } catch { toast.error(t("common.error")); }
    finally { setBanLoading(false); }
  }

  async function handleUnban(user) {
    try {
      await api.unban(user._id);
      toast.success(t("admin.user_unbanned_ok"));
      load(page);
    } catch { toast.error(t("common.error")); }
  }

  async function handleWarn() {
    setWarnLoading(true);
    try {
      await api.warn(warnTarget._id, { reason: warnReason });
      toast.success(t("admin.user_warned_ok"));
      setWarnTarget(null); setWarnReason("");
      load(page);
    } catch { toast.error(t("common.error")); }
    finally { setWarnLoading(false); }
  }

  async function handleRoleChange() {
    if (!selectedRole) return;
    setRoleLoading(true);
    try {
      await api.updateRole(roleTarget._id, selectedRole);
      toast.success(t("admin.user_role_updated"));
      setRoleTarget(null); setSelectedRole("");
      load(page);
    } catch { toast.error(t("common.error")); }
    finally { setRoleLoading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("admin.users_title")}</h1>
          <p className="text-sm text-default-500 mt-0.5">{t("admin.users_subtitle", { count: total })}</p>
        </div>
        <Button size="sm" variant="flat" startContent={<RefreshCw size={14} />} onPress={() => load(page)}>
          {t("common.reset")}
        </Button>
      </div>

      {/* Filters */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-3 flex flex-row gap-3 flex-wrap">
          <Input
            size="sm" className="flex-1 min-w-[180px]"
            placeholder={t("admin.users_search_placeholder")}
            startContent={<Search size={14} className="text-default-400" />}
            value={q} onValueChange={(v) => { setQ(v); }}
          />
          <Select
            size="sm" className="w-40"
            placeholder={t("admin.users_filter_role")}
            selectedKeys={roleFilter ? new Set([roleFilter]) : new Set()}
            onSelectionChange={(k) => setRoleFilter(Array.from(k)[0] || "")}
          >
            {[{ name: "" }, ...roles].map((r) => (
              <SelectItem key={r.name} value={r.name}>{r.name || t("common.all")}</SelectItem>
            ))}
          </Select>
          <Select
            size="sm" className="w-40"
            placeholder={t("admin.users_filter_status")}
            selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
            onSelectionChange={(k) => setStatusFilter(Array.from(k)[0] || "")}
          >
            {[
              { key: "",         label: t("common.all") },
              { key: "active",   label: t("common.active") },
              { key: "banned",   label: t("admin.users_status_banned") },
              { key: "inactive", label: t("common.inactive") },
            ].map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
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
              <p className="text-sm">{t("admin.users_none")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-default-50 border-b border-divider">
                  <tr>
                    {[
                      t("admin.users_col_user"),
                      t("admin.users_col_role"),
                      t("admin.users_col_status"),
                      t("admin.users_col_warnings"),
                      t("admin.users_col_joined"),
                      t("common.actions"),
                    ].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr
                      key={user._id}
                      className={`border-b border-divider last:border-0 ${i % 2 === 0 ? "" : "bg-default-50/40"} ${user.status === "banned" ? "bg-danger-50/20" : ""}`}
                    >
                      {/* User info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.avatar_url} name={user.name?.charAt(0)} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-default-800 text-[13px] truncate">{user.name}</p>
                            <p className="text-default-400 text-[11px] flex items-center gap-1">
                              <Mail size={10} />{user.email}
                            </p>
                            {user.phone && (
                              <p className="text-default-400 text-[11px] flex items-center gap-1">
                                <Phone size={10} />{user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3">
                        <Chip
                          size="sm"
                          color={ROLE_COLOR[user.role_id?.name] || "default"}
                          variant="flat"
                        >
                          {user.role_id?.name || "—"}
                        </Chip>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <div>
                          <Chip size="sm" color={STATUS_COLOR[user.status]} variant="flat">
                            {t(`admin.users_status_${user.status}`) || user.status}
                          </Chip>
                          {user.ban_until && (
                            <p className="text-[10px] text-danger-500 mt-0.5">
                              {t("admin.users_ban_until")}: {formatDate(user.ban_until)}
                            </p>
                          )}
                          {user.status === "banned" && !user.ban_until && (
                            <p className="text-[10px] text-danger-500 mt-0.5">{t("admin.users_permanent")}</p>
                          )}
                        </div>
                      </td>
                      {/* Warnings */}
                      <td className="px-4 py-3">
                        {user.warning_count > 0 ? (
                          <Chip
                            size="sm"
                            color={user.warning_count >= 3 ? "danger" : "warning"}
                            variant="flat"
                          >
                            {user.warning_count}x
                          </Chip>
                        ) : (
                          <span className="text-default-300 text-xs">—</span>
                        )}
                      </td>
                      {/* Joined */}
                      <td className="px-4 py-3">
                        <span className="text-default-500 text-xs flex items-center gap-1">
                          <Calendar size={11} />{formatDate(user.createdAt)}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Tooltip content={t("admin.users_view_detail")}>
                            <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(user)}>
                              <Eye size={14} />
                            </Button>
                          </Tooltip>
                          <Tooltip content={t("admin.users_change_role")}>
                            <Button
                              isIconOnly size="sm" variant="light" color="secondary"
                              onPress={() => { setRoleTarget(user); setSelectedRole(user.role_id?.name || ""); }}
                            >
                              <UserCog size={14} />
                            </Button>
                          </Tooltip>
                          <Tooltip content={t("admin.users_warn_btn")}>
                            <Button
                              isIconOnly size="sm" variant="light" color="warning"
                              onPress={() => setWarnTarget(user)}
                            >
                              <AlertTriangle size={14} />
                            </Button>
                          </Tooltip>
                          {user.status === "banned" ? (
                            <Tooltip content={t("admin.users_unban_btn")}>
                              <Button
                                isIconOnly size="sm" variant="light" color="success"
                                onPress={() => handleUnban(user)}
                              >
                                <ShieldCheck size={14} />
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip content={t("admin.users_ban_btn")}>
                              <Button
                                isIconOnly size="sm" variant="light" color="danger"
                                onPress={() => setBanTarget(user)}
                              >
                                <ShieldBan size={14} />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
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

      {/* ── Detail Modal ── */}
      <Modal isOpen={!!detailUser} onClose={() => setDetailUser(null)} size="xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <Avatar src={detailUser?.avatar_url} name={detailUser?.name?.charAt(0)} size="sm" />
            <div>
              <p className="text-sm font-bold">{detailUser?.name}</p>
              <p className="text-xs text-default-400">{detailUser?.email}</p>
            </div>
          </ModalHeader>
          <ModalBody>
            {detailLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : detailData ? (
              <div className="space-y-4 text-sm">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("admin.user_detail_id"),       value: detailData._id },
                    { label: t("admin.user_detail_username"),  value: detailData.username },
                    { label: t("admin.user_detail_phone"),     value: detailData.phone || "—" },
                    { label: t("admin.user_detail_role"),      value: detailData.role_id?.name },
                    { label: t("admin.user_detail_status"),    value: detailData.status },
                    { label: t("admin.user_detail_joined"),    value: formatDate(detailData.createdAt) },
                    { label: t("admin.user_detail_last_login"),value: formatDate(detailData.last_login) },
                    { label: t("admin.user_detail_orders"),    value: detailData.order_count ?? "—" },
                    { label: t("admin.user_detail_warnings"),  value: detailData.warning_count ?? 0 },
                    { label: t("admin.user_detail_ban_until"), value: detailData.ban_until ? formatDate(detailData.ban_until) : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-default-50 rounded-xl p-3">
                      <p className="text-xs text-default-400 mb-1">{label}</p>
                      <p className="text-sm font-semibold text-default-800 break-all">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Shop */}
                {detailData.shop && (
                  <div className="bg-warning-50 border border-warning-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Store size={14} className="text-warning-600" />
                      <p className="text-xs font-bold text-warning-700">{t("admin.user_detail_shop")}</p>
                    </div>
                    <p className="font-semibold text-default-800">{detailData.shop.shop_name}</p>
                    <p className="text-xs text-default-500">{detailData.shop.shop_slug} · {detailData.shop.status}</p>
                  </div>
                )}

                {/* Violation history */}
                {detailData.violation_history?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-default-600 mb-2 uppercase tracking-wide">
                      {t("admin.user_detail_violations")}
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {detailData.violation_history.map((v, i) => (
                        <div key={i} className="bg-danger-50 border border-danger-100 rounded-lg px-3 py-2 text-xs">
                          <span className="text-danger-700">{v.reason}</span>
                          <span className="text-danger-400 ml-2">{formatDate(v.at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setDetailUser(null)}>{t("common.close")}</Button>
            {detailData && detailData.status !== "banned" && (
              <Button color="danger" size="sm" startContent={<ShieldBan size={14} />}
                onPress={() => { setDetailUser(null); setBanTarget(detailData); }}>
                {t("admin.users_ban_btn")}
              </Button>
            )}
            {detailData && detailData.status === "banned" && (
              <Button color="success" size="sm" startContent={<ShieldCheck size={14} />}
                onPress={() => { handleUnban(detailData); setDetailUser(null); }}>
                {t("admin.users_unban_btn")}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Ban Modal ── */}
      <Modal isOpen={!!banTarget} onClose={() => { setBanTarget(null); setBanDays(""); setBanReason(""); }} size="sm">
        <ModalContent>
          <ModalHeader>{t("admin.users_ban_title", { name: banTarget?.name })}</ModalHeader>
          <ModalBody className="space-y-3">
            <Input
              label={t("admin.users_ban_days_label")}
              type="number" min={1}
              placeholder={t("admin.users_ban_days_placeholder")}
              value={banDays} onValueChange={setBanDays}
              description={t("admin.users_ban_days_hint")}
            />
            <Textarea
              label={t("admin.users_ban_reason_label")}
              placeholder={t("admin.users_ban_reason_placeholder")}
              value={banReason} onValueChange={setBanReason}
              minRows={2}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => { setBanTarget(null); setBanDays(""); setBanReason(""); }}>{t("common.cancel")}</Button>
            <Button color="danger" isLoading={banLoading} onPress={handleBan}>{t("admin.users_ban_confirm")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Warn Modal ── */}
      <Modal isOpen={!!warnTarget} onClose={() => { setWarnTarget(null); setWarnReason(""); }} size="sm">
        <ModalContent>
          <ModalHeader>{t("admin.users_warn_title", { name: warnTarget?.name })}</ModalHeader>
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

      {/* ── Change Role Modal ── */}
      <Modal isOpen={!!roleTarget} onClose={() => { setRoleTarget(null); setSelectedRole(""); }} size="sm">
        <ModalContent>
          <ModalHeader>{t("admin.users_role_title", { name: roleTarget?.name })}</ModalHeader>
          <ModalBody>
            <Select
              label={t("admin.users_role_select_label")}
              selectedKeys={selectedRole ? new Set([selectedRole]) : new Set()}
              onSelectionChange={(k) => setSelectedRole(Array.from(k)[0] || "")}
            >
              {roles.map((r) => (
                <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => { setRoleTarget(null); setSelectedRole(""); }}>{t("common.cancel")}</Button>
            <Button color="primary" isLoading={roleLoading} onPress={handleRoleChange}>{t("common.save")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
