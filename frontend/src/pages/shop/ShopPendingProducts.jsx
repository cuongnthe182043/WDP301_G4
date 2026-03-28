import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { productAdminService as svc } from "../../services/productAdminService";
import {
  Spinner, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import {
  Clock, CheckCircle2, XCircle, Search, Package,
  AlertTriangle, Pencil, Eye, Layers, RefreshCw,
  ShieldAlert, ArrowRight,
} from "lucide-react";
import PaginationBar from "../../components/ui/PaginationBar";

/* ── Style tokens ── */
const STATUS_STYLE = {
  pending:  { color: "warning",  icon: Clock,        bg: "bg-amber-500/10 dark:bg-amber-400/10",   text: "text-amber-600 dark:text-amber-400"   },
  active:   { color: "success",  icon: CheckCircle2, bg: "bg-emerald-500/10 dark:bg-emerald-400/10", text: "text-emerald-600 dark:text-emerald-400" },
  inactive: { color: "danger",   icon: XCircle,      bg: "bg-rose-500/10 dark:bg-rose-400/10",     text: "text-rose-600 dark:text-rose-400"     },
};

const STAT_PALETTE = {
  amber:   { gradient: "from-amber-500/20 to-amber-600/5",   icon: "text-amber-400",   border: "border-amber-500/20",   glow: "shadow-amber-500/10" },
  emerald: { gradient: "from-emerald-500/20 to-emerald-600/5", icon: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
  rose:    { gradient: "from-rose-500/20 to-rose-600/5",     icon: "text-rose-400",    border: "border-rose-500/20",    glow: "shadow-rose-500/10" },
};

function StatCard({ icon: Icon, label, value, accent = "amber" }) {
  const p = STAT_PALETTE[accent];
  return (
    <div className={`relative overflow-hidden rounded-xl border ${p.border} bg-white dark:bg-[#131620] shadow-lg ${p.glow} p-5 hover:shadow-xl transition-all duration-300`}>
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

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active
          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
          : "bg-white dark:bg-[#1a1e2e] text-zinc-600 dark:text-[#9ea3b5] border border-zinc-200 dark:border-[#2e3347] hover:bg-zinc-50 dark:hover:bg-[#222738]"
      }`}
    >
      <Icon size={15} />
      {label}
      {count > 0 && (
        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
          active ? "bg-white/20 text-white" : "bg-amber-500 text-white"
        }`}>{count}</span>
      )}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
export default function ShopPendingProducts() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tab,        setTab]        = useState("pending"); // pending | rejected | approved
  const [limit,      setLimit]      = useState(15);
  const [products,   setProducts]   = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [detail,     setDetail]     = useState(null); // product detail modal
  const [counts,     setCounts]     = useState({ pending: 0, rejected: 0, approved: 0 });

  /* ── Load counts ── */
  const loadCounts = useCallback(async () => {
    try {
      const [pendingData, rejectedData, approvedData] = await Promise.all([
        svc.list({ status: "pending", limit: 1 }),
        svc.list({ status: "inactive", limit: 1 }),
        svc.list({ status: "active", limit: 1 }),
      ]);
      setCounts({
        pending:  pendingData?.total || 0,
        rejected: rejectedData?.total || 0,
        approved: approvedData?.total || 0,
      });
    } catch {}
  }, []);

  /* ── Load products ── */
  const loadProducts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const statusMap = { pending: "pending", rejected: "inactive", approved: "active" };
      const params = { page: p, limit: limit, status: statusMap[tab] };
      if (search.trim()) params.q = search.trim();
      const data = await svc.list(params);
      setProducts(data?.items || []);
      setTotal(data?.total || 0);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadProducts(1); }, [tab, loadProducts]);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(1), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* ── Detail modal ── */
  const openDetail = async (productId) => {
    try {
      const data = await svc.get(productId);
      setDetail(data);
    } catch { }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <ShieldAlert size={22} className="text-amber-500" />
            {t("shop_pending.title")}
          </h1>
          <p className="text-sm text-zinc-400 dark:text-[#6b7280] mt-0.5">{t("shop_pending.subtitle")}</p>
        </div>
        <button
          onClick={() => { loadCounts(); loadProducts(page); }}
          className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e] text-zinc-500 dark:text-[#9ea3b5] hover:bg-zinc-50 dark:hover:bg-[#222738] transition-all"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Clock}        label={t("shop_pending.stat_pending")}  value={counts.pending}  accent="amber" />
        <StatCard icon={CheckCircle2} label={t("shop_pending.stat_approved")} value={counts.approved} accent="emerald" />
        <StatCard icon={XCircle}      label={t("shop_pending.stat_rejected")} value={counts.rejected} accent="rose" />
      </div>

      {/* ── Tabs + Search ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <TabBtn active={tab === "pending"}  onClick={() => { setTab("pending"); setPage(1); }}  icon={Clock}        label={t("shop_pending.tab_pending")}  count={counts.pending} />
        <TabBtn active={tab === "rejected"} onClick={() => { setTab("rejected"); setPage(1); }} icon={XCircle}      label={t("shop_pending.tab_rejected")} />
        <TabBtn active={tab === "approved"} onClick={() => { setTab("approved"); setPage(1); }} icon={CheckCircle2} label={t("shop_pending.tab_approved")} />

        <div className="ml-auto relative min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("product.search_products") + "..."}
            className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
        </div>
      </div>

      {/* ── Product list ── */}
      <div className="rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#131620] shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Package size={44} className="text-zinc-300 dark:text-zinc-600" />
            <p className="text-zinc-400 dark:text-zinc-600 text-sm">
              {tab === "pending" ? t("shop_pending.no_pending") : tab === "rejected" ? t("shop_pending.no_rejected") : t("shop_pending.no_approved")}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-[#2e3347] bg-zinc-50/80 dark:bg-[#1a1e2e]/40">
                    {[
                      t("shop.product_col_image"),
                      t("shop.product_col_name"),
                      t("shop.product_col_price"),
                      t("shop_pending.col_status"),
                      ...(tab === "rejected" ? [t("shop_pending.col_reason")] : []),
                      t("shop_pending.col_date"),
                      "",
                    ].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-[#222738]">
                  {products.map(p => {
                    const s = STATUS_STYLE[p.status] || STATUS_STYLE.pending;
                    const SIcon = s.icon;
                    return (
                      <tr key={p._id} className="group hover:bg-blue-50/40 dark:hover:bg-[#1a1e2e]/60 transition-colors">
                        <td className="px-5 py-3">
                          <img
                            src={p.images?.[0] || "/no-image.jpg"}
                            alt={p.name}
                            className="w-14 h-14 object-cover rounded-xl border border-zinc-100 dark:border-[#2e3347]"
                          />
                        </td>
                        <td className="px-5 py-3 max-w-xs">
                          <p className="font-semibold text-zinc-800 dark:text-[#d1d5db] truncate">{p.name}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-600 truncate mt-0.5">{p.category_name || "—"}</p>
                          {p.brand_name && (
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-600">{p.brand_name}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 font-bold tabular-nums text-zinc-800 dark:text-[#d1d5db] whitespace-nowrap">
                          {(p.base_price || 0).toLocaleString("vi-VN")}₫
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${s.bg} ${s.text}`}>
                            <SIcon size={12} /> {t(`shop.product_status_${p.status}`)}
                          </span>
                        </td>
                        {tab === "rejected" && (
                          <td className="px-5 py-3 max-w-[200px]">
                            {p.rejection_reason ? (
                              <div className="flex items-start gap-1.5">
                                <AlertTriangle size={12} className="text-rose-500 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-rose-600 dark:text-rose-400 line-clamp-2">{p.rejection_reason}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-5 py-3 text-xs text-zinc-400 dark:text-[#6b7280] tabular-nums whitespace-nowrap">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openDetail(p._id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                              title={t("shop_pending.view_detail")}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => navigate(`/shop/admin/products/${p._id}`)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                              title={t("shop.product_edit")}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => navigate(`/shop/admin/products/${p._id}/variants`)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                              title={t("shop.product_variants")}
                            >
                              <Layers size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationBar total={total} page={page} limit={limit} onPageChange={(p) => loadProducts(p)} onLimitChange={(v) => { setLimit(v); setPage(1); }} />
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <Modal isOpen={!!detail} onOpenChange={o => !o && setDetail(null)} radius="xl" size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => detail && (
            <>
              <ModalHeader className="text-zinc-900 dark:text-white flex items-center gap-2">
                <Package size={18} className="text-blue-500" />
                {t("shop_pending.product_detail")}
              </ModalHeader>
              <ModalBody className="space-y-5">
                {/* Images */}
                {detail.images?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {detail.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-24 h-24 rounded-xl object-cover border border-zinc-100 dark:border-[#2e3347] flex-shrink-0" />
                    ))}
                  </div>
                )}

                {/* Basic info */}
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">{detail.name}</h3>
                  <p className="text-sm text-zinc-500 dark:text-[#9ea3b5] mt-1">{detail.description || t("common.no_data")}</p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-[#1a1e2e] border border-zinc-100 dark:border-[#2e3347]">
                  <span className="text-xs font-bold uppercase text-zinc-400 dark:text-[#6b7280]">{t("shop_pending.col_status")}:</span>
                  <Chip size="sm" color={STATUS_STYLE[detail.status]?.color || "default"} variant="flat">
                    {t(`shop.product_status_${detail.status}`)}
                  </Chip>
                  {detail.auto_moderated && (
                    <Chip size="sm" variant="flat" color="secondary">
                      {t("shop_pending.auto_moderated")}
                    </Chip>
                  )}
                  {detail.moderation_score > 0 && (
                    <span className="text-xs text-zinc-500 dark:text-[#9ea3b5]">
                      {t("shop_pending.moderation_score")}: {detail.moderation_score}
                    </span>
                  )}
                </div>

                {/* Rejection reason */}
                {detail.rejection_reason && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                    <AlertTriangle size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase">{t("shop_pending.rejection_reason")}</p>
                      <p className="text-sm text-rose-600 dark:text-rose-400 mt-0.5">{detail.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {/* Moderation flags */}
                {detail.moderation_flags?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-zinc-400 dark:text-[#6b7280]">{t("shop_pending.moderation_flags")}</p>
                    <div className="space-y-1.5">
                      {detail.moderation_flags.map((flag, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                          <ShieldAlert size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold text-amber-700 dark:text-amber-300">{flag.field}</span>
                            {flag.issues?.map((issue, j) => (
                              <span key={j} className="text-amber-600 dark:text-amber-400 ml-1">• {issue}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product details */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("shop.product_col_price"), value: `${(detail.base_price || 0).toLocaleString("vi-VN")}₫` },
                    { label: t("shop_pending.col_category"), value: detail.category_name || "—" },
                    { label: t("shop_pending.col_brand"), value: detail.brand_name || "—" },
                    { label: t("shop_pending.col_origin"), value: detail.origin || "—" },
                    { label: t("shop_pending.col_material"), value: detail.material || "—" },
                    { label: t("shop_pending.col_created"), value: detail.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "—" },
                  ].map((item, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#1a1e2e]/60 border border-zinc-100 dark:border-[#2e3347]">
                      <p className="text-[10px] font-bold uppercase text-zinc-400 dark:text-[#6b7280]">{item.label}</p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-[#d1d5db] mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </ModalBody>
              <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">
                  {t("common.close")}
                </button>
                <button
                  onClick={() => { onClose(); navigate(`/shop/admin/products/${detail._id}`); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
                >
                  <Pencil size={14} /> {t("shop.product_edit")}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
