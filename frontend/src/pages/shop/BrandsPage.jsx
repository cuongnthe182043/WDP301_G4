import React, { useEffect, useState, useCallback } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import { useAuth } from "../../context/AuthContext";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";

const GENDER_OPTS = [
  { key: "mixed",  label: "Tất cả" },
  { key: "men",    label: "Nam" },
  { key: "women",  label: "Nữ" },
  { key: "unisex", label: "Unisex" },
];

const EMPTY = { name: "", country: "", gender_focus: "mixed", description: "" };

export default function BrandsPage() {
  const { user } = useAuth();
  const isAdmin   = user?.role_name === "system_admin";

  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await svc.listBrands()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setModal("create"); };
  const openEdit   = (r) => {
    setForm({ name: r.name, country: r.country || "", gender_focus: r.gender_focus || "mixed", description: r.description || "", _id: r._id });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name:         form.name.trim(),
        country:      form.country.trim() || "unknown",
        gender_focus: form.gender_focus || "mixed",
        description:  form.description || "",
      };
      if (modal === "edit") await svc.updateBrand(form._id, payload);
      else                  await svc.createBrand(payload);
      setModal(null);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await svc.deleteBrand(delTarget._id); setDelTarget(null); load(); }
    catch (e) { alert(e.message || "Không thể xóa"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">Thương hiệu</h1>
          <p className="text-sm text-default-400">{rows.length} thương hiệu</p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <Chip size="sm" variant="flat" color="warning" startContent={<Lock size={11} />}>
              Chỉ xem
            </Chip>
          )}
          {isAdmin && (
            <Button color="primary" radius="lg" size="sm" startContent={<Plus size={14} />} onPress={openCreate}>
              Thêm thương hiệu
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-warning-50 border border-warning-200 rounded-xl">
          <Lock size={14} className="text-warning-600 flex-shrink-0" />
          <p className="text-xs text-warning-700">
            Thương hiệu do quản trị viên quản lý. Bạn có thể xem nhưng không thể thêm, sửa hoặc xóa.
          </p>
        </div>
      )}

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-default-400">Chưa có thương hiệu nào</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Logo", "Tên", "Quốc gia", "Đối tượng", ...(isAdmin ? [""] : [])].map(h => (
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
                    {isAdmin && (
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Modals — admin only */}
      {isAdmin && (
        <>
          <Modal isOpen={!!modal} onOpenChange={(o) => !o && setModal(null)} radius="xl">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>{modal === "edit" ? "Sửa thương hiệu" : "Thêm thương hiệu"}</ModalHeader>
                  <ModalBody className="space-y-3">
                    <Input
                      isRequired label="Tên thương hiệu" placeholder="Nike, Adidas..."
                      value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} radius="lg"
                    />
                    <Input
                      label="Quốc gia" placeholder="Việt Nam, USA..."
                      value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))} radius="lg"
                    />
                    <Select
                      label="Đối tượng" selectedKeys={new Set([form.gender_focus || "mixed"])}
                      onSelectionChange={k => setForm(f => ({ ...f, gender_focus: Array.from(k)[0] || "mixed" }))}
                      radius="lg"
                    >
                      {GENDER_OPTS.map(o => <SelectItem key={o.key}>{o.label}</SelectItem>)}
                    </Select>
                    <Input
                      label="Mô tả" placeholder="Tùy chọn"
                      value={form.description} onValueChange={v => setForm(f => ({ ...f, description: v }))} radius="lg"
                    />
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="light" onPress={onClose}>Hủy</Button>
                    <Button color="primary" radius="lg" isLoading={saving} isDisabled={!form.name.trim()} onPress={handleSave}>
                      {modal === "edit" ? "Lưu" : "Tạo"}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          <Modal isOpen={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)} radius="xl">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>Xóa thương hiệu</ModalHeader>
                  <ModalBody>
                    <p className="text-sm text-default-500">
                      Xóa thương hiệu <strong className="text-default-900">"{delTarget?.name}"</strong>?
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="light" onPress={onClose}>Hủy</Button>
                    <Button color="danger" onPress={async () => { await handleDelete(); onClose(); }}>Xóa</Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </>
      )}
    </div>
  );
}
