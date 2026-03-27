import React, { useState, useEffect } from "react";
import {
  Card, CardBody, Button, Chip, Avatar, Spinner, Progress, Divider,
} from "@heroui/react";
import {
  ArrowLeft, ShieldBan, ShieldCheck, AlertTriangle, Store,
  ShoppingBag, RotateCcw, Star, Flag, TrendingDown, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import moderationService from "../../services/moderationService";

const SEVERITY_COLOR = { 1: "default", 2: "warning", 3: "danger", 4: "danger" };

function useLocaleDate() {
  const { i18n } = useTranslation();
  const locale = i18n.language === "vi" ? "vi-VN" : "en-US";
  return {
    formatDate: (d) => (d ? new Date(d).toLocaleDateString(locale) : "—"),
    formatDateTime: (d) => (d ? new Date(d).toLocaleString(locale) : "—"),
  };
}

function StatCard({ icon: Icon, label, value, color = "default", sub }) {
  return (
    <div className="bg-default-50 rounded-xl p-3 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={`text-${color}`} />
      </div>
      <div>
        <p className="text-lg font-bold text-default-800">{value}</p>
        <p className="text-[11px] text-default-500">{label}</p>
        {sub && <p className="text-[10px] text-default-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function UserModerationDetail({ userId, onBack, onBan, onUnban, onWarn }) {
  const { t } = useTranslation();
  const { formatDate, formatDateTime } = useLocaleDate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = await moderationService.getUserDetail(userId);
        setData(d);
      } catch { toast.error(t("admin.mod_detail_load_error")); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!data) return <p className="text-default-400">{t("admin.mod_detail_not_found")}</p>;

  const isBanned = data.is_banned || data.status === "suspended" || data.status === "banned_permanent" || data.status === "banned";
  const stats = data.stats || {};
  const trustColor = data.trust_score >= 60 ? "success" : data.trust_score >= 30 ? "warning" : "danger";

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <Button variant="light" size="sm" startContent={<ArrowLeft size={14} />} onPress={onBack}>
          {t("admin.mod_detail_back_to_list")}
        </Button>
        <div className="flex gap-2">
          <Button size="sm" color="warning" variant="flat" startContent={<AlertTriangle size={14} />}
            onPress={() => onWarn(data)}>{t("admin.mod_detail_warn")}</Button>
          {isBanned ? (
            <Button size="sm" color="success" variant="flat" startContent={<ShieldCheck size={14} />}
              onPress={() => onUnban(data)}>{t("admin.mod_detail_unban")}</Button>
          ) : (
            <Button size="sm" color="danger" variant="flat" startContent={<ShieldBan size={14} />}
              onPress={() => onBan(data)}>{t("admin.mod_detail_ban")}</Button>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-5">
          <div className="flex items-start gap-4">
            <Avatar src={data.avatar_url} name={data.name?.charAt(0)} className="w-16 h-16" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold text-default-900">{data.name}</h2>
                <Chip size="sm" color={isBanned ? "danger" : data.status === "warning" ? "warning" : "success"} variant="flat">
                  {t(`admin.mod_status_${data.status}`)}
                </Chip>
                <Chip size="sm" variant="flat" color={data.role_id?.name === "shop_owner" ? "warning" : "primary"}>
                  {data.role_id?.name}
                </Chip>
              </div>
              <p className="text-sm text-default-500">{data.email} | {data.phone || t("admin.mod_detail_no_phone")}</p>
              <p className="text-xs text-default-400 mt-1">ID: {data._id} | {t("admin.mod_detail_joined")}: {formatDate(data.createdAt)}</p>

              {/* Trust Score */}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs font-semibold text-default-600">{t("admin.mod_detail_trust_score")}:</span>
                <Progress size="sm" className="w-32" value={data.trust_score ?? 80} color={trustColor} />
                <span className={`text-sm font-bold text-${trustColor}`}>{data.trust_score ?? 80}/100</span>
              </div>

              {/* Ban Info */}
              {isBanned && (
                <div className="mt-3 bg-danger-50 border border-danger-200 rounded-xl p-3 text-xs text-danger-700 space-y-1">
                  <p><strong>{t("admin.mod_detail_ban_type")}:</strong> {data.ban_type || (data.ban_end ? "temporary" : "permanent")}</p>
                  <p><strong>{t("common.reason")}:</strong> {data.ban_reason || "—"}</p>
                  {data.ban_start && <p><strong>{t("admin.mod_detail_ban_since")}:</strong> {formatDateTime(data.ban_start)}</p>}
                  {data.ban_end && <p><strong>{t("admin.mod_detail_ban_until")}:</strong> {formatDateTime(data.ban_end)}</p>}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={ShoppingBag} label={t("admin.mod_detail_orders")} value={stats.total_orders || 0} color="primary" />
        <StatCard
          icon={TrendingDown} label={t("admin.mod_detail_cancel_rate")} value={`${stats.cancel_rate || 0}%`}
          color={stats.cancel_rate > 30 ? "danger" : "default"}
          sub={`${stats.cancelled_orders || 0} ${t("admin.mod_detail_cancelled")} (${stats.recent_cancellations_7d || 0} ${t("admin.mod_detail_in_7d")})`}
        />
        <StatCard
          icon={RotateCcw} label={t("admin.mod_detail_refund_rate")} value={`${stats.refund_rate || 0}%`}
          color={stats.refund_rate > 50 ? "danger" : "default"}
          sub={`${stats.approved_refunds || 0}/${stats.total_refunds || 0} ${t("admin.mod_detail_approved")}`}
        />
        <StatCard icon={Flag} label={t("admin.mod_detail_reports")} value={stats.total_reports || 0}
          color={stats.pending_reports > 0 ? "warning" : "default"}
          sub={`${stats.pending_reports || 0} ${t("common.pending").toLowerCase()}`}
        />
        <StatCard icon={Star} label={t("admin.mod_detail_reviews")} value={stats.total_reviews || 0} color="secondary" />
      </div>

      {/* Shop Stats (if shop_owner) */}
      {data.shop && (
        <Card radius="xl" shadow="sm">
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Store size={16} className="text-warning-600" />
              <h3 className="text-sm font-bold text-default-800">{t("admin.mod_shop_info")}: {data.shop.shop_name}</h3>
              <Chip size="sm" variant="flat" color={data.shop.status === "approved" ? "success" : "danger"}>
                {data.shop.status}
              </Chip>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-default-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{data.shop.total_orders || 0}</p>
                <p className="text-[10px] text-default-500">{t("admin.mod_shop_orders")}</p>
              </div>
              <div className="bg-default-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{data.shop.complaint_rate || 0}%</p>
                <p className="text-[10px] text-default-500">{t("admin.mod_shop_complaint_rate")}</p>
              </div>
              <div className="bg-default-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{data.shop.refund_rate || 0}%</p>
                <p className="text-[10px] text-default-500">{t("admin.mod_shop_refund_rate")}</p>
              </div>
              <div className="bg-default-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{data.shop.fake_product_reports || 0}</p>
                <p className="text-[10px] text-default-500">{t("admin.mod_shop_fake_reports")}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Violations History */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-4">
          <h3 className="text-sm font-bold text-default-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> {t("admin.mod_detail_violations_history")} ({data.violations?.length || 0})
          </h3>
          {!data.violations?.length ? (
            <p className="text-xs text-default-400 py-4 text-center">{t("admin.mod_detail_no_violations")}</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.violations.map((v) => (
                <div key={v._id} className="bg-default-50 border border-divider rounded-lg px-3 py-2 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Chip size="sm" color={SEVERITY_COLOR[v.severity]} variant="flat">
                        L{v.severity} - {t(`admin.mod_severity_${v.severity}`)}
                      </Chip>
                      <Chip size="sm" variant="flat">{t(`admin.mod_violation_${v.type}`, v.type)}</Chip>
                      {v.auto_detected && <Chip size="sm" color="secondary" variant="flat">{t("admin.mod_detail_auto_detected")}</Chip>}
                    </div>
                    <p className="text-xs text-default-600">{v.description}</p>
                    {v.action_taken && (
                      <p className="text-[10px] text-default-400 mt-1">{t("admin.mod_detail_action_taken")}: {v.action_taken}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Chip size="sm" color={v.status === "pending" ? "warning" : v.status === "confirmed" ? "danger" : "default"} variant="flat">
                      {v.status}
                    </Chip>
                    <p className="text-[10px] text-default-400 mt-1">{formatDateTime(v.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Appeals */}
      {data.appeals?.length > 0 && (
        <Card radius="xl" shadow="sm">
          <CardBody className="p-4">
            <h3 className="text-sm font-bold text-default-800 mb-3 flex items-center gap-2">
              <Clock size={14} /> {t("admin.mod_detail_appeals")} ({data.appeals.length})
            </h3>
            <div className="space-y-2">
              {data.appeals.map((a) => (
                <div key={a._id} className="bg-default-50 border border-divider rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <Chip size="sm" color={a.status === "pending" ? "warning" : a.status === "approved" ? "success" : "danger"} variant="flat">
                      {t(`admin.mod_appeal_status_${a.status}`)}
                    </Chip>
                    <span className="text-[10px] text-default-400">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p className="text-xs text-default-600">{a.reason}</p>
                  {a.admin_note && (
                    <p className="text-[10px] text-default-500 mt-1">{t("admin.mod_admin_note")}: {a.admin_note}</p>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Violation History (legacy) */}
      {data.violation_history?.length > 0 && (
        <Card radius="xl" shadow="sm">
          <CardBody className="p-4">
            <h3 className="text-sm font-bold text-default-800 mb-3">{t("admin.mod_detail_legacy_violations")}</h3>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {data.violation_history.map((v, i) => (
                <div key={i} className="bg-danger-50 border border-danger-100 rounded-lg px-3 py-2 text-xs flex justify-between">
                  <span className="text-danger-700">{v.reason}</span>
                  <span className="text-danger-400">{formatDate(v.at)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
