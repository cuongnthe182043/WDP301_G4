import React, { useEffect, useState, useCallback } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip,
} from "@heroui/react";
import { Plus, Pencil, Trash2, FolderTree, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const EMPTY = { name: "", parent_id: "", gender_hint: "", description: "" };

// The 4 fixed root parent category IDs
const ROOT_IDS = new Set([
  "cat-4625f711-588e-4131-abed-343ce9bbee06", // Thời trang nam
  "cat-997e61c0-488d-4abe-9f07-9b738f2ec8c1", // Thời trang nữ
  "cat-7bbddde7-e682-4519-86fc-3c80d84a778f", // Unisex
  "cat-acc00001-0000-4000-a000-000000000001", // Phụ kiện
]);
const isRootCategory = (r) => ROOT_IDS.has(r._id);

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

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await svc.listCategories()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        name:        form.name.trim(),
        parent_id:   form.parent_id   || null,
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
    if (!delTarget || isRootCategory(delTarget)) return;
    try { await svc.deleteCategory(delTarget._id); setDelTarget(null); load(); }
    catch (e) { alert(e.message || t("common.error")); }
  };

  const byId       = Object.fromEntries(rows.map(r => [r._id, r]));
  const parentOpts = rows.filter(r => (r.level ?? 0) < 2);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("shop.categories")}</h1>
          <p className="text-sm text-default-400">{rows.length} {t("shop.categories").toLowerCase()}</p>
        </div>
        <Button color="primary" radius="lg" size="sm" startContent={<Plus size={14} />} onPress={openCreate}>
          {t("common.add_category")}
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
                  {[t("common.name"), t("common.parent"), t("common.level"), t("common.gender"), ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {rows.map(r => {
                  const locked = isRootCategory(r);
                  return (
                    <tr key={r._id} className="hover:bg-default-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${(r.level || 0) * 16}px` }}>
                          <FolderTree size={14} className="text-default-400 flex-shrink-0" />
                          <span className={`font-medium ${locked ? "text-primary" : "text-default-900"}`}>{r.name}</span>
                          {locked && <Lock size={12} className="text-default-300 flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-default-500">{byId[r.parent_id]?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <Chip size="sm" variant="flat" color={r.level === 0 ? "primary" : r.level === 1 ? "secondary" : "default"}>
                          {t("common.level")} {r.level ?? 0}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 text-default-500 capitalize">{r.gender_hint || "—"}</td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <div className="flex justify-end">
                            <Chip size="sm" variant="flat" color="default" startContent={<Lock size={10} />}>
                              {t("common.fixed") || "Fixed"}
                            </Chip>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="bordered" radius="lg" isIconOnly onPress={() => openEdit(r)}>
                              <Pencil size={13} />
                            </Button>
                            <Button size="sm" color="danger" variant="bordered" radius="lg" isIconOnly onPress={() => setDelTarget(r)}>
                              <Trash2 size={13} />
                            </Button>
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

      {/* Create/Edit Modal */}
      <Modal isOpen={!!modal} onOpenChange={(o) => !o && setModal(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{modal === "edit" ? t("common.edit_category") : t("common.add_category")}</ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  isRequired label={t("product.category")} placeholder="..."
                  value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} radius="lg"
                />
                <Select
                  isRequired={modal === "create"}
                  label={t("common.parent")} placeholder={t("common.select_parent") || "Select parent category"}
                  selectedKeys={form.parent_id ? new Set([form.parent_id]) : new Set()}
                  onSelectionChange={k => setForm(f => ({ ...f, parent_id: Array.from(k)[0] || "" }))}
                  radius="lg"
                >
                  {parentOpts.map(p => <SelectItem key={p._id}>{"\u00a0".repeat((p.level||0)*4)}{p.name}</SelectItem>)}
                </Select>
                <Select
                  label={t("common.gender")} placeholder={t("common.optional")}
                  selectedKeys={form.gender_hint ? new Set([form.gender_hint]) : new Set()}
                  onSelectionChange={k => setForm(f => ({ ...f, gender_hint: Array.from(k)[0] || "" }))}
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
                <p className="text-sm text-default-500">
                  {t("common.confirm_delete")} <strong className="text-default-900">"{delTarget?.name}"</strong>?
                  {" "}{t("common.cannot_delete_hint")}
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
