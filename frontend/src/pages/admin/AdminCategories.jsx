import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import apiClient from "../../services/apiClient";
import {
  Spinner, Chip, Tooltip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Select, SelectItem,
} from "@heroui/react";
import {
  Plus, Pencil, Trash2, Upload, X, Search,
  ChevronLeft, ChevronRight, Tag, Globe, Image as ImageIcon,
  AlertTriangle, Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const adminUploadImages = async (files) => {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  const res = await apiClient.post("/admin/products/media/images", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

const EMPTY = { name: "", country: "", gender_focus: "mixed", description: "", logo_url: "", logo_public_id: "" };
const LIMIT = 10;

const GENDER_STYLE = {
  men:    { bg: "bg-blue-500/10 dark:bg-blue-400/10",    text: "text-blue-600 dark:text-blue-400",    ring: "ring-blue-500/20",    dot: "bg-blue-500" },
  women:  { bg: "bg-rose-500/10 dark:bg-rose-400/10",    text: "text-rose-600 dark:text-rose-400",    ring: "ring-rose-500/20",    dot: "bg-rose-500" },
  unisex: { bg: "bg-violet-500/10 dark:bg-violet-400/10",text: "text-violet-600 dark:text-violet-400",ring: "ring-violet-500/20",  dot: "bg-violet-500" },
  mixed:  { bg: "bg-zinc-500/10 dark:bg-zinc-400/10",    text: "text-zinc-500 dark:text-zinc-400",    ring: "ring-zinc-400/20",    dot: "bg-zinc-400" },
};

function GenderBadge({ value = "mixed" }) {
  const s = GENDER_STYLE[value] || GENDER_STYLE.mixed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring} capitalize`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
      {value}
    </span>
  );
}

/* ── Stat Card (same pattern as AuditLogs) ─────────────────────────────────── */
const STAT_PALETTE = {
  indigo:  { gradient: "from-indigo-500/20 to-indigo-600/5", icon: "text-indigo-400", border: "border-indigo-500/20", glow: "shadow-indigo-500/10" },
  blue:    { gradient: "from-blue-500/20 to-blue-600/5",     icon: "text-blue-400",   border: "border-blue-500/20",   glow: "shadow-blue-500/10" },
  emerald: { gradient: "from-emerald-500/20 to-emerald-600/5", icon: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
};

function StatCard({ icon: Icon, label, value, accent = "indigo" }) {
  const p = STAT_PALETTE[accent] || STAT_PALETTE.indigo;
  return (
    <div className={`relative overflow-hidden rounded-xl border ${p.border} bg-white dark:bg-zinc-900 shadow-lg ${p.glow} p-5 hover:shadow-xl transition-all duration-300`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-60 pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">{label}</p>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg bg-white/50 dark:bg-zinc-800/80 ${p.icon}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

/* ── FormField wrapper ─────────────────────────────────────────────────────── */
function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function FieldInput({ value, onChange, placeholder, ...rest }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-3.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all"
      {...rest}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
export default function AdminBrands() {
  const { t } = useTranslation();
  const fileRef = useRef(null);

  const GENDER_OPTS = [
    { key: "mixed",  label: t("common.all") },
    { key: "men",    label: t("profile.gender_male") },
    { key: "women",  label: t("profile.gender_female") },
    { key: "unisex", label: "Unisex" },
  ];

  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);   // "create" | "edit" | null
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);
  const [delTarget,   setDelTarget]   = useState(null);
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [search,      setSearch]      = useState("");
  const [genderFilter,setGenderFilter]= useState("all");
  const [page,        setPage]        = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await svc.listBrands()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || (r.country || "").toLowerCase().includes(q));
    }
    if (genderFilter !== "all") list = list.filter(r => r.gender_focus === genderFilter);
    return list;
  }, [rows, search, genderFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const paginated  = filtered.slice((page - 1) * LIMIT, page * LIMIT);
  useEffect(() => { setPage(1); }, [search, genderFilter]);

  const stats = useMemo(() => {
    const countries = new Set(rows.map(r => r.country).filter(Boolean));
    return { total: rows.length, countries: countries.size, withLogo: rows.filter(r => r.logo_url).length };
  }, [rows]);

  /* ── Logo helpers ──────────────────────────────────────────────────────── */
  const resetLogo = () => {
    setLogoFile(null); setLogoPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCreate = () => { setForm(EMPTY); resetLogo(); setModal("create"); };
  const openEdit   = (r) => {
    setForm({
      name: r.name, country: r.country || "", gender_focus: r.gender_focus || "mixed",
      description: r.description || "", logo_url: r.logo_url || "",
      logo_public_id: r.logo_public_id || "", _id: r._id,
    });
    setLogoPreview(r.logo_url || "");
    setLogoFile(null);
    setModal("edit");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => { resetLogo(); setForm(f => ({ ...f, logo_url: "", logo_public_id: "" })); };

  /* ── Save ──────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let logo_url = form.logo_url, logo_public_id = form.logo_public_id;
      if (logoFile) {
        setUploading(true);
        const uploaded = await adminUploadImages([logoFile]);
        if (uploaded?.length > 0) { logo_url = uploaded[0].url; logo_public_id = uploaded[0].public_id; }
        setUploading(false);
      }
      const payload = {
        name: form.name.trim(), country: form.country.trim() || "unknown",
        gender_focus: form.gender_focus || "mixed", description: form.description || "",
        logo_url: logo_url || "", logo_public_id: logo_public_id || "",
      };
      if (modal === "edit") await svc.updateBrand(form._id, payload);
      else await svc.createBrand(payload);
      setModal(null); resetLogo(); load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); setUploading(false); }
  };

  const handleDelete = async () => {
    try { await svc.deleteBrand(delTarget._id); setDelTarget(null); load(); }
    catch (e) { alert(e.message || t("common.error")); }
  };

  /* ── Pagination numbers ────────────────────────────────────────────────── */
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
      acc.push(p); return acc;
    }, []);

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 shrink-0" />
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
              {t("shop.brands")}
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium tabular-nums">
              {filtered.length !== rows.length
                ? `${filtered.length} / ${rows.length} brands`
                : `${rows.length} brands total`}
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-600/20"
        >
          <Plus size={14} /> {t("common.add_brand")}
        </button>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Tag}       label="Total Brands"     value={stats.total}     accent="indigo" />
        <StatCard icon={Globe}     label="Countries"        value={stats.countries} accent="blue" />
        <StatCard icon={ImageIcon} label="With Logo"        value={stats.withLogo}  accent="emerald" />
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.admin_products_search") || "Search brands…"}
            className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Gender filter pills */}
        <div className="flex items-center gap-1.5">
          {[{ key: "all", label: "All" }, ...GENDER_OPTS].map((opt) => {
            const active = genderFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setGenderFilter(opt.key)}
                className={`h-9 px-3.5 text-xs font-semibold rounded-lg border transition-all ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-xs text-zinc-400 animate-pulse font-medium">Loading brands…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Search size={24} className="text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t("common.no_data")}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {[
                    { label: "#",                    cls: "w-12 pl-5 text-left" },
                    { label: "Logo",                 cls: "w-16" },
                    { label: t("common.name"),       cls: "min-w-[160px]" },
                    { label: t("common.type"),       cls: "min-w-[120px]" },
                    { label: t("common.gender"),     cls: "min-w-[110px]" },
                    { label: t("common.description"),cls: "min-w-[200px]" },
                    { label: t("common.actions"),    cls: "w-24 text-right pr-5" },
                  ].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-500 bg-zinc-50/80 dark:bg-zinc-800/40 whitespace-nowrap ${h.cls}`}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((r, idx) => {
                  const rowNum = (page - 1) * LIMIT + idx + 1;
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={r._id}
                      className={`group border-b border-zinc-50 dark:border-zinc-800/60 last:border-0 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-colors duration-100 ${isEven ? "" : "bg-zinc-50/30 dark:bg-zinc-800/20"}`}
                    >
                      {/* # */}
                      <td className="pl-5 px-4 py-4 text-[10px] text-zinc-300 dark:text-zinc-600 font-mono tabular-nums">{rowNum}</td>

                      {/* Logo */}
                      <td className="px-4 py-4">
                        {r.logo_url ? (
                          <div className="w-11 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 flex items-center justify-center p-1.5 shadow-sm">
                            <img src={r.logo_url} alt={r.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                            <span className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase">{r.name[0]}</span>
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-4">
                        <p className="font-semibold text-zinc-800 dark:text-zinc-100 text-[13px] leading-tight">{r.name}</p>
                        {r.slug && (
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{r.slug}</p>
                        )}
                      </td>

                      {/* Country */}
                      <td className="px-4 py-4">
                        {r.country ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                            <Globe size={11} className="text-zinc-400 shrink-0" /> {r.country}
                          </span>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Gender */}
                      <td className="px-4 py-4">
                        <GenderBadge value={r.gender_focus || "mixed"} />
                      </td>

                      {/* Description */}
                      <td className="px-4 py-4">
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 max-w-[220px] leading-relaxed">
                          {r.description || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 pr-5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Tooltip content={t("common.edit_brand")} radius="sm">
                            <button
                              onClick={() => openEdit(r)}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-150"
                            >
                              <Pencil size={13} />
                            </button>
                          </Tooltip>
                          <Tooltip content={t("common.delete_brand")} radius="sm" color="danger">
                            <button
                              onClick={() => setDelTarget(r)}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-rose-400 dark:hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all duration-150"
                            >
                              <Trash2 size={13} />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium tabular-nums">
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, filtered.length)}</span>
            {" "}of{" "}
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{filtered.length}</span> brands
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`dot-${i}`} className="w-8 text-center text-xs text-zinc-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 inline-flex items-center justify-center rounded-lg text-xs font-semibold border transition-all ${
                    page === p
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/30"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ══ CREATE / EDIT MODAL ════════════════════════════════════════════ */}
      <Modal
        isOpen={!!modal}
        onOpenChange={(o) => { if (!o) { setModal(null); resetLogo(); } }}
        radius="lg" size="lg" backdrop="blur"
        classNames={{
          base: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl",
          header: "border-b border-zinc-100 dark:border-zinc-800 pb-4",
          body: "pt-5",
          footer: "border-t border-zinc-100 dark:border-zinc-800 pt-3",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${modal === "edit" ? "bg-blue-50 dark:bg-blue-500/15" : "bg-emerald-50 dark:bg-emerald-500/15"}`}>
                  {modal === "edit"
                    ? <Pencil size={16} className="text-blue-600 dark:text-blue-400" />
                    : <Plus size={16} className="text-emerald-600 dark:text-emerald-400" />}
                </div>
                <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">
                  {modal === "edit" ? t("common.edit_brand") : t("common.add_brand")}
                </p>
              </ModalHeader>

              <ModalBody className="pb-6 space-y-5">
                {/* Logo upload area */}
                <Field label="Logo">
                  <div className="flex items-start gap-5">
                    {logoPreview ? (
                      <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 flex items-center justify-center p-2 shadow-sm overflow-hidden">
                          <img src={logoPreview} alt="preview" className="w-full h-full object-contain" />
                        </div>
                        <button
                          type="button" onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-400 transition-colors"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-1.5 shrink-0 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all group"
                      >
                        <Upload size={18} className="text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors">Upload</span>
                      </button>
                    )}

                    <div className="flex-1 space-y-2 pt-1">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Upload your brand logo. Recommended size: <span className="font-semibold text-zinc-700 dark:text-zinc-300">200×200px</span>. Supports JPG, PNG, WEBP up to 10MB.
                      </p>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                        >
                          <Upload size={11} /> Change image
                        </button>
                      )}
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </Field>

                {/* Two-column layout */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label={t("product.brand")} required>
                      <FieldInput
                        value={form.name}
                        onChange={v => setForm(f => ({ ...f, name: v }))}
                        placeholder="Nike, Adidas, Puma…"
                      />
                    </Field>
                  </div>
                  <Field label={t("common.type")}>
                    <FieldInput
                      value={form.country}
                      onChange={v => setForm(f => ({ ...f, country: v }))}
                      placeholder="Vietnam, USA, Japan…"
                    />
                  </Field>
                  <Field label={t("common.gender")}>
                    <select
                      value={form.gender_focus || "mixed"}
                      onChange={(e) => setForm(f => ({ ...f, gender_focus: e.target.value }))}
                      className="w-full h-10 px-3.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all appearance-none cursor-pointer"
                    >
                      {GENDER_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Field label={t("common.description")}>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder={t("common.optional")}
                        rows={3}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all resize-none"
                      />
                    </Field>
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="gap-2">
                <button
                  onClick={onClose}
                  className="h-9 px-5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.name.trim() || saving || uploading}
                  className="h-9 px-5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {(saving || uploading) ? (
                    <><Spinner size="sm" color="white" className="scale-75" /> {uploading ? "Uploading…" : "Saving…"}</>
                  ) : (
                    <><Check size={13} /> {modal === "edit" ? t("common.save") : t("common.create")}</>
                  )}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ══ DELETE MODAL ═══════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        radius="lg" backdrop="blur"
        classNames={{
          base: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-sm",
          header: "border-b border-zinc-100 dark:border-zinc-800 pb-4",
          footer: "border-t border-zinc-100 dark:border-zinc-800 pt-3",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">{t("common.delete_brand")}</p>
              </ModalHeader>
              <ModalBody className="py-5">
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {t("common.confirm_delete")}{" "}
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">"{delTarget?.name}"</span>?
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">This action cannot be undone.</p>
              </ModalBody>
              <ModalFooter className="gap-2">
                <button
                  onClick={onClose}
                  className="h-9 px-5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={async () => { await handleDelete(); onClose(); }}
                  className="h-9 px-5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm shadow-rose-600/20 inline-flex items-center gap-2"
                >
                  <Trash2 size={13} /> {t("common.delete")}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}