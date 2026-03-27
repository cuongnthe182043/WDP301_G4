import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import apiClient from "../../services/apiClient";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Tooltip,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Upload, X, Search, ChevronLeft, ChevronRight, Tag, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const adminUploadImages = async (files) => {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  const res = await apiClient.post("/admin/products/media/images", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data.data;
};

const EMPTY = { name: "", country: "", gender_focus: "mixed", description: "", logo_url: "", logo_public_id: "" };
const LIMIT = 10;
const GENDER_COLOR = { men: "primary", women: "danger", unisex: "warning", mixed: "default" };

export default function AdminBrands() {
  const { t } = useTranslation();
  const fileRef = useRef(null);

  const GENDER_OPTS = [
    { key: "mixed",  label: t("common.all") },
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
  const [logoFile,  setLogoFile]  = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [search,    setSearch]    = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [page,      setPage]      = useState(1);

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
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  useEffect(() => { setPage(1); }, [search, genderFilter]);

  // Stats
  const stats = useMemo(() => {
    const countries = new Set(rows.map(r => r.country).filter(Boolean));
    const withLogo = rows.filter(r => r.logo_url).length;
    return { total: rows.length, countries: countries.size, withLogo };
  }, [rows]);

  const resetLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCreate = () => { setForm(EMPTY); resetLogo(); setModal("create"); };
  const openEdit = (r) => {
    setForm({
      name: r.name, country: r.country || "", gender_focus: r.gender_focus || "mixed",
      description: r.description || "", logo_url: r.logo_url || "", logo_public_id: r.logo_public_id || "", _id: r._id,
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

  const removeLogo = () => {
    resetLogo();
    setForm(f => ({ ...f, logo_url: "", logo_public_id: "" }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let logo_url = form.logo_url;
      let logo_public_id = form.logo_public_id;

      if (logoFile) {
        setUploading(true);
        const uploaded = await adminUploadImages([logoFile]);
        if (uploaded?.length > 0) {
          logo_url = uploaded[0].url;
          logo_public_id = uploaded[0].public_id;
        }
        setUploading(false);
      }

      const payload = {
        name: form.name.trim(),
        country: form.country.trim() || "unknown",
        gender_focus: form.gender_focus || "mixed",
        description: form.description || "",
        logo_url: logo_url || "",
        logo_public_id: logo_public_id || "",
      };
      if (modal === "edit") await svc.updateBrand(form._id, payload);
      else await svc.createBrand(payload);
      setModal(null);
      resetLogo();
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); setUploading(false); }
  };

  const handleDelete = async () => {
    try { await svc.deleteBrand(delTarget._id); setDelTarget(null); load(); }
    catch (e) { alert(e.message || t("common.error")); }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: t("admin.mod_stat_total") || "Total brands", value: stats.total, color: "text-gray-900 dark:text-[#e8eaed]", icon: Tag },
          { label: t("common.type") || "Countries",             value: stats.countries, color: "text-blue-600", icon: Globe },
          { label: "With logo",                                  value: stats.withLogo,  color: "text-green-600", icon: Upload },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} radius="xl" shadow="sm">
              <CardBody className="py-3 px-4 flex flex-row items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}
                  style={{ background: "currentColor", opacity: 0.1 }}>
                </div>
                <div className="relative -ml-12">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                    <Icon size={16} />
                  </div>
                </div>
                <div className="ml-0">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-500 dark:text-[#9ea3b5]">{s.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-[#e8eaed]">{t("shop.brands")}</h1>
          <p className="text-sm text-gray-400 dark:text-[#6b7280]">
            {filtered.length} / {rows.length} {t("shop.brands").toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            size="sm" radius="lg" className="w-32"
            selectedKeys={new Set([genderFilter])}
            onSelectionChange={(k) => setGenderFilter(Array.from(k)[0] || "all")}
            aria-label="Filter by gender"
          >
            <SelectItem key="all">{t("shop.product_status_all") || "All"}</SelectItem>
            <SelectItem key="men">{t("profile.gender_male")}</SelectItem>
            <SelectItem key="women">{t("profile.gender_female")}</SelectItem>
            <SelectItem key="unisex">Unisex</SelectItem>
            <SelectItem key="mixed">Mixed</SelectItem>
          </Select>
          <Input
            size="sm" radius="lg" className="w-56"
            placeholder={t("admin.admin_products_search") || "Search..."}
            value={search} onValueChange={setSearch}
            startContent={<Search size={14} className="text-gray-400" />}
            isClearable onClear={() => setSearch("")}
          />
          <Button color="primary" radius="lg" size="sm" startContent={<Plus size={14} />} onPress={openCreate}>
            {t("common.add_brand")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-[#6b7280]">{t("common.no_data")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1e2e]/50 border-b border-gray-100 dark:border-[#2e3347]">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-[#9ea3b5] uppercase tracking-wider w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#9ea3b5] uppercase tracking-wider">Logo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#9ea3b5] uppercase tracking-wider">{t("common.name")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#9ea3b5] uppercase tracking-wider">{t("common.type")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#9ea3b5] uppercase tracking-wider">{t("common.gender")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#9ea3b5] uppercase tracking-wider">{t("common.description")}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-[#9ea3b5] uppercase tracking-wider w-28">{t("common.actions") || "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                {paginated.map((r, idx) => {
                  const rowNum = (page - 1) * LIMIT + idx + 1;
                  return (
                    <tr key={r._id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-400 dark:text-[#6b7280] font-mono">{rowNum}</td>
                      <td className="px-4 py-3">
                        {r.logo_url ? (
                          <img src={r.logo_url} alt={r.name}
                            className="w-10 h-10 object-contain rounded-xl border border-gray-100 dark:border-[#2e3347] bg-white dark:bg-[#131620] p-0.5" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-400 dark:text-[#6b7280]">{r.name[0]}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-[#e8eaed]">{r.name}</p>
                        {r.slug && <p className="text-[11px] text-gray-400 dark:text-[#6b7280] font-mono mt-0.5">{r.slug}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-[#9ea3b5]">{r.country || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <Chip size="sm" variant="dot" color={GENDER_COLOR[r.gender_focus] || "default"} className="capitalize">
                          {r.gender_focus || "mixed"}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-500 dark:text-[#9ea3b5] text-xs line-clamp-2 max-w-[200px]">{r.description || "—"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <Tooltip content={t("common.edit_brand")}>
                            <Button size="sm" variant="flat" color="primary" radius="lg" isIconOnly onPress={() => openEdit(r)}>
                              <Pencil size={13} />
                            </Button>
                          </Tooltip>
                          <Tooltip content={t("common.delete_brand")} color="danger">
                            <Button size="sm" variant="flat" color="danger" radius="lg" isIconOnly onPress={() => setDelTarget(r)}>
                              <Trash2 size={13} />
                            </Button>
                          </Tooltip>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-400 dark:text-[#6b7280]">
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
      <Modal isOpen={!!modal} onOpenChange={(o) => { if (!o) { setModal(null); resetLogo(); } }} radius="xl" size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span>{modal === "edit" ? t("common.edit_brand") : t("common.add_brand")}</span>
              </ModalHeader>
              <ModalBody className="space-y-4">
                {/* Logo Upload */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-[#c8cbd4] mb-2">Logo</p>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative group">
                        <img
                          src={logoPreview} alt="Logo preview"
                          className="w-24 h-24 object-contain rounded-2xl border-2 border-gray-100 dark:border-[#2e3347] bg-white dark:bg-[#131620] p-1"
                        />
                        <button
                          type="button" onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-white rounded-full flex items-center justify-center hover:bg-danger-400 transition-colors shadow-sm"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
                      >
                        <Upload size={20} className="text-gray-400 dark:text-[#6b7280]" />
                        <span className="text-[10px] text-gray-400 dark:text-[#6b7280] mt-1.5 font-medium">{t("common.upload") || "Upload"}</span>
                      </div>
                    )}
                    {logoPreview && (
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="bordered" radius="lg" startContent={<Upload size={13} />}
                          onPress={() => fileRef.current?.click()}>
                          {t("common.change") || "Change"}
                        </Button>
                        <p className="text-[10px] text-gray-400 dark:text-[#6b7280]">JPG, PNG, max 10MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>

                <Input
                  isRequired label={t("product.brand")} placeholder="Nike, Adidas..."
                  value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} radius="lg" variant="bordered"
                />
                <Input
                  label={t("common.type")} placeholder="Vietnam, USA, Japan..."
                  value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))} radius="lg" variant="bordered"
                />
                <Select
                  label={t("common.gender")} selectedKeys={new Set([form.gender_focus || "mixed"])}
                  onSelectionChange={k => setForm(f => ({ ...f, gender_focus: Array.from(k)[0] || "mixed" }))}
                  radius="lg" variant="bordered"
                >
                  {GENDER_OPTS.map(o => <SelectItem key={o.key}>{o.label}</SelectItem>)}
                </Select>
                <Input
                  label={t("common.description")} placeholder={t("common.optional")}
                  value={form.description} onValueChange={v => setForm(f => ({ ...f, description: v }))} radius="lg" variant="bordered"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" radius="lg" onPress={onClose}>{t("common.cancel")}</Button>
                <Button color="primary" radius="lg" isLoading={saving || uploading} isDisabled={!form.name.trim()} onPress={handleSave}>
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
              <ModalHeader>{t("common.delete_brand")}</ModalHeader>
              <ModalBody>
                <div className="flex items-center gap-3 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-xl border border-danger-100 dark:border-danger-800">
                  <Trash2 size={18} className="text-danger flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-[#c8cbd4]">
                    {t("common.confirm_delete")} <strong className="text-gray-900 dark:text-[#e8eaed]">"{delTarget?.name}"</strong>?
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
