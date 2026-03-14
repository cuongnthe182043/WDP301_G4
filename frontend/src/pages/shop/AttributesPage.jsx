import React, { useEffect, useState, useCallback } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import { useAuth } from "../../context/AuthContext";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Chip, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import { Plus, Pencil, Trash2, X, Lock } from "lucide-react";

const TYPE_OPTS  = [
  { key: "enum",    label: "Enum (chọn từ danh sách)" },
  { key: "select",  label: "Select" },
  { key: "text",    label: "Text" },
  { key: "number",  label: "Number" },
  { key: "boolean", label: "Boolean" },
];
const SCOPE_OPTS = [
  { key: "variant", label: "Biến thể" },
  { key: "product", label: "Sản phẩm" },
  { key: "both",    label: "Cả hai" },
];

const EMPTY = { name: "", code: "", type: "enum", scope: "both", unit: "", values: [], is_variant_dimension: false };

export default function AttributesPage() {
  const { user } = useAuth();
  const isAdmin   = user?.role_name === "system_admin";

  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [valInput,  setValInput]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await svc.listAttributes()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setValInput(""); setModal("create"); };
  const openEdit   = (r) => {
    setForm({ name: r.name, code: r.code, type: r.type || "enum", scope: r.scope || "both", unit: r.unit || "", values: r.values || [], is_variant_dimension: !!r.is_variant_dimension, _id: r._id });
    setValInput("");
    setModal("edit");
  };

  const addValue    = () => {
    const v = valInput.trim();
    if (v && !form.values.includes(v)) setForm(f => ({ ...f, values: [...f.values, v] }));
    setValInput("");
  };
  const removeValue = (v) => setForm(f => ({ ...f, values: f.values.filter(x => x !== v) }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name:                 form.name.trim(),
        code:                 form.code.trim().toLowerCase().replace(/\s+/g, "_"),
        type:                 form.type,
        scope:                form.scope,
        unit:                 form.unit.trim() || undefined,
        values:               form.values,
        is_variant_dimension: form.is_variant_dimension,
      };
      if (modal === "edit") await svc.updateAttribute(form._id, payload);
      else                  await svc.createAttribute(payload);
      setModal(null);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await svc.deleteAttribute(delTarget._id); setDelTarget(null); load(); }
    catch (e) { alert(e.message || "Không thể xóa"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">Thuộc tính</h1>
          <p className="text-sm text-default-400">{rows.length} thuộc tính</p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <Chip size="sm" variant="flat" color="warning" startContent={<Lock size={11} />}>
              Chỉ xem
            </Chip>
          )}
          {isAdmin && (
            <Button color="primary" radius="lg" size="sm" startContent={<Plus size={14} />} onPress={openCreate}>
              Thêm thuộc tính
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-warning-50 border border-warning-200 rounded-xl">
          <Lock size={14} className="text-warning-600 flex-shrink-0" />
          <p className="text-xs text-warning-700">
            Thuộc tính do quản trị viên quản lý. Bạn có thể xem nhưng không thể thêm, sửa hoặc xóa.
          </p>
        </div>
      )}

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-default-400">Chưa có thuộc tính nào</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Tên", "Mã", "Kiểu", "Phạm vi", "Giá trị mẫu", ...(isAdmin ? [""] : [])].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {rows.map(r => (
                  <tr key={r._id} className="hover:bg-default-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-default-900">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-default-500">{r.code}</td>
                    <td className="px-4 py-3 text-default-500 capitalize">{r.type}</td>
                    <td className="px-4 py-3 text-default-500 capitalize">{r.scope}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(r.values || []).slice(0, 4).map(v => (
                          <Chip key={v} size="sm" variant="flat">{v}</Chip>
                        ))}
                        {(r.values || []).length > 4 && (
                          <span className="text-xs text-default-400">+{r.values.length - 4}</span>
                        )}
                      </div>
                    </td>
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
          <Modal isOpen={!!modal} onOpenChange={(o) => !o && setModal(null)} radius="xl" size="lg">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>{modal === "edit" ? "Sửa thuộc tính" : "Thêm thuộc tính"}</ModalHeader>
                  <ModalBody className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        isRequired label="Tên thuộc tính" placeholder="Màu sắc, Kích cỡ..."
                        value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} radius="lg"
                      />
                      <Input
                        isRequired label="Mã (code)" placeholder="color, size..."
                        value={form.code} onValueChange={v => setForm(f => ({ ...f, code: v }))} radius="lg"
                        description="Chữ thường, không dấu"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Kiểu dữ liệu"
                        selectedKeys={new Set([form.type])}
                        onSelectionChange={k => setForm(f => ({ ...f, type: Array.from(k)[0] || "enum" }))}
                        radius="lg"
                      >
                        {TYPE_OPTS.map(o => <SelectItem key={o.key}>{o.label}</SelectItem>)}
                      </Select>
                      <Select
                        label="Phạm vi"
                        selectedKeys={new Set([form.scope])}
                        onSelectionChange={k => setForm(f => ({ ...f, scope: Array.from(k)[0] || "both" }))}
                        radius="lg"
                      >
                        {SCOPE_OPTS.map(o => <SelectItem key={o.key}>{o.label}</SelectItem>)}
                      </Select>
                    </div>
                    <Input
                      label="Đơn vị" placeholder="kg, cm... (tùy chọn)"
                      value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))} radius="lg"
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-default-700">Giá trị mẫu</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Đỏ, S, Cotton..." value={valInput}
                          onValueChange={setValInput} radius="lg" size="sm" className="flex-1"
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addValue())}
                        />
                        <Button size="sm" variant="bordered" radius="lg" onPress={addValue} isIconOnly>
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.values.map(v => (
                          <Chip key={v} size="sm" variant="flat" onClose={() => removeValue(v)}>{v}</Chip>
                        ))}
                      </div>
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="light" onPress={onClose}>Hủy</Button>
                    <Button
                      color="primary" radius="lg" isLoading={saving}
                      isDisabled={!form.name.trim() || !form.code.trim()}
                      onPress={handleSave}
                    >
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
                  <ModalHeader>Xóa thuộc tính</ModalHeader>
                  <ModalBody>
                    <p className="text-sm text-default-500">
                      Xóa thuộc tính <strong className="text-default-900">"{delTarget?.name}"</strong>?
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
