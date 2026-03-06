import React, { useState, useEffect } from "react";
import {
  Card, CardBody, Button, Input, Pagination, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { voucherApi } from "../../services/voucherService";
import { useToast } from "../../components/common/ToastProvider";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "-";
const BLANK_VOUCHER = {
  code: "", discount_type: "percent", discount_value: 0,
  max_uses: 1, usage_limit_per_user: 1, min_order_value: 0,
  applicable_products: [], applicable_users: [],
  scope: "shop", shop_id: "", valid_from: "", valid_to: "", is_active: true,
};

export default function ManageVoucher() {
  const toast = useToast();
  const [vouchers,    setVouchers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [selected,    setSelected]    = useState(null);
  const [mode,        setMode]        = useState(null); // "detail" | "edit" | "create"
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");

  const fetch = async (pg = page, kw = searchTerm) => {
    setLoading(true);
    try {
      const res = await voucherApi.getAll(pg, 10, kw);
      setVouchers(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Lỗi tải voucher");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, searchTerm]);

  const openDetail = async (id) => {
    try {
      const res = await voucherApi.getDetail(id);
      setSelected(res); setMode("detail");
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const openEdit = (v) => { setSelected({ ...v }); setMode("edit"); };
  const openCreate = () => { setSelected({ ...BLANK_VOUCHER }); setMode("create"); };
  const closeDialog = () => { setSelected(null); setMode(null); };

  const handleSave = async () => {
    try {
      const payload = {
        ...selected,
        discount_value: Number(selected.discount_value),
        max_uses: Number(selected.max_uses),
        usage_limit_per_user: Number(selected.usage_limit_per_user),
        min_order_value: Number(selected.min_order_value),
      };
      if (mode === "create") await voucherApi.create(payload);
      else await voucherApi.update(selected._id, payload);
      toast.success(mode === "create" ? "Tạo voucher thành công" : "Cập nhật voucher thành công");
      closeDialog(); fetch();
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa voucher này?")) return;
    try {
      await voucherApi.delete(id);
      toast.success("Đã xóa voucher"); fetch();
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const set = (key, val) => setSelected((s) => ({ ...s, [key]: val }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-default-900">Quản lý Voucher</h1>
        <div className="flex gap-2">
          <form onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); setPage(1); }} className="flex gap-2">
            <Input size="sm" placeholder="Tìm voucher..." value={searchInput} onValueChange={setSearchInput}
              radius="lg" className="w-44" startContent={<Search size={14} />} />
            <Button size="sm" type="submit" variant="bordered" radius="lg">Tìm</Button>
          </form>
          <Button size="sm" color="primary" radius="lg" startContent={<Plus size={14} />} onPress={openCreate}>Tạo mới</Button>
        </div>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? <div className="flex justify-center py-10"><Spinner /></div> : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Code", "Giảm", "Loại", "Max dùng", "Đã dùng", "Từ", "Đến", "Kích hoạt", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {vouchers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-default-400">Không có voucher nào</td></tr>
                ) : vouchers.map((v) => (
                  <tr key={v._id} className="hover:bg-default-50">
                    <td className="px-4 py-3 font-bold text-default-900">{v.code}</td>
                    <td className="px-4 py-3">{v.discount_value}{v.discount_type === "percent" ? "%" : "₫"}</td>
                    <td className="px-4 py-3"><Chip size="sm" variant="flat">{v.discount_type}</Chip></td>
                    <td className="px-4 py-3">{v.max_uses}</td>
                    <td className="px-4 py-3">{v.used_count || 0}</td>
                    <td className="px-4 py-3">{formatDate(v.valid_from)}</td>
                    <td className="px-4 py-3">{formatDate(v.valid_to)}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={v.is_active ? "success" : "default"} variant="flat">{v.is_active ? "Yes" : "No"}</Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(v._id)}><Eye size={14} /></Button>
                        <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(v)}><Pencil size={14} /></Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(v._id)}><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}

      {/* Detail / Create / Edit Modal */}
      <Modal isOpen={!!selected && !!mode} onOpenChange={(o) => !o && closeDialog()} radius="xl" size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {mode === "detail" ? "Chi tiết Voucher" : mode === "create" ? "Tạo Voucher" : "Chỉnh sửa Voucher"}
              </ModalHeader>
              <ModalBody className="space-y-3">
                {selected && mode === "detail" ? (
                  <div className="space-y-2">
                    {[
                      ["Code", selected.code],
                      ["Giảm", `${selected.discount_value}${selected.discount_type === "percent" ? "%" : " VND"}`],
                      ["Loại giảm", selected.discount_type],
                      ["Max dùng", selected.max_uses],
                      ["Đã dùng", selected.used_count || 0],
                      ["Từ ngày", formatDate(selected.valid_from)],
                      ["Đến ngày", formatDate(selected.valid_to)],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center border border-default-200 rounded-xl p-3">
                        <span className="font-semibold text-default-500 text-sm">{label}</span>
                        <span className="font-medium text-sm">{val}</span>
                      </div>
                    ))}
                  </div>
                ) : selected && (
                  <>
                    <Input label="Code" value={selected.code} onValueChange={(v) => set("code", v)} radius="lg" />
                    <Select label="Loại giảm" selectedKeys={new Set([selected.discount_type])}
                      onSelectionChange={(k) => set("discount_type", Array.from(k)[0])} radius="lg">
                      <SelectItem key="percent">Phần trăm (%)</SelectItem>
                      <SelectItem key="fixed">Cố định (VND)</SelectItem>
                    </Select>
                    <Input label="Giá trị giảm" type="number" value={String(selected.discount_value)}
                      onValueChange={(v) => set("discount_value", v)} radius="lg" />
                    <Input label="Max lần dùng" type="number" value={String(selected.max_uses)}
                      onValueChange={(v) => set("max_uses", v)} radius="lg" />
                    <Input label="Giới hạn/user" type="number" value={String(selected.usage_limit_per_user)}
                      onValueChange={(v) => set("usage_limit_per_user", v)} radius="lg" />
                    <Input label="Giá trị đơn tối thiểu" type="number" value={String(selected.min_order_value)}
                      onValueChange={(v) => set("min_order_value", v)} radius="lg" />
                    <Input label="Từ ngày" type="date" value={selected.valid_from?.split("T")[0] || ""}
                      onValueChange={(v) => set("valid_from", v)} radius="lg" />
                    <Input label="Đến ngày" type="date" value={selected.valid_to?.split("T")[0] || ""}
                      onValueChange={(v) => set("valid_to", v)} radius="lg" />
                    <Select label="Kích hoạt" selectedKeys={new Set([String(selected.is_active)])}
                      onSelectionChange={(k) => set("is_active", Array.from(k)[0] === "true")} radius="lg">
                      <SelectItem key="true">Yes</SelectItem>
                      <SelectItem key="false">No</SelectItem>
                    </Select>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Đóng</Button>
                {mode !== "detail" && <Button color="primary" onPress={handleSave}>Lưu</Button>}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
