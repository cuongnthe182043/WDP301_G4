import React, { useEffect, useState, useCallback } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import { useAuth } from "../../context/AuthContext";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip,
} from "@heroui/react";
import { Plus, Pencil, Trash2, FolderTree, Lock } from "lucide-react";

const GENDER_OPTS = [
  { key: "",       label: "Không chọn" },
  { key: "men",    label: "Nam" },
  { key: "women",  label: "Nữ" },
  { key: "unisex", label: "Unisex" },
];

const EMPTY = { name: "", parent_id: "", gender_hint: "", description: "" };

export default function CategoriesPage() {
  const { user } = useAuth();
  const isAdmin   = user?.role_name === "system_admin";

  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | "create" | "edit"
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
    setForm({ name: r.name, parent_id: r.parent_id || "", gender_hint: r.gender_hint || "", description: r.description || "", _id: r._id });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
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
    if (!delTarget) return;
    try { await svc.deleteCategory(delTarget._id); setDelTarget(null); load(); }
    catch (e) { alert(e.message || "Không thể xóa"); }
  };

  const byId       = Object.fromEntries(rows.map(r => [r._id, r]));
  const parentOpts = rows.filter(r => (r.level ?? 0) < 2);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">Danh mục</h1>
          <p className="text-sm text-default-400">{rows.length} danh mục</p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <Chip size="sm" variant="flat" color="warning" startContent={<Lock size={11} />}>
              Chỉ xem
            </Chip>
          )}
          {isAdmin && (
            <Button color="primary" radius="lg" size="sm" startContent={<Plus size={14} />} onPress={openCreate}>
              Thêm danh mục
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-warning-50 border border-warning-200 rounded-xl">
          <Lock size={14} className="text-warning-600 flex-shrink-0" />
          <p className="text-xs text-warning-700">
            Danh mục do quản trị viên quản lý. Bạn có thể xem nhưng không thể thêm, sửa hoặc xóa.
          </p>
        </div>
      )}

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-default-400">Chưa có danh mục nào</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Tên", "Cha", "Cấp", "Giới tính", ...(isAdmin ? [""] : [])].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {rows.map(r => (
                  <tr key={r._id} className="hover:bg-default-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${(r.level || 0) * 16}px` }}>
                        <FolderTree size={14} className="text-default-400 flex-shrink-0" />
                        <span className="font-medium text-default-900">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-default-500">{byId[r.parent_id]?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" variant="flat" color={r.level === 0 ? "primary" : r.level === 1 ? "secondary" : "default"}>
                        Cấp {r.level ?? 0}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-default-500 capitalize">{r.gender_hint || "—"}</td>
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

      {/* Create/Edit Modal — admin only */}
      {isAdmin && (
        <>
          <Modal isOpen={!!modal} onOpenChange={(o) => !o && setModal(null)} radius="xl">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>{modal === "edit" ? "Sửa danh mục" : "Thêm danh mục"}</ModalHeader>
                  <ModalBody className="space-y-3">
                    <Input
                      isRequired label="Tên danh mục" placeholder="Áo khoác, Quần jeans..."
                      value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} radius="lg"
                    />
                    <Select
                      label="Danh mục cha" placeholder="Không có (danh mục gốc)"
                      selectedKeys={form.parent_id ? new Set([form.parent_id]) : new Set()}
                      onSelectionChange={k => setForm(f => ({ ...f, parent_id: Array.from(k)[0] || "" }))}
                      radius="lg"
                    >
                      {parentOpts.map(p => <SelectItem key={p._id}>{"\u00a0".repeat((p.level||0)*4)}{p.name}</SelectItem>)}
                    </Select>
                    <Select
                      label="Giới tính" placeholder="Không chọn"
                      selectedKeys={form.gender_hint ? new Set([form.gender_hint]) : new Set()}
                      onSelectionChange={k => setForm(f => ({ ...f, gender_hint: Array.from(k)[0] || "" }))}
                      radius="lg"
                    >
                      {GENDER_OPTS.filter(o => o.key).map(o => <SelectItem key={o.key}>{o.label}</SelectItem>)}
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
                  <ModalHeader>Xóa danh mục</ModalHeader>
                  <ModalBody>
                    <p className="text-sm text-default-500">
                      Xóa danh mục <strong className="text-default-900">"{delTarget?.name}"</strong>?
                      Chỉ xóa được nếu không còn sản phẩm hoặc danh mục con.
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
