import React, { useEffect, useState, useCallback, useMemo } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import {
  Spinner, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Select, SelectItem,
} from "@heroui/react";
import {
  Plus, Pencil, Trash2, Search, FolderTree, ChevronRight, ChevronDown,
  Layers, GitBranch, AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/* ── Style tokens ── */
const GENDER_STYLE = {
  men:    { bg: "bg-blue-500/10 dark:bg-blue-400/10",    text: "text-blue-600 dark:text-blue-400",    ring: "ring-blue-500/20",    dot: "bg-blue-500" },
  women:  { bg: "bg-rose-500/10 dark:bg-rose-400/10",    text: "text-rose-600 dark:text-rose-400",    ring: "ring-rose-500/20",    dot: "bg-rose-500" },
  unisex: { bg: "bg-violet-500/10 dark:bg-violet-400/10",text: "text-violet-600 dark:text-violet-400",ring: "ring-violet-500/20",  dot: "bg-violet-500" },
};

function GenderBadge({ value }) {
  if (!value) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
  const s = GENDER_STYLE[value] || GENDER_STYLE.unisex;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring} capitalize`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
      {value}
    </span>
  );
}

const LEVEL_COLOR = ["primary", "secondary", "default"];
const LEVEL_ICON_SIZE = [16, 14, 13];

/* ── Stat Card ── */
const STAT_PALETTE = {
  indigo:  { gradient: "from-indigo-500/20 to-indigo-600/5", icon: "text-indigo-400", border: "border-indigo-500/20", glow: "shadow-indigo-500/10" },
  blue:    { gradient: "from-blue-500/20 to-blue-600/5",     icon: "text-blue-400",   border: "border-blue-500/20",   glow: "shadow-blue-500/10" },
  emerald: { gradient: "from-emerald-500/20 to-emerald-600/5", icon: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
};

function StatCard({ icon: Icon, label, value, accent = "indigo" }) {
  const p = STAT_PALETTE[accent] || STAT_PALETTE.indigo;
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

/* ── FormField ── */
function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400 dark:text-[#6b7280]">
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
      className="w-full h-10 px-3.5 text-sm rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all"
      {...rest}
    />
  );
}

const EMPTY = { name: "", parent_id: "", gender_hint: "", description: "" };

/* ── Build tree from flat list ── */
function buildTree(flat) {
  const map = {};
  const roots = [];
  for (const r of flat) map[r._id] = { ...r, children: [] };
  for (const r of flat) {
    if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r._id]);
    else roots.push(map[r._id]);
  }
  return roots;
}

/* ── Flatten tree into display order ── */
function flattenTree(nodes, depth = 0) {
  const result = [];
  for (const n of nodes) {
    result.push({ ...n, _depth: depth });
    if (n.children?.length) result.push(...flattenTree(n.children, depth + 1));
  }
  return result;
}

/* ════════════════════════════════════════════════════════════════════════════ */
export default function AdminCategories() {
  const { t } = useTranslation();

  const GENDER_OPTS = [
    { key: "men",    label: t("profile.gender_male") },
    { key: "women",  label: t("profile.gender_female") },
    { key: "unisex", label: "Unisex" },
  ];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);   // "create" | "edit"
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(new Set());
  const [filterGender, setFilterGender] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await svc.listCategories()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── derived data ── */
  const byId = useMemo(() => Object.fromEntries(rows.map(r => [r._id, r])), [rows]);
  const tree = useMemo(() => buildTree(rows), [rows]);
  const flatList = useMemo(() => flattenTree(tree), [tree]);

  const stats = useMemo(() => {
    const levels = [0, 0, 0];
    rows.forEach(r => { if ((r.level ?? 0) < 3) levels[r.level ?? 0]++; });
    return { total: rows.length, level0: levels[0], level1: levels[1], level2: levels[2] };
  }, [rows]);

  /* filter + collapse logic */
  const isAncestorCollapsed = (node) => {
    let pid = node.parent_id;
    while (pid) {
      if (collapsed.has(pid)) return true;
      pid = byId[pid]?.parent_id;
    }
    return false;
  };

  const displayed = useMemo(() => {
    let list = flatList;
    // hide collapsed children
    list = list.filter(n => !isAncestorCollapsed(n));
    // search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.name.toLowerCase().includes(q));
    }
    // gender filter
    if (filterGender) {
      list = list.filter(n => n.gender_hint === filterGender || !n.gender_hint);
    }
    return list;
  }, [flatList, collapsed, search, filterGender]);

  const toggleCollapse = (id) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const parentOpts = rows.filter(r => (r.level ?? 0) < 2);

  /* ── CRUD ── */
  const openCreate = (parentId) => {
    setForm({ ...EMPTY, parent_id: parentId || "" });
    setModal("create");
  };
  const openEdit = (r) => {
    setForm({ name: r.name, parent_id: r.parent_id || "", gender_hint: r.gender_hint || "", description: r.description || "", _id: r._id });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        parent_id:   form.parent_id || null,
        gender_hint: form.gender_hint || null,
        description: form.description || "",
      };
      if (modal === "edit") await svc.updateCategory(form._id, payload);
      else                  await svc.createCategory(payload);
      setModal(null);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try { await svc.deleteCategory(delTarget._id); setDelTarget(null); load(); }
    catch (e) { alert(e.message || t("common.error")); }
  };

  const hasChildren = (id) => rows.some(r => r.parent_id === id);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <FolderTree size={22} className="text-blue-500" />
            {t("shop.categories")}
          </h1>
          <p className="text-sm text-zinc-400 dark:text-[#6b7280] mt-0.5">{t("admin.manage_category_hierarchy")}</p>
        </div>
        <button
          onClick={() => openCreate("")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
        >
          <Plus size={16} /> {t("common.add_category")}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Layers}    label={t("admin.total_categories")} value={stats.total}  accent="indigo" />
        <StatCard icon={FolderTree} label={t("admin.root_categories")} value={stats.level0} accent="blue" />
        <StatCard icon={GitBranch} label={t("admin.sub_categories")}  value={stats.level1 + stats.level2} accent="emerald" />
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("common.search") + "..."}
            className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
        </div>
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          className="h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-700 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
        >
          <option value="">{t("common.all")} {t("common.gender")}</option>
          {GENDER_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <button
          onClick={() => setCollapsed(new Set())}
          className="h-10 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-600 dark:text-[#9ea3b5] hover:bg-zinc-50 dark:hover:bg-[#222738] transition-all"
        >
          {t("admin.expand_all")}
        </button>
        <button
          onClick={() => {
            const ids = rows.filter(r => hasChildren(r._id)).map(r => r._id);
            setCollapsed(new Set(ids));
          }}
          className="h-10 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-600 dark:text-[#9ea3b5] hover:bg-zinc-50 dark:hover:bg-[#222738] transition-all"
        >
          {t("admin.collapse_all")}
        </button>
      </div>

      {/* ── Category tree table ── */}
      <div className="rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#131620] shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 dark:text-zinc-600">{t("common.no_data")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-[#2e3347] bg-zinc-50/80 dark:bg-[#1a1e2e]/40">
                  {[t("common.name"), t("common.level"), t("common.gender"), t("admin.children_count"), ""].map((h, i) => (
                    <th key={i} className={`text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] ${i === 4 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#222738]">
                {displayed.map(r => {
                  const depth = r._depth ?? r.level ?? 0;
                  const hasKids = hasChildren(r._id);
                  const isCollapsed = collapsed.has(r._id);
                  return (
                    <tr key={r._id} className="group hover:bg-blue-50/40 dark:hover:bg-[#1a1e2e]/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 28}px` }}>
                          {hasKids ? (
                            <button
                              onClick={() => toggleCollapse(r._id)}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-zinc-200 dark:hover:bg-[#2e3347] transition-colors flex-shrink-0"
                            >
                              {isCollapsed
                                ? <ChevronRight size={14} className="text-zinc-400 dark:text-zinc-500" />
                                : <ChevronDown size={14} className="text-zinc-400 dark:text-zinc-500" />
                              }
                            </button>
                          ) : (
                            <span className="w-6 flex-shrink-0" />
                          )}
                          <FolderTree size={LEVEL_ICON_SIZE[depth] || 13} className={depth === 0 ? "text-blue-500" : depth === 1 ? "text-violet-400" : "text-zinc-400 dark:text-zinc-500"} />
                          <span className={`font-semibold ${depth === 0 ? "text-zinc-900 dark:text-white text-[15px]" : "text-zinc-700 dark:text-[#d1d5db]"}`}>
                            {r.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Chip size="sm" variant="flat" color={LEVEL_COLOR[depth] || "default"}>
                          {t("common.level")} {depth}
                        </Chip>
                      </td>
                      <td className="px-5 py-3">
                        <GenderBadge value={r.gender_hint} />
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-zinc-500 dark:text-[#9ea3b5] tabular-nums">
                          {r.children_count ?? r.children?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          {depth < 2 && (
                            <button
                              onClick={() => openCreate(r._id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                              title={t("common.add_category")}
                            >
                              <Plus size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(r)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                            title={t("common.edit_category")}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDelTarget(r)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            title={t("common.delete_category")}
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* ── Create / Edit Modal ── */}
      <Modal isOpen={!!modal} onOpenChange={(o) => !o && setModal(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-zinc-900 dark:text-white">
                {modal === "edit" ? t("common.edit_category") : t("common.add_category")}
              </ModalHeader>
              <ModalBody className="space-y-4">
                <Field label={t("common.name")} required>
                  <FieldInput
                    value={form.name}
                    onChange={v => setForm(f => ({ ...f, name: v }))}
                    placeholder={t("admin.category_name_placeholder")}
                  />
                </Field>
                <Field label={t("common.parent")}>
                  <select
                    value={form.parent_id}
                    onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  >
                    <option value="">{t("admin.no_parent_root")}</option>
                    {parentOpts.map(p => (
                      <option key={p._id} value={p._id}>
                        {"\u00a0".repeat((p.level || 0) * 4)}{p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("common.gender")}>
                  <select
                    value={form.gender_hint}
                    onChange={e => setForm(f => ({ ...f, gender_hint: e.target.value }))}
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  >
                    <option value="">{t("common.optional")}</option>
                    {GENDER_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label={t("common.description")}>
                  <FieldInput
                    value={form.description}
                    onChange={v => setForm(f => ({ ...f, description: v }))}
                    placeholder={t("common.optional")}
                  />
                </Field>
              </ModalBody>
              <ModalFooter>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
                >
                  {saving && <Spinner size="sm" color="white" />}
                  {modal === "edit" ? t("common.save") : t("common.create")}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal isOpen={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-zinc-900 dark:text-white">{t("common.delete_category")}</ModalHeader>
              <ModalBody>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                  <AlertTriangle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-rose-700 dark:text-rose-300">
                    <p>{t("common.confirm_delete")} <strong>"{delTarget?.name}"</strong>?</p>
                    {hasChildren(delTarget?._id) && (
                      <p className="mt-1 font-semibold">{t("admin.delete_has_children_warning")}</p>
                    )}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={async () => { await handleDelete(); onClose(); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors active:scale-[0.97]"
                >
                  {t("common.delete")}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
