import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Pagination, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner, Progress,
} from "@heroui/react";
import { Plus, Search, Eye, Pencil, Trash2, ToggleLeft, ToggleRight, Copy, Check, Send } from "lucide-react";
import { voucherApi } from "../../services/voucherService";
import { voucherDistributeApi } from "../../services/shopMarketingService";
import { useToast } from "../../components/common/ToastProvider";
import { formatCurrency } from "../../utils/formatCurrency";
import apiClient from "../../services/apiClient";

const formatDate  = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const formatDt    = (d) => d ? new Date(d).toLocaleString("vi-VN")     : "—";
const toInputDate = (d) => d ? new Date(d).toISOString().split("T")[0]  : "";

// Derive voucher status
function getStatus(v) {
  const now = new Date();
  if (!v.is_active)                     return { label: "Tắt",         color: "default" };
  if (new Date(v.valid_to)   <= now)    return { label: "Hết hạn",     color: "danger"  };
  if (new Date(v.valid_from) >  now)    return { label: "Chưa kích hoạt", color: "warning" };
  if (v.used_count >= v.max_uses)       return { label: "Hết lượt",    color: "danger"  };
  return { label: "Đang hoạt động", color: "success" };
}

const BLANK = {
  code: "", discount_type: "percent", discount_value: "",
  max_uses: "", usage_limit_per_user: 1, min_order_value: 0,
  valid_from: "", valid_to: "", is_active: true,
};

// ── Distribute Voucher Modal ───────────────────────────────────────────────────
function DistributeModal({ voucher, onClose }) {
  const toast   = useToast();
  const [form,  setForm]   = useState({ recipient_type: "all_buyers", custom_user_ids: [], channels: ["in_app"], message: "" });
  const [customers, setCust] = useState([]);
  const [loading,  setLoad]  = useState(false);
  const [saving,   setSave]  = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.recipient_type !== "custom") return;
    setLoad(true);
    apiClient.get("/shop/customers", { params: { limit: 100 } })
      .then(r => setCust(r.data?.data?.items || r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, [form.recipient_type]);

  const handleSend = async () => {
    if (form.recipient_type === "custom" && !form.custom_user_ids.length)
      return toast.error("Chọn ít nhất 1 khách hàng");
    setSave(true);
    try {
      const res = await voucherDistributeApi.distribute(voucher._id, {
        recipient_type:  form.recipient_type,
        custom_user_ids: form.custom_user_ids,
        channels:        form.channels,
        message:         form.message,
      });
      toast.success(res.message || "Đã gửi voucher thành công");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally { setSave(false); }
  };

  return (
    <Modal isOpen={!!voucher} onOpenChange={(o) => !o && onClose()} radius="xl" size="lg" scrollBehavior="inside">
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Send size={16} /> Gửi voucher <span className="text-primary font-black">{voucher?.code}</span> cho khách hàng
            </ModalHeader>
            <ModalBody className="space-y-3 pb-2">
              <Select label="Đối tượng nhận"
                selectedKeys={new Set([form.recipient_type])}
                onSelectionChange={(k) => set("recipient_type", Array.from(k)[0])} radius="lg">
                <SelectItem key="all_buyers">Tất cả khách đã mua</SelectItem>
                <SelectItem key="recent_30d">Mua trong 30 ngày gần đây</SelectItem>
                <SelectItem key="custom">Chọn thủ công</SelectItem>
              </Select>

              {form.recipient_type === "custom" && (
                <div>
                  <p className="text-sm font-medium text-default-700 mb-2">Chọn khách hàng</p>
                  {loading ? <Spinner size="sm" /> : (
                    <div className="max-h-48 overflow-y-auto border border-default-200 rounded-xl p-2 space-y-1">
                      {customers.map(c => (
                        <label key={c._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-default-50 cursor-pointer">
                          <input type="checkbox"
                            checked={form.custom_user_ids.includes(c._id)}
                            onChange={(e) => {
                              const ids = e.target.checked
                                ? [...form.custom_user_ids, c._id]
                                : form.custom_user_ids.filter(id => id !== c._id);
                              set("custom_user_ids", ids);
                            }} className="accent-primary" />
                          <div>
                            <p className="text-xs font-semibold">{c.user_id?.name || c.user_id?.username}</p>
                            <p className="text-xs text-default-400">{c.user_id?.email}</p>
                          </div>
                        </label>
                      ))}
                      {!customers.length && <p className="text-xs text-center text-default-400 py-3">Chưa có khách hàng</p>}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-default-700 mb-2">Kênh gửi</p>
                <div className="flex gap-4">
                  {[{ key: "in_app", label: "Thông báo app" }, { key: "email", label: "Email" }].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox"
                        checked={form.channels.includes(key)}
                        onChange={(e) => {
                          const ch = e.target.checked
                            ? [...form.channels, key]
                            : form.channels.filter(c => c !== key);
                          set("channels", ch);
                        }} className="accent-primary" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <Input label="Lời nhắn (tuỳ chọn)" placeholder="VD: Quà tặng dành riêng cho bạn!"
                value={form.message} onValueChange={(v) => set("message", v)} radius="lg" />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onModalClose}>Hủy</Button>
              <Button color="primary" isLoading={saving} onPress={handleSend} startContent={<Send size={14} />}>
                Gửi ngay
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default function ManageVoucher() {
  const toast = useToast();
  const [vouchers,   setVouchers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [selected,   setSelected]   = useState(null);
  const [mode,       setMode]       = useState(null); // "detail" | "edit" | "create"
  const [saving,     setSaving]     = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [distributeVoucher, setDistributeVoucher] = useState(null);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const res = await voucherApi.getAll(pg, 10, searchTerm, statusFilter);
      setVouchers(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTotalPages(res.data?.totalPages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Lỗi tải voucher");
    } finally { setLoading(false); }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => { load(page); }, [page, searchTerm, statusFilter]);

  const openCreate = () => { setSelected({ ...BLANK }); setMode("create"); };
  const openEdit   = (v) => {
    setSelected({
      ...v,
      valid_from: toInputDate(v.valid_from),
      valid_to:   toInputDate(v.valid_to),
    });
    setMode("edit");
  };
  const openDetail = (v) => { setSelected(v); setMode("detail"); };
  const closeDialog = () => { setSelected(null); setMode(null); };
  const set = (key, val) => setSelected((s) => ({ ...s, [key]: val }));

  const handleSave = async () => {
    if (!selected.code?.trim())         return toast.error("Nhập mã voucher");
    if (!selected.discount_value)       return toast.error("Nhập giá trị giảm");
    if (!selected.max_uses)             return toast.error("Nhập số lượt tối đa");
    if (!selected.valid_from)           return toast.error("Chọn ngày bắt đầu");
    if (!selected.valid_to)             return toast.error("Chọn ngày kết thúc");

    const payload = {
      ...selected,
      code:                 selected.code.trim().toUpperCase(),
      discount_value:       Number(selected.discount_value),
      max_uses:             Number(selected.max_uses),
      usage_limit_per_user: Number(selected.usage_limit_per_user) || 1,
      min_order_value:      Number(selected.min_order_value)      || 0,
    };
    setSaving(true);
    try {
      if (mode === "create") await voucherApi.create(payload);
      else                   await voucherApi.update(selected._id, payload);
      toast.success(mode === "create" ? "Tạo voucher thành công" : "Cập nhật thành công");
      closeDialog();
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  const handleToggle = async (v) => {
    try {
      const res = await voucherApi.toggle(v._id);
      toast.success(res.data?.is_active ? "Đã kích hoạt" : "Đã tắt");
      load(page);
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Xóa voucher "${v.code}"?`)) return;
    try {
      await voucherApi.delete(v._id);
      toast.success("Đã xóa voucher");
      load(page);
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const copyCode = (code, id) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">Quản lý Voucher</h1>
          <p className="text-sm text-default-400">Tổng {total} voucher</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <form onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); setPage(1); }} className="flex gap-2">
            <Input size="sm" placeholder="Tìm mã voucher..." value={searchInput} onValueChange={setSearchInput}
              radius="lg" className="w-44" startContent={<Search size={14} />} />
            <Button size="sm" type="submit" variant="bordered" radius="lg">Tìm</Button>
          </form>
          <Select size="sm" placeholder="Trạng thái" className="w-40" radius="lg"
            selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
            onSelectionChange={(k) => { setStatusFilter(Array.from(k)[0] || ""); setPage(1); }}>
            <SelectItem key="active">Đang hoạt động</SelectItem>
            <SelectItem key="upcoming">Chưa kích hoạt</SelectItem>
            <SelectItem key="expired">Hết hạn</SelectItem>
            <SelectItem key="inactive">Đã tắt</SelectItem>
          </Select>
          <Button size="sm" color="primary" radius="lg" startContent={<Plus size={14} />} onPress={openCreate}>
            Tạo mới
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : vouchers.length === 0 ? (
            <div className="py-12 text-center text-default-400">Không có voucher nào</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Code", "Giảm", "Sử dụng", "Ngày hết hạn", "Trạng thái", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {vouchers.map((v) => {
                  const status = getStatus(v);
                  const usedPct = v.max_uses > 0 ? Math.round((v.used_count / v.max_uses) * 100) : 0;
                  return (
                    <tr key={v._id} className="hover:bg-default-50">
                      {/* Code + copy */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-default-900 tracking-wider">{v.code}</span>
                          <button
                            className="text-default-400 hover:text-primary transition-colors"
                            title="Sao chép mã"
                            onClick={() => copyCode(v.code, v._id)}
                          >
                            {copiedId === v._id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                          </button>
                        </div>
                        {v.min_order_value > 0 && (
                          <p className="text-xs text-default-400 mt-0.5">Tối thiểu {formatCurrency(v.min_order_value)}</p>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-success-600">
                          {v.discount_type === "percent"
                            ? `-${v.discount_value}%`
                            : `-${formatCurrency(v.discount_value)}`}
                        </span>
                      </td>

                      {/* Usage progress */}
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="text-xs text-default-600 mb-1">{v.used_count}/{v.max_uses} lượt</div>
                        <Progress
                          size="sm" radius="full" value={usedPct}
                          color={usedPct >= 100 ? "danger" : usedPct >= 75 ? "warning" : "primary"}
                          className="max-w-[100px]"
                        />
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3 text-default-500 text-xs whitespace-nowrap">
                        {formatDate(v.valid_to)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Chip size="sm" color={status.color} variant="flat">{status.label}</Chip>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button isIconOnly size="sm" variant="light" title="Chi tiết" onPress={() => openDetail(v)}>
                            <Eye size={14} />
                          </Button>
                          <Button isIconOnly size="sm" variant="light" title="Chỉnh sửa" onPress={() => openEdit(v)}>
                            <Pencil size={14} />
                          </Button>
                          <Button isIconOnly size="sm" variant="light"
                            title={v.is_active ? "Tắt voucher" : "Bật voucher"}
                            color={v.is_active ? "warning" : "success"}
                            onPress={() => handleToggle(v)}>
                            {v.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </Button>
                          <Button isIconOnly size="sm" variant="light" color="primary"
                            title="Gửi cho khách hàng" onPress={() => setDistributeVoucher(v)}>
                            <Send size={14} />
                          </Button>
                          <Button isIconOnly size="sm" variant="light" color="danger"
                            title="Xóa" onPress={() => handleDelete(v)}>
                            <Trash2 size={14} />
                          </Button>
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

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}

      <DistributeModal voucher={distributeVoucher} onClose={() => setDistributeVoucher(null)} />

      {/* Create / Edit / Detail Modal */}
      <Modal isOpen={!!selected && !!mode} onOpenChange={(o) => !o && closeDialog()} radius="xl" size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {mode === "detail" ? "Chi tiết Voucher" : mode === "create" ? "Tạo Voucher mới" : "Chỉnh sửa Voucher"}
              </ModalHeader>
              <ModalBody className="space-y-3 pb-2">
                {selected && mode === "detail" ? (
                  // ── Detail view ────────────────────────────────────────
                  <div className="space-y-2">
                    {[
                      ["Mã",             selected.code],
                      ["Loại giảm",      selected.discount_type === "percent" ? "Phần trăm" : "Cố định"],
                      ["Giá trị giảm",   selected.discount_type === "percent"
                          ? `${selected.discount_value}%`
                          : formatCurrency(selected.discount_value)],
                      ["Đơn tối thiểu",  formatCurrency(selected.min_order_value || 0)],
                      ["Max lượt",       selected.max_uses],
                      ["Đã dùng",        selected.used_count || 0],
                      ["Giới hạn/user",  selected.usage_limit_per_user],
                      ["Bắt đầu",        formatDt(selected.valid_from)],
                      ["Kết thúc",       formatDt(selected.valid_to)],
                      ["Trạng thái",     selected.is_active ? "Bật" : "Tắt"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center border border-default-100 rounded-xl px-4 py-2">
                        <span className="text-sm text-default-500 font-medium">{label}</span>
                        <span className="text-sm font-semibold">{String(val)}</span>
                      </div>
                    ))}
                    {selected.max_uses > 0 && (
                      <div className="pt-1">
                        <div className="flex justify-between text-xs text-default-500 mb-1">
                          <span>Đã dùng</span>
                          <span>{selected.used_count}/{selected.max_uses}</span>
                        </div>
                        <Progress
                          value={Math.round((selected.used_count / selected.max_uses) * 100)}
                          color="primary" size="sm" radius="full"
                        />
                      </div>
                    )}
                  </div>
                ) : selected && (
                  // ── Create / Edit form ─────────────────────────────────
                  <>
                    <Input
                      label="Mã voucher" placeholder="VD: SALE20"
                      value={selected.code}
                      onValueChange={(v) => set("code", v.toUpperCase())}
                      radius="lg" description="Tự động chuyển in hoa"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select label="Loại giảm"
                        selectedKeys={new Set([selected.discount_type])}
                        onSelectionChange={(k) => set("discount_type", Array.from(k)[0])}
                        radius="lg">
                        <SelectItem key="percent">Phần trăm (%)</SelectItem>
                        <SelectItem key="fixed">Cố định (₫)</SelectItem>
                      </Select>
                      <Input
                        label={selected.discount_type === "percent" ? "Giá trị (%)" : "Giá trị (₫)"}
                        type="number" min="1" max={selected.discount_type === "percent" ? 100 : undefined}
                        value={String(selected.discount_value)}
                        onValueChange={(v) => set("discount_value", v)}
                        radius="lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Tổng lượt dùng" type="number" min="1"
                        value={String(selected.max_uses)}
                        onValueChange={(v) => set("max_uses", v)}
                        radius="lg"
                      />
                      <Input
                        label="Giới hạn / người" type="number" min="1"
                        value={String(selected.usage_limit_per_user)}
                        onValueChange={(v) => set("usage_limit_per_user", v)}
                        radius="lg"
                      />
                    </div>
                    <Input
                      label="Giá trị đơn tối thiểu (₫)" type="number" min="0"
                      value={String(selected.min_order_value)}
                      onValueChange={(v) => set("min_order_value", v)}
                      radius="lg"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Từ ngày" type="date"
                        value={selected.valid_from || ""}
                        onValueChange={(v) => set("valid_from", v)}
                        radius="lg"
                      />
                      <Input
                        label="Đến ngày" type="date"
                        value={selected.valid_to || ""}
                        onValueChange={(v) => set("valid_to", v)}
                        radius="lg"
                      />
                    </div>
                    <Select label="Trạng thái"
                      selectedKeys={new Set([String(selected.is_active)])}
                      onSelectionChange={(k) => set("is_active", Array.from(k)[0] === "true")}
                      radius="lg">
                      <SelectItem key="true">Bật (hoạt động)</SelectItem>
                      <SelectItem key="false">Tắt</SelectItem>
                    </Select>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Đóng</Button>
                {mode !== "detail" && (
                  <Button color="primary" isLoading={saving} onPress={handleSave}>
                    {mode === "create" ? "Tạo voucher" : "Lưu thay đổi"}
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
