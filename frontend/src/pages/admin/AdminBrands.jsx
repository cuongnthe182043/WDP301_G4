import React, { useEffect, useState, useCallback, useRef } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import apiClient from "../../services/apiClient";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const adminUploadImages = async (files) => {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  const res = await apiClient.post("/admin/products/media/images", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data.data;
};

const EMPTY = { name: "", country: "", gender_focus: "mixed", description: "", logo_url: "", logo_public_id: "" };

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

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await svc.listBrands()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCreate = () => {
    setForm(EMPTY);
    resetLogo();
    setModal("create");
  };
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
        name:           form.name.trim(),
        country:        form.country.trim() || "unknown",
        gender_focus:   form.gender_focus || "mixed",
        description:    form.description || "",
        logo_url:       logo_url || "",
        logo_public_id: logo_public_id || "",
      };
      if (modal === "edit") await svc.updateBrand(form._id, payload);
      else                  await svc.createBrand(payload);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("shop.brands")}</h1>
          <p className="text-sm text-default-400">{rows.length} {t("shop.brands").toLowerCase()}</p>
        </div>
        <Button color="primary" radius="lg" size="sm" startContent={<Plus size={14} />} onPress={openCreate}>
          {t("common.add_brand")}
        </Button>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-default-400">{t("common.no_data")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {[t("common.image"), t("common.name"), t("common.type"), t("common.gender"), ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {rows.map(r => (
                  <tr key={r._id} className="hover:bg-default-50 transition-colors">
                    <td className="px-4 py-3">
                      {r.logo_url
                        ? <img src={r.logo_url} alt={r.name} className="w-10 h-10 object-contain rounded-lg border border-default-100" />
                        : <div className="w-10 h-10 rounded-lg bg-default-100 flex items-center justify-center text-default-400 text-xs font-bold">{r.name[0]}</div>
                      }
                    </td>
                    <td className="px-4 py-3 font-semibold text-default-900">{r.name}</td>
                    <td className="px-4 py-3 text-default-500">{r.country || "—"}</td>
                    <td className="px-4 py-3 text-default-500 capitalize">{r.gender_focus || "mixed"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="bordered" radius="lg" isIconOnly onPress={() => openEdit(r)}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="sm" color="danger" variant="bordered" radius="lg" isIconOnly onPress={() => setDelTarget(r)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={!!modal} onOpenChange={(o) => { if (!o) { setModal(null); resetLogo(); } }} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{modal === "edit" ? t("common.edit_brand") : t("common.add_brand")}</ModalHeader>
              <ModalBody className="space-y-3">
                {/* Logo Upload */}
                <div>
                  <p className="text-sm font-medium text-default-700 mb-2">Logo</p>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-20 h-20 object-contain rounded-xl border border-default-200"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center hover:bg-danger-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-default-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-50 transition-colors"
                      >
                        <Upload size={18} className="text-default-400" />
                        <span className="text-[10px] text-default-400 mt-1">{t("common.upload") || "Upload"}</span>
                      </div>
                    )}
                    {logoPreview && (
                      <Button
                        size="sm" variant="bordered" radius="lg"
                        startContent={<Upload size={13} />}
                        onPress={() => fileRef.current?.click()}
                      >
                        {t("common.change") || "Change"}
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <Input
                  isRequired label={t("product.brand")} placeholder="Nike, Adidas..."
                  value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} radius="lg"
                />
                <Input
                  label={t("common.type")} placeholder="..."
                  value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))} radius="lg"
                />
                <Select
                  label={t("common.gender")} selectedKeys={new Set([form.gender_focus || "mixed"])}
                  onSelectionChange={k => setForm(f => ({ ...f, gender_focus: Array.from(k)[0] || "mixed" }))}
                  radius="lg"
                >
                  {GENDER_OPTS.map(o => <SelectItem key={o.key}>{o.label}</SelectItem>)}
                </Select>
                <Input
                  label={t("common.description")} placeholder={t("common.optional")}
                  value={form.description} onValueChange={v => setForm(f => ({ ...f, description: v }))} radius="lg"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
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
                <p className="text-sm text-default-500">
                  {t("common.confirm_delete")} <strong className="text-default-900">"{delTarget?.name}"</strong>?
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
                <Button color="danger" onPress={async () => { await handleDelete(); onClose(); }}>{t("common.delete")}</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
