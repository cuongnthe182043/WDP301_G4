import React, { useEffect, useState, useCallback, useMemo } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Tooltip,
} from "@heroui/react";
import { Plus, Pencil, Trash2, FolderTree, Lock, Search, ChevronLeft, ChevronRight, Layers, GitBranch } from "lucide-react";
import { useTranslation } from "react-i18next";

const EMPTY = { name: "", parent_id: "", gender_hint: "", description: "" };
const LIMIT = 15;

const ROOT_IDS = new Set([
  "cat-4625f711-588e-4131-abed-343ce9bbee06",
  "cat-997e61c0-488d-4abe-9f07-9b738f2ec8c1",
  "cat-7bbddde7-e682-4519-86fc-3c80d84a778f",
  "cat-acc00001-0000-4000-a000-000000000001",
]);
const isRootCategory = (r) => ROOT_IDS.has(r._id);

const LEVEL_COLOR = { 0: "primary", 1: "secondary", 2: "success" };
const GENDER_COLOR = { men: "primary", women: "danger", unisex: "warning" };

export default function AdminCategories() {
  const { t } = useTranslation();

  const GENDER_OPTS = [
    { key: "men",    label: t("profile.gender_male") },
    { key: "women",  label: t("profile.gender_female") },
    { key: "unisex", label: "Unisex" },
  ];

  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [search,    setSearch]    = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [page,      setPage]      = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await svc.listCategories()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byId = useMemo(() => Object.fromEntries(rows.map(r => [r._id, r])), [rows]);
  const parentOpts = useMemo(() => rows.filter(r => (r.level ?? 0) < 2), [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || (byId[r.parent_id]?.name || "").toLowerCase().includes(q));
    }
    if (levelFilter !== "all") list = list.filter(r => r.level === Number(levelFilter));
    return list;
  }, [rows, search, levelFilter, byId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  useEffect(() => { setPage(1); }, [search, levelFilter]);

  // Stats
  const stats = useMemo(() => {
    const lv0 = rows.filter(r => r.level === 0).length;
    const lv1 = rows.filter(r => r.level === 1).length;
    const lv2 = rows.filter(r => r.level === 2).length;
    return { total: rows.length, lv0, lv1, lv2 };
  }, [rows]);

  const openCreate = () => { setForm(EMPTY); setModal("create"); };
  const openEdit   = (r) => {
    if (isRootCategory(r)) return;
    setForm({ name: r.name, parent_id: r.parent_id || "", gender_hint: r.gender_hint || "", description: r.description || "", _id: r._id });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (modal === "create" && !form.parent_id) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        parent_id: form.parent_id || null,
        gender_hint: form.gender_hint || null,
        description: form.description || "",
      };
      if (modal === "edit") await svc.updateCategory(form._id, payload);
      else await svc.createCategory(payload);
      setModal(null);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget || isRootCategory(delTarget)) return;
    try { await svc.deleteCategory(delTarget._id); setDelTarget(null); load(); }
    catch (e) { alert(e.message || t("common.error")); }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("admin.mod_stat_total") || "Total",  value: stats.total, color: "text-gray-900 dark:text-zinc-100", icon: Layers },
          { label: `${t("common.level")} 0`,              value: stats.lv0,   color: "text-blue-600",   icon: FolderTree },
          { label: `${t("common.level")} 1`,              value: stats.lv1,   color: "text-purple-600", icon: GitBranch },
          { label: `${t("common.level")} 2`,              value: stats.lv2,   color: "text-green-600",  icon: GitBranch },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} radius="xl" shadow="sm">
              <CardBody className="py-3 px-4 flex flex-row items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-opacity-10 ${s.color}`}
                  style={{ background: `currentColor`, opacity: 0.1 }}>
                </div>
                <div className="relative -ml-12">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                    <Icon size={16} />
                  </div>
                </div>
                <div className="ml-0">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">{s.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-zinc-100">{t("shop.categories")}</h1>
          <p className="text-sm text-gray-400 dark:text-zinc-500">
            {filtered.length} / {rows.length} {t("shop.categories").toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            size="sm" radius="lg" className="w-44"
            selectedKeys={new Set([levelFilter])}
            onSelectionChange={(k) => setLevelFilter(Array.from(k)[0] || "all")}
            label={t("common.level")}
          >
            <SelectItem key="all">{t("shop.product_status_all") || "All"}</SelectItem>
            <SelectItem key="0">{`${t("common.level")} 0`}</SelectItem>
            <SelectItem key="1">{`${t("common.level")} 1`}</SelectItem>
            <SelectItem key="2">{`${t("common.level")} 2`}</SelectItem>
          </Select>
          <Input
            size="sm" radius="lg" className="w-56"
            placeholder={t("admin.admin_products_search") || "Search..."}
            value={search} onValueChange={setSearch}
            startContent={<Search size={14} className="text-gray-400" />}
            isClearable onClear={() => setSearch("")}
          />
          <Button color="primary" radius="lg" size="sm" startContent={<Plus size={14} />} onPress={openCreate}>
            {t("common.add_category")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">{t("common.no_data")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-700">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{t("common.name")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{t("common.parent")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{t("common.level")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{t("common.gender")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider w-12">Sub</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider w-28">{t("common.actions") || "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                {paginated.map((r, idx) => {
                  const locked = isRootCategory(r);
                  const rowNum = (page - 1) * LIMIT + idx + 1;
                  return (
                    <tr key={r._id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-400 dark:text-zinc-500 font-mono">{rowNum}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5" style={{ paddingLeft: `${(r.level || 0) * 20}px` }}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            locked ? "bg-primary-100 dark:bg-primary-900/30" : "bg-gray-100 dark:bg-zinc-800"
                          }`}>
                            <FolderTree size={13} className={locked ? "text-primary" : "text-gray-400 dark:text-zinc-500"} />
                          </div>
                          <span className={`font-semibold ${locked ? "text-primary" : "text-gray-900 dark:text-zinc-100"}`}>
                            {r.name}
                          </span>
                          {locked && (
                            <Tooltip content={t("common.fixed") || "Fixed root category"} placement="top">
                              <Lock size={12} className="text-primary/50 flex-shrink-0" />
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-zinc-400">{byId[r.parent_id]?.name || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <Chip size="sm" variant="flat" color={LEVEL_COLOR[r.level] || "default"} className="min-w-[52px] justify-center">
                          Lv {r.level ?? 0}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.gender_hint ? (
                          <Chip size="sm" variant="dot" color={GENDER_COLOR[r.gender_hint] || "default"} className="capitalize">
                            {r.gender_hint}
                          </Chip>
                        ) : <span className="text-gray-300 dark:text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">{r.children_count || 0}</span>
                      </td>
                      <td className="px-5 py-3">
                        {locked ? (
                          <div className="flex justify-end">
                            <Chip size="sm" variant="flat" color="default" startContent={<Lock size={10} />}>
                              {t("common.fixed") || "Fixed"}
                            </Chip>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 justify-end">
                            <Tooltip content={t("common.edit_category")}>
                              <Button size="sm" variant="flat" color="primary" radius="lg" isIconOnly onPress={() => openEdit(r)}>
                                <Pencil size={13} />
                              </Button>
                            </Tooltip>
                            <Tooltip content={t("common.delete_category")} color="danger">
                              <Button size="sm" variant="flat" color="danger" radius="lg" isIconOnly onPress={() => setDelTarget(r)}>
                                <Trash2 size={13} />
                              </Button>
                            </Tooltip>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-400 dark:text-zinc-500">
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, filtered.length)} / {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="flat" radius="lg" isIconOnly isDisabled={page <= 1} onPress={() => setPage(p => p - 1)}>
              <ChevronLeft size={15} />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`dot-${i}`} className="text-xs text-gray-400 px-1">...</span>
                ) : (
                  <Button key={p} size="sm" radius="lg" isIconOnly
                    variant={page === p ? "solid" : "flat"}
                    color={page === p ? "primary" : "default"}
                    onPress={() => setPage(p)}
                  >
                    <span className="text-xs">{p}</span>
                  </Button>
                )
              )}
            <Button size="sm" variant="flat" radius="lg" isIconOnly isDisabled={page >= totalPages} onPress={() => setPage(p => p + 1)}>
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={!!modal} onOpenChange={(o) => !o && setModal(null)} radius="xl" size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span>{modal === "edit" ? t("common.edit_category") : t("common.add_category")}</span>
                <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">
                  {modal === "edit" ? t("common.edit_category") : t("common.add_category")}
                </span>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  isRequired label={t("product.category")} placeholder="..."
                  value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} radius="lg"
                  variant="bordered"
                />
                <Select
                  isRequired={modal === "create"}
                  label={t("common.parent")} placeholder={t("common.select_parent") || "Select parent category"}
                  selectedKeys={form.parent_id ? new Set([form.parent_id]) : new Set()}
                  onSelectionChange={k => setForm(f => ({ ...f, parent_id: Array.from(k)[0] || "" }))}
                  radius="lg" variant="bordered"
                >
                  {parentOpts.map(p => <SelectItem key={p._id}>{"\u00a0".repeat((p.level||0)*4)}{p.name}</SelectItem>)}
                </Select>
                <Select
                  label={t("common.gender")} placeholder={t("common.optional")}
                  selectedKeys={form.gender_hint ? new Set([form.gender_hint]) : new Set()}
                  onSelectionChange={k => setForm(f => ({ ...f, gender_hint: Array.from(k)[0] || "" }))}
                  radius="lg" variant="bordered"
                >
                  {GENDER_OPTS.map(o => <SelectItem key={o.key}>{o.label}</SelectItem>)}
                </Select>
                <Input
                  label={t("common.description")} placeholder={t("common.optional")}
                  value={form.description} onValueChange={v => setForm(f => ({ ...f, description: v }))} radius="lg"
                  variant="bordered"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" radius="lg" onPress={onClose}>{t("common.cancel")}</Button>
                <Button
                  color="primary" radius="lg" isLoading={saving}
                  isDisabled={!form.name.trim() || (modal === "create" && !form.parent_id)}
                  onPress={handleSave}
                >
                  {modal === "edit" ? t("common.save") : t("common.create")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("common.delete_category")}</ModalHeader>
              <ModalBody>
                <div className="flex items-center gap-3 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-xl border border-danger-100 dark:border-danger-800">
                  <Trash2 size={18} className="text-danger flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-zinc-300">
                    {t("common.confirm_delete")} <strong className="text-gray-900 dark:text-zinc-100">"{delTarget?.name}"</strong>?
                    {" "}{t("common.cannot_delete_hint")}
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" radius="lg" onPress={onClose}>{t("common.cancel")}</Button>
                <Button color="danger" radius="lg" onPress={async () => { await handleDelete(); onClose(); }}>{t("common.delete")}</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
