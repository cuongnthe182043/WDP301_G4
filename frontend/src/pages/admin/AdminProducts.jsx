import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Chip, Select, SelectItem, Spinner, Checkbox, Tooltip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea,
} from "@heroui/react";
import { Search, CheckCircle, XCircle, Eye, RotateCcw, Zap, AlertTriangle, Shield, ShieldAlert, Filter } from "lucide-react";
import apiClient from "../../services/apiClient";
import PaginationBar from "../../components/ui/PaginationBar";

const STATUS_COLOR = { pending: "warning", active: "success", inactive: "default", out_of_stock: "danger" };
const SEVERITY_COLOR = { high: "danger", medium: "warning", low: "default" };

const api = {
  list:        (p) => apiClient.get("/admin/products", { params: p }).then(r => r.data.data),
  get:         (id) => apiClient.get(`/admin/products/${id}`).then(r => r.data.data),
  approve:     (id) => apiClient.patch(`/admin/products/${id}/approve`).then(r => r.data.data),
  reject:      (id, reason) => apiClient.patch(`/admin/products/${id}/reject`, { reason }).then(r => r.data.data),
  moderate:    (id) => apiClient.post(`/admin/products/${id}/moderate`).then(r => r.data.data),
  bulkApprove: (ids) => apiClient.post("/admin/products/bulk-approve", { ids }).then(r => r.data.data),
  bulkReject:  (ids, reason) => apiClient.post("/admin/products/bulk-reject", { ids, reason }).then(r => r.data.data),
  stats:       () => apiClient.get("/admin/products/stats").then(r => r.data.data),
};

export default function AdminProducts() {
  const { t } = useTranslation();

  const STATUS_LABEL = {
    pending:      t("shop.product_status_pending"),
    active:       t("shop.product_status_active"),
    inactive:     t("shop.product_status_inactive"),
    out_of_stock: t("shop.product_status_out_of_stock"),
  };

  const STATUS_OPTS = [
    { key: "all",          label: t("shop.product_status_all") },
    { key: "pending",      label: t("shop.product_status_pending") },
    { key: "active",       label: t("shop.product_status_active") },
    { key: "inactive",     label: t("shop.product_status_inactive") },
    { key: "out_of_stock", label: t("shop.product_status_out_of_stock") },
  ];

  const [limit,            setLimit]            = useState(20);
  const [loading,          setLoading]          = useState(true);
  const [products,         setProducts]         = useState([]);
  const [total,            setTotal]            = useState(0);
  const [page,             setPage]             = useState(1);
  const [query,            setQuery]            = useState("");
  const [statusFilter,     setStatusFilter]     = useState("all");
  const [flaggedOnly,      setFlaggedOnly]      = useState(false);
  const [detailProd,       setDetailProd]       = useState(null);
  const [rejectTarget,     setRejectTarget]     = useState(null);
  const [rejectReason,     setRejectReason]     = useState("");
  const [actionLoading,    setActionLoading]    = useState(false);
  const [selectedIds,      setSelectedIds]      = useState(new Set());
  const [bulkRejectOpen,   setBulkRejectOpen]   = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [stats,            setStats]            = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: limit, status: statusFilter };
      if (query.trim())  params.q       = query.trim();
      if (flaggedOnly)   params.flagged = "true";
      const data = await api.list(params);
      setProducts(data?.items || []);
      setTotal(data?.total   || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, query, statusFilter, flaggedOnly]);

  const loadStats = useCallback(async () => {
    try { setStats(await api.stats()); } catch {}
  }, []);

  useEffect(() => { fetchProducts(); loadStats(); }, [fetchProducts, loadStats]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try { await api.approve(id); setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; }); fetchProducts(); loadStats(); }
    catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await api.reject(rejectTarget._id, rejectReason.trim());
      setRejectTarget(null); setRejectReason(""); fetchProducts(); loadStats();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleModerate = async (id) => {
    setActionLoading(true);
    try {
      const result = await api.moderate(id);
      if (detailProd?._id === id) setDetailProd(result.product);
      fetchProducts(); loadStats();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      await api.bulkApprove(Array.from(selectedIds));
      setSelectedIds(new Set()); fetchProducts(); loadStats();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0 || !bulkRejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.bulkReject(Array.from(selectedIds), bulkRejectReason.trim());
      setSelectedIds(new Set()); setBulkRejectOpen(false); setBulkRejectReason(""); fetchProducts(); loadStats();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const openDetail = async (p) => {
    try { setDetailProd(await api.get(p._id)); }
    catch { setDetailProd(p); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map(p => p._id)));
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: t("admin.mod_stat_total"),    value: stats.total,              color: "text-gray-900 dark:text-[#e8eaed]" },
            { label: t("shop.product_status_pending"),  value: stats.pending,       color: "text-amber-600" },
            { label: t("shop.product_status_active"),   value: stats.active,        color: "text-green-600" },
            { label: t("shop.product_status_inactive"), value: stats.inactive,      color: "text-gray-500" },
            { label: t("admin.mod_flagged"),        value: stats.flagged,            color: "text-red-600" },
            { label: t("admin.mod_auto_rejected_stat"), value: stats.recentAutoRejected, color: "text-orange-600" },
          ].map((s) => (
            <Card key={s.label} radius="xl" shadow="sm" isPressable={false}>
              <CardBody className="py-3 px-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-[#9ea3b5] mt-0.5">{s.label}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-[#e8eaed]">{t("admin.admin_products_title")}</h1>
          <p className="text-sm text-gray-400 dark:text-[#6b7280]">
            {t("admin.admin_products_total", { count: total })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm" variant={flaggedOnly ? "solid" : "flat"} color={flaggedOnly ? "danger" : "default"}
            radius="lg" startContent={<Filter size={13} />}
            onPress={() => { setFlaggedOnly(!flaggedOnly); setPage(1); }}
          >
            {t("admin.mod_flagged_only")}
          </Button>
          <Select
            size="sm" radius="lg" className="w-36"
            selectedKeys={new Set([statusFilter])}
            onSelectionChange={(k) => { setStatusFilter(Array.from(k)[0] || "all"); setPage(1); }}
            aria-label={t("admin.admin_products_status_filter")}
          >
            {STATUS_OPTS.map((o) => <SelectItem key={o.key}>{o.label}</SelectItem>)}
          </Select>
          <Input
            size="sm" placeholder={t("admin.admin_products_search")} value={query}
            onValueChange={(v) => setQuery(v)}
            radius="lg" className="w-60"
            startContent={<Search size={14} className="text-gray-400" />}
            isClearable onClear={() => setQuery("")}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card radius="xl" shadow="sm" className="border-2 border-primary-200 dark:border-primary-800">
          <CardBody className="py-2 px-4 flex flex-row items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-[#c8cbd4]">
              {t("admin.mod_selected", { count: selectedIds.size })}
            </span>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" color="success" variant="flat" radius="lg"
                startContent={<CheckCircle size={13} />}
                isLoading={actionLoading} onPress={handleBulkApprove}>
                {t("admin.mod_bulk_approve")}
              </Button>
              <Button size="sm" color="danger" variant="flat" radius="lg"
                startContent={<XCircle size={13} />}
                onPress={() => { setBulkRejectOpen(true); setBulkRejectReason(""); }}>
                {t("admin.mod_bulk_reject")}
              </Button>
              <Button size="sm" variant="light" radius="lg" onPress={() => setSelectedIds(new Set())}>
                {t("common.cancel")}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Products table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-[#6b7280]">
              {t("admin.admin_products_none")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1e2e] border-b border-gray-100 dark:border-[#2e3347]">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <Checkbox
                      isSelected={selectedIds.size === products.length && products.length > 0}
                      isIndeterminate={selectedIds.size > 0 && selectedIds.size < products.length}
                      onValueChange={toggleSelectAll}
                      size="sm"
                    />
                  </th>
                  {[
                    t("admin.admin_products_col_img"),
                    t("admin.admin_products_col_product"),
                    t("admin.admin_products_col_shop"),
                    t("admin.admin_products_col_price"),
                    t("admin.admin_products_col_stock"),
                    t("admin.mod_col_moderation"),
                    t("admin.admin_products_col_status"),
                    t("admin.admin_products_col_actions"),
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#9ea3b5] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                {products.map((p) => {
                  const hasFlags = p.moderation_flags?.length > 0;
                  const highSev = p.moderation_flags?.some(f => f.severity === "high");
                  return (
                    <tr key={p._id} className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${p.status === "pending" ? "bg-amber-50/30 dark:bg-amber-900/10" : ""} ${highSev ? "bg-red-50/20 dark:bg-red-900/10" : ""}`}>
                      <td className="px-3 py-3">
                        <Checkbox
                          isSelected={selectedIds.has(p._id)}
                          onValueChange={() => toggleSelect(p._id)}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <img
                          src={p.images?.[0] || "/no-image.jpg"} alt={p.name}
                          className="w-12 h-12 object-cover rounded-xl border border-gray-100 dark:border-[#2e3347]"
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-semibold text-gray-900 dark:text-[#e8eaed] truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 dark:text-[#6b7280] truncate">{p.category?.name || "—"}</p>
                        {p.rejection_reason && (
                          <p className="text-xs text-red-500 mt-0.5 truncate" title={p.rejection_reason}>
                            {p.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-[#9ea3b5] max-w-[120px] truncate">
                        {p.shop?.shop_name || "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600 whitespace-nowrap">
                        {(p.base_price || 0).toLocaleString("vi-VN")}₫
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-[#9ea3b5]">
                        {p.stock_total ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        {hasFlags ? (
                          <Tooltip content={p.moderation_flags.map(f => f.message).join("\n")} className="max-w-xs">
                            <div className="flex items-center gap-1 cursor-help">
                              <ShieldAlert size={14} className={highSev ? "text-red-500" : "text-amber-500"} />
                              <span className={`text-xs font-semibold ${highSev ? "text-red-600" : "text-amber-600"}`}>
                                {p.moderation_score}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({p.moderation_flags.length})
                              </span>
                            </div>
                          </Tooltip>
                        ) : p.auto_moderated ? (
                          <div className="flex items-center gap-1">
                            <Shield size={14} className="text-green-500" />
                            <span className="text-xs text-green-600">{t("admin.mod_clean")}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Chip size="sm" color={STATUS_COLOR[p.status] || "default"} variant="flat">
                          {STATUS_LABEL[p.status] || p.status}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="bordered" radius="lg" isIconOnly onPress={() => openDetail(p)} title={t("common.details")}>
                            <Eye size={13} />
                          </Button>
                          <Button size="sm" color="secondary" variant="flat" radius="lg" isIconOnly
                            isLoading={actionLoading} onPress={() => handleModerate(p._id)} title={t("admin.mod_auto_check")}>
                            <Zap size={13} />
                          </Button>
                          {p.status === "pending" && (
                            <>
                              <Button size="sm" color="success" variant="flat" radius="lg" isIconOnly
                                isLoading={actionLoading} onPress={() => handleApprove(p._id)} title={t("admin.approve")}>
                                <CheckCircle size={13} />
                              </Button>
                              <Button size="sm" color="danger" variant="flat" radius="lg" isIconOnly
                                onPress={() => { setRejectTarget(p); setRejectReason(""); }} title={t("admin.admin_reject_title")}>
                                <XCircle size={13} />
                              </Button>
                            </>
                          )}
                          {p.status === "inactive" && (
                            <Button size="sm" color="success" variant="flat" radius="lg" isIconOnly
                              isLoading={actionLoading} onPress={() => handleApprove(p._id)} title={t("admin.admin_products_re_approve")}>
                              <RotateCcw size={13} />
                            </Button>
                          )}
                          {p.status === "active" && (
                            <Button size="sm" color="danger" variant="flat" radius="lg" isIconOnly
                              onPress={() => { setRejectTarget(p); setRejectReason(""); }} title={t("admin.admin_revoke_title")}>
                              <XCircle size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* Detail Modal */}
      <Modal isOpen={!!detailProd} onOpenChange={(o) => !o && setDetailProd(null)} size="2xl" radius="xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => detailProd && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span>{detailProd.name}</span>
                <div className="flex gap-2 flex-wrap">
                  <Chip size="sm" color={STATUS_COLOR[detailProd.status] || "default"} variant="flat">
                    {STATUS_LABEL[detailProd.status] || detailProd.status}
                  </Chip>
                  {detailProd.auto_moderated && (
                    <Chip size="sm" color={detailProd.moderation_score > 0 ? "warning" : "success"} variant="flat"
                      startContent={detailProd.moderation_score > 0 ? <ShieldAlert size={12} /> : <Shield size={12} />}>
                      {t("admin.mod_score")}: {detailProd.moderation_score}
                    </Chip>
                  )}
                </div>
              </ModalHeader>
              <ModalBody className="space-y-4">
                {/* Moderation Flags */}
                {detailProd.moderation_flags?.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={14} />
                      {t("admin.mod_flags_title")} ({detailProd.moderation_flags.length})
                    </p>
                    {detailProd.moderation_flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Chip size="sm" color={SEVERITY_COLOR[flag.severity]} variant="flat" className="mt-0.5 shrink-0">
                          {flag.severity}
                        </Chip>
                        <div>
                          <p className="text-gray-700 dark:text-[#c8cbd4]">{flag.message}</p>
                          <p className="text-xs text-gray-400">{t("admin.mod_field")}: {flag.field}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detailProd.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {detailProd.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-100 dark:border-[#2e3347]" />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label={t("admin.admin_products_detail_price")}    value={`${(detailProd.base_price||0).toLocaleString("vi-VN")}₫`} />
                  <InfoRow label={t("admin.admin_products_detail_stock")}    value={detailProd.stock_total ?? 0} />
                  <InfoRow label={t("admin.admin_products_detail_category")} value={detailProd.category?.name || "—"} />
                  <InfoRow label={t("admin.admin_products_detail_brand")}    value={detailProd.brand?.name   || "—"} />
                  <InfoRow label={t("admin.admin_products_detail_shop")}     value={detailProd.shop?.shop_name || "—"} />
                  <InfoRow label={t("admin.admin_products_detail_origin")}   value={detailProd.detail_info?.origin_country || "—"} />
                  <InfoRow label={t("admin.admin_products_detail_variants")} value={(detailProd.variant_dimensions || []).join(", ") || "—"} />
                  <InfoRow label="ID" value={<span className="font-mono text-xs">{detailProd._id}</span>} />
                </div>
                {detailProd.description && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{t("admin.admin_products_detail_desc")}</p>
                    <p className="text-sm text-gray-700 dark:text-[#c8cbd4] whitespace-pre-wrap">{detailProd.description}</p>
                  </div>
                )}
                {detailProd.rejection_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <p className="text-xs font-semibold text-red-600 mb-0.5">{t("admin.admin_products_rejection")}</p>
                    <p className="text-sm text-red-700 dark:text-red-400">{detailProd.rejection_reason}</p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" variant="flat" radius="lg" startContent={<Zap size={14} />}
                  isLoading={actionLoading} onPress={() => handleModerate(detailProd._id)}>
                  {t("admin.mod_auto_check")}
                </Button>
                {(detailProd.status === "pending" || detailProd.status === "inactive") && (
                  <Button color="success" variant="flat" radius="lg" startContent={<CheckCircle size={14} />}
                    isLoading={actionLoading}
                    onPress={async () => { await handleApprove(detailProd._id); onClose(); }}>
                    {t("admin.approve")}
                  </Button>
                )}
                {(detailProd.status === "pending" || detailProd.status === "active") && (
                  <Button color="danger" variant="flat" radius="lg" startContent={<XCircle size={14} />}
                    onPress={() => { setDetailProd(null); setRejectTarget(detailProd); setRejectReason(""); }}>
                    {detailProd.status === "active" ? t("admin.admin_revoke_title") : t("admin.admin_reject_title")}
                  </Button>
                )}
                <Button variant="light" onPress={onClose}>{t("common.close")}</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Reject / Revoke Modal */}
      <Modal isOpen={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {rejectTarget?.status === "active" ? t("admin.admin_revoke_title") : t("admin.admin_reject_title")}
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-500 mb-2"
                  dangerouslySetInnerHTML={{
                    __html: rejectTarget?.status === "active"
                      ? t("admin.admin_revoke_body", { name: rejectTarget?.name })
                      : t("admin.admin_reject_body", { name: rejectTarget?.name }),
                  }}
                />
                <Textarea
                  isRequired label={t("admin.admin_reject_reason_label")} placeholder={t("admin.admin_reject_placeholder")}
                  value={rejectReason} onValueChange={setRejectReason}
                  radius="lg" minRows={3}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
                <Button
                  color="danger" radius="lg"
                  isDisabled={!rejectReason.trim()}
                  onPress={async () => { await handleReject(); onClose(); }}
                  isLoading={actionLoading}
                >
                  {t("admin.admin_confirm_btn")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Bulk Reject Modal */}
      <Modal isOpen={bulkRejectOpen} onOpenChange={(o) => !o && setBulkRejectOpen(false)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("admin.mod_bulk_reject")} ({selectedIds.size} {t("admin.mod_products")})</ModalHeader>
              <ModalBody>
                <Textarea
                  isRequired label={t("admin.admin_reject_reason_label")} placeholder={t("admin.admin_reject_placeholder")}
                  value={bulkRejectReason} onValueChange={setBulkRejectReason}
                  radius="lg" minRows={3}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
                <Button
                  color="danger" radius="lg"
                  isDisabled={!bulkRejectReason.trim()}
                  onPress={handleBulkReject}
                  isLoading={actionLoading}
                >
                  {t("admin.admin_confirm_btn")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-800 dark:text-[#d1d5db]">{value}</p>
    </div>
  );
}
