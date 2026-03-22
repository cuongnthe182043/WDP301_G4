import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Chip, Spinner, Checkbox,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea, Tooltip,
} from "@heroui/react";
import { Search, CheckCircle, XCircle, Eye, Zap, AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import apiClient from "../../services/apiClient";

const STATUS_COLOR = { pending: "warning", active: "success", inactive: "default", out_of_stock: "danger" };
const SEVERITY_COLOR = { high: "danger", medium: "warning", low: "default" };

const api = {
  list:      (p) => apiClient.get("/admin/products", { params: p }).then(r => r.data.data),
  get:       (id) => apiClient.get(`/admin/products/${id}`).then(r => r.data.data),
  approve:   (id) => apiClient.patch(`/admin/products/${id}/approve`).then(r => r.data.data),
  reject:    (id, reason) => apiClient.patch(`/admin/products/${id}/reject`, { reason }).then(r => r.data.data),
  moderate:  (id) => apiClient.post(`/admin/products/${id}/moderate`).then(r => r.data.data),
  moderateAll: () => apiClient.post("/admin/products/moderate-pending").then(r => r.data.data),
  bulkApprove: (ids) => apiClient.post("/admin/products/bulk-approve", { ids }).then(r => r.data.data),
  bulkReject:  (ids, reason) => apiClient.post("/admin/products/bulk-reject", { ids, reason }).then(r => r.data.data),
  stats:     () => apiClient.get("/admin/products/stats").then(r => r.data.data),
};

const LIMIT = 20;

export default function AdminPendingProducts() {
  const { t } = useTranslation();

  const STATUS_LABEL = {
    pending:      t("shop.product_status_pending"),
    active:       t("shop.product_status_active"),
    inactive:     t("shop.product_status_inactive"),
    out_of_stock: t("shop.product_status_out_of_stock"),
  };

  const [loading,            setLoading]            = useState(true);
  const [products,           setProducts]           = useState([]);
  const [total,              setTotal]              = useState(0);
  const [page,               setPage]               = useState(1);
  const [query,              setQuery]              = useState("");
  const [detailProd,         setDetailProd]         = useState(null);
  const [rejectTarget,       setRejectTarget]       = useState(null);
  const [rejectReason,       setRejectReason]       = useState("");
  const [actionLoading,      setActionLoading]      = useState(false);
  const [selectedIds,        setSelectedIds]        = useState(new Set());
  const [moderateAllLoading, setModerateAllLoading] = useState(false);
  const [moderateResult,     setModerateResult]     = useState(null);
  const [bulkRejectOpen,     setBulkRejectOpen]     = useState(false);
  const [bulkRejectReason,   setBulkRejectReason]   = useState("");
  const [stats,              setStats]              = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, status: "pending" };
      if (query.trim()) params.q = query.trim();
      const data = await api.list(params);
      setProducts(data?.items || []);
      setTotal(data?.total   || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  const loadStats = useCallback(async () => {
    try { setStats(await api.stats()); } catch {}
  }, []);

  useEffect(() => { loadProducts(); loadStats(); }, [loadProducts, loadStats]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try { await api.approve(id); setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; }); loadProducts(); loadStats(); }
    catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await api.reject(rejectTarget._id, rejectReason.trim());
      setRejectTarget(null); setRejectReason(""); loadProducts(); loadStats();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleModerate = async (id) => {
    setActionLoading(true);
    try {
      const result = await api.moderate(id);
      // Refresh detail if open
      if (detailProd?._id === id) setDetailProd(result.product);
      loadProducts(); loadStats();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleModerateAll = async () => {
    setModerateAllLoading(true);
    try {
      const result = await api.moderateAll();
      setModerateResult(result);
      loadProducts(); loadStats();
    } catch (err) { console.error(err); }
    finally { setModerateAllLoading(false); }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      await api.bulkApprove(Array.from(selectedIds));
      setSelectedIds(new Set()); loadProducts(); loadStats();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0 || !bulkRejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.bulkReject(Array.from(selectedIds), bulkRejectReason.trim());
      setSelectedIds(new Set()); setBulkRejectOpen(false); setBulkRejectReason(""); loadProducts(); loadStats();
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
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p._id)));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900 dark:text-zinc-100">{t("admin.admin_pending_title")}</h1>
            {total > 0 && (
              <Chip size="sm" color="warning" variant="solid" className="text-white">{total}</Chip>
            )}
            {stats?.flagged > 0 && (
              <Chip size="sm" color="danger" variant="flat" startContent={<AlertTriangle size={12} />}>
                {stats.flagged} {t("admin.mod_flagged")}
              </Chip>
            )}
          </div>
          <p className="text-sm text-gray-400 dark:text-zinc-500">{t("admin.admin_pending_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" color="secondary" variant="flat" radius="lg"
            startContent={<Zap size={14} />}
            isLoading={moderateAllLoading}
            onPress={handleModerateAll}
            isDisabled={total === 0}
          >
            {t("admin.mod_auto_all")}
          </Button>
          <Input
            size="sm" placeholder={t("admin.admin_pending_search")} value={query}
            onValueChange={(v) => setQuery(v)}
            radius="lg" className="w-64"
            startContent={<Search size={14} className="text-gray-400" />}
            isClearable onClear={() => setQuery("")}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card radius="xl" shadow="sm" className="border-2 border-primary-200 dark:border-primary-800">
          <CardBody className="py-2 px-4 flex flex-row items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
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
            <div className="text-center py-16 space-y-2">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center">
                  <CheckCircle size={28} className="text-success-400" />
                </div>
              </div>
              <p className="text-gray-500 font-medium">{t("admin.admin_pending_none")}</p>
              <p className="text-sm text-gray-400">{t("admin.admin_pending_all_done")}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-100 dark:border-zinc-700">
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
                    t("admin.admin_pending_col_img"),
                    t("admin.admin_pending_col_product"),
                    t("admin.admin_pending_col_shop"),
                    t("admin.admin_pending_col_price"),
                    t("admin.mod_col_moderation"),
                    t("admin.admin_pending_col_date"),
                    t("admin.admin_pending_col_actions"),
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                {products.map((p) => {
                  const hasFlags = p.moderation_flags?.length > 0;
                  const highSev = p.moderation_flags?.some(f => f.severity === "high");
                  return (
                    <tr key={p._id} className={`hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors ${highSev ? "bg-red-50/30 dark:bg-red-900/10" : ""}`}>
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
                          className="w-14 h-14 object-cover rounded-xl border border-gray-100 dark:border-zinc-700"
                        />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-semibold text-gray-900 dark:text-zinc-100 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{p.category?.name || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 dark:text-zinc-300">{p.shop?.shop_name || "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600 whitespace-nowrap">
                        {(p.base_price || 0).toLocaleString("vi-VN")}₫
                      </td>
                      <td className="px-4 py-3">
                        {hasFlags ? (
                          <Tooltip content={p.moderation_flags.map(f => f.message).join("\n")} className="max-w-xs">
                            <div className="flex items-center gap-1">
                              <ShieldAlert size={14} className={highSev ? "text-red-500" : "text-amber-500"} />
                              <span className={`text-xs font-semibold ${highSev ? "text-red-600" : "text-amber-600"}`}>
                                {p.moderation_score}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({p.moderation_flags.length} {t("admin.mod_issues")})
                              </span>
                            </div>
                          </Tooltip>
                        ) : p.auto_moderated ? (
                          <div className="flex items-center gap-1">
                            <Shield size={14} className="text-green-500" />
                            <span className="text-xs text-green-600">{t("admin.mod_clean")}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{t("admin.mod_not_checked")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="bordered" radius="lg" isIconOnly onPress={() => openDetail(p)} title={t("common.details")}>
                            <Eye size={14} />
                          </Button>
                          <Button
                            size="sm" color="secondary" variant="flat" radius="lg" isIconOnly
                            isLoading={actionLoading}
                            onPress={() => handleModerate(p._id)}
                            title={t("admin.mod_auto_check")}
                          >
                            <Zap size={13} />
                          </Button>
                          <Button
                            size="sm" color="success" variant="flat" radius="lg"
                            startContent={<CheckCircle size={13} />}
                            isLoading={actionLoading}
                            onPress={() => handleApprove(p._id)}
                          >
                            {t("admin.approve")}
                          </Button>
                          <Button
                            size="sm" color="danger" variant="flat" radius="lg"
                            startContent={<XCircle size={13} />}
                            onPress={() => { setRejectTarget(p); setRejectReason(""); }}
                          >
                            {t("admin.admin_reject_title")}
                          </Button>
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page <= 1} onPress={() => setPage(p => p - 1)}>
            {t("shop.product_prev")}
          </Button>
          <span className="text-sm text-gray-500 dark:text-zinc-400 self-center">{t("shop.product_page", { page, total: totalPages })}</span>
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page >= totalPages} onPress={() => setPage(p => p + 1)}>
            {t("shop.product_next")}
          </Button>
        </div>
      )}

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
                          <p className="text-gray-700 dark:text-zinc-300">{flag.message}</p>
                          <p className="text-xs text-gray-400">{t("admin.mod_field")}: {flag.field}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detailProd.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {detailProd.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-100 dark:border-zinc-700" />
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
                </div>
                {detailProd.description && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{t("admin.admin_products_detail_desc")}</p>
                    <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{detailProd.description}</p>
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
                <Button color="success" variant="flat" radius="lg" startContent={<CheckCircle size={14} />}
                  isLoading={actionLoading} onPress={async () => { await handleApprove(detailProd._id); onClose(); }}>
                  {t("admin.approve")}
                </Button>
                <Button color="danger" variant="flat" radius="lg" startContent={<XCircle size={14} />}
                  onPress={() => { setDetailProd(null); setRejectTarget(detailProd); setRejectReason(""); }}>
                  {t("admin.admin_reject_title")}
                </Button>
                <Button variant="light" onPress={onClose}>{t("common.close")}</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("admin.admin_reject_title")}</ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-500 mb-2"
                  dangerouslySetInnerHTML={{ __html: t("admin.admin_reject_body", { name: rejectTarget?.name }) }}
                />
                <Textarea
                  isRequired label={t("admin.admin_reject_reason_label")} placeholder={t("admin.admin_reject_reason_placeholder")}
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
                  {t("admin.admin_reject_confirm_btn")}
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
                  isRequired label={t("admin.admin_reject_reason_label")} placeholder={t("admin.admin_reject_reason_placeholder")}
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

      {/* Moderate All Result Modal */}
      <Modal isOpen={!!moderateResult} onOpenChange={(o) => !o && setModerateResult(null)} size="xl" radius="xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => moderateResult && (
            <>
              <ModalHeader>{t("admin.mod_result_title")}</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{moderateResult.processed}</p>
                    <p className="text-xs text-gray-500">{t("admin.mod_processed")}</p>
                  </div>
                  <div className="text-center p-3 bg-success-50 dark:bg-success-900/20 rounded-xl">
                    <p className="text-2xl font-bold text-success-600">{moderateResult.approved}</p>
                    <p className="text-xs text-success-700">{t("admin.mod_auto_approved")}</p>
                  </div>
                  <div className="text-center p-3 bg-danger-50 dark:bg-danger-900/20 rounded-xl">
                    <p className="text-2xl font-bold text-danger-600">{moderateResult.rejected}</p>
                    <p className="text-xs text-danger-700">{t("admin.mod_auto_rejected")}</p>
                  </div>
                </div>
                {moderateResult.results?.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-auto">
                    {moderateResult.results.map((r) => (
                      <div key={r.productId} className={`flex items-center justify-between p-2 rounded-lg text-sm ${r.approved ? "bg-success-50 dark:bg-success-900/10" : "bg-danger-50 dark:bg-danger-900/10"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-gray-800 dark:text-zinc-200">{r.productName}</p>
                          {r.summary && <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{r.summary}</p>}
                        </div>
                        <Chip size="sm" color={r.approved ? "success" : "danger"} variant="flat" className="ml-2 shrink-0">
                          {r.approved ? t("admin.approve") : t("admin.admin_reject_title")}
                        </Chip>
                      </div>
                    ))}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.close")}</Button>
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
      <p className="font-medium text-gray-800 dark:text-zinc-200">{value}</p>
    </div>
  );
}
