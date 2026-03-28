import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Pagination, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner, Progress, Switch,
} from "@heroui/react";
import { Plus, Search, Eye, Pencil, Trash2, CheckCircle2, XCircle, Copy, Check, Send, Zap } from "lucide-react";
import { voucherApi } from "../../services/voucherService";
import { voucherDistributeApi } from "../../services/shopMarketingService";
import { useToast } from "../../components/common/ToastProvider";
import { formatCurrency } from "../../utils/formatCurrency";
import apiClient from "../../services/apiClient";

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate  = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const formatDt    = (d) => d ? new Date(d).toLocaleString("vi-VN")     : "—";
const toInputDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  // Use local date to avoid UTC-offset shift on date inputs
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Default form state (is_active = true always) ──────────────────────────────
const BLANK = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  max_uses: "",
  usage_limit_per_user: "1",
  min_order_value: "0",
  valid_from: "",
  valid_to: "",
  is_active: true,
};

// ── Client-side validation ────────────────────────────────────────────────────
function validate(fields, mode) {
  const errors = {};
  const today = todayStr();

  // Code
  const code = (fields.code || "").trim().toUpperCase();
  if (!code) {
    errors.code = "Mã voucher không được để trống";
  } else if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    errors.code = "Mã gồm 3–30 ký tự: chữ IN HOA, số, dấu _ hoặc -";
  }

  // Discount type
  if (!["percent", "fixed"].includes(fields.discount_type)) {
    errors.discount_type = "Chọn loại giảm giá";
  }

  // Discount value
  const dv = Number(fields.discount_value);
  if (!fields.discount_value && fields.discount_value !== 0) {
    errors.discount_value = "Nhập giá trị giảm";
  } else if (!isFinite(dv) || dv <= 0) {
    errors.discount_value = "Giá trị giảm phải là số dương";
  } else if (fields.discount_type === "percent" && dv > 100) {
    errors.discount_value = "Phần trăm giảm tối đa là 100%";
  } else if (fields.discount_type === "percent" && dv < 1) {
    errors.discount_value = "Phần trăm giảm tối thiểu là 1%";
  }

  // Max uses
  const mu = Number(fields.max_uses);
  if (!fields.max_uses) {
    errors.max_uses = "Nhập số lượt tối đa";
  } else if (!Number.isInteger(mu) || mu < 1) {
    errors.max_uses = "Số lượt tối đa phải là số nguyên ≥ 1";
  }

  // Usage per user
  const upu = Number(fields.usage_limit_per_user);
  if (!fields.usage_limit_per_user && fields.usage_limit_per_user !== 0) {
    errors.usage_limit_per_user = "Nhập giới hạn mỗi người dùng";
  } else if (!Number.isInteger(upu) || upu < 1) {
    errors.usage_limit_per_user = "Phải là số nguyên ≥ 1";
  } else if (!errors.max_uses && upu > mu) {
    errors.usage_limit_per_user = `Không được vượt quá tổng số lượt (${mu})`;
  }

  // Min order value
  const mov = Number(fields.min_order_value);
  if (fields.min_order_value !== "" && fields.min_order_value !== undefined) {
    if (!isFinite(mov) || mov < 0) {
      errors.min_order_value = "Giá trị đơn tối thiểu phải ≥ 0";
    }
  }

  // valid_from
  if (!fields.valid_from) {
    errors.valid_from = "Chọn ngày bắt đầu";
  } else if (mode === "create" && fields.valid_from < today) {
    errors.valid_from = "Ngày bắt đầu phải là hôm nay hoặc tương lai";
  }

  // valid_to
  if (!fields.valid_to) {
    errors.valid_to = "Chọn ngày kết thúc";
  } else if (fields.valid_from && fields.valid_to <= fields.valid_from) {
    errors.valid_to = "Ngày kết thúc phải sau ngày bắt đầu";
  }

  return errors;
}

// ── Voucher status helper ─────────────────────────────────────────────────────
function getStatus(v) {
  const now = new Date();
  if (v.is_active === false) return { label: "Chưa kích hoạt", color: "default" };
  if (new Date(v.valid_to)   <= now) return { label: "Hết hạn",     color: "danger"  };
  if (v.used_count >= v.max_uses)    return { label: "Hết lượt",    color: "danger"  };
  if (new Date(v.valid_from) >  now) return { label: "Sắp diễn ra", color: "warning" };
  return { label: "Đang hoạt động", color: "success" };
}

// ── Distribute Modal ──────────────────────────────────────────────────────────
function DistributeModal({ voucher, onClose }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({
    recipient_type: "all_buyers",
    custom_user_ids: [],
    channels: ["in_app"],
    message: "",
  });
  const [customers, setCust] = useState([]);
  const [loadingCust, setLoadCust] = useState(false);
  const [saving, setSave] = useState(false);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.recipient_type !== "custom") return;
    setLoadCust(true);
    apiClient.get("/shop/customers", { params: { limit: 100 } })
      .then(r => setCust(r.data?.data?.items || r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoadCust(false));
  }, [form.recipient_type]);

  const handleSend = async () => {
    if (form.recipient_type === "custom" && !form.custom_user_ids.length)
      return toast.error("Chọn ít nhất một khách hàng");
    if (!form.channels.length)
      return toast.error("Chọn ít nhất một kênh gửi");
    setSave(true);
    try {
      const res = await voucherDistributeApi.distribute(voucher._id, {
        recipient_type:  form.recipient_type,
        custom_user_ids: form.custom_user_ids,
        channels:        form.channels,
        message:         form.message,
      });
      toast.success(res.message || "Gửi voucher thành công");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Gửi thất bại");
    } finally { setSave(false); }
  };

  return (
    <Modal isOpen={!!voucher} onOpenChange={(o) => !o && onClose()} radius="xl" size="lg" scrollBehavior="inside">
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 text-base font-bold">
              <Send size={16} className="text-primary" />
              Gửi voucher <span className="text-primary font-mono">{voucher?.code}</span>
            </ModalHeader>
            <ModalBody className="space-y-4 pb-2">
              <Select label="Đối tượng nhận" aria-label="Đối tượng nhận"
                selectedKeys={new Set([form.recipient_type])}
                onSelectionChange={(k) => setF("recipient_type", Array.from(k)[0])}
                radius="lg">
                <SelectItem key="all_buyers">Tất cả khách đã mua</SelectItem>
                <SelectItem key="recent_30d">Khách mua trong 30 ngày qua</SelectItem>
                <SelectItem key="custom">Chọn thủ công</SelectItem>
              </Select>

              {form.recipient_type === "custom" && (
                <div>
                  <p className="text-sm font-medium text-default-700 mb-2">Chọn khách hàng</p>
                  {loadingCust ? <Spinner size="sm" /> : (
                    <div className="max-h-48 overflow-y-auto border border-default-200 rounded-xl p-2 space-y-1">
                      {customers.length === 0
                        ? <p className="text-xs text-center text-default-400 py-3">Chưa có khách hàng</p>
                        : customers.map(c => (
                          <label key={c._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-default-50 cursor-pointer">
                            <input type="checkbox"
                              checked={form.custom_user_ids.includes(c._id)}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [...form.custom_user_ids, c._id]
                                  : form.custom_user_ids.filter(id => id !== c._id);
                                setF("custom_user_ids", ids);
                              }} className="accent-primary" />
                            <div>
                              <p className="text-xs font-semibold">{c.user_id?.name || c.user_id?.username || "—"}</p>
                              <p className="text-xs text-default-400">{c.user_id?.email}</p>
                            </div>
                          </label>
                        ))
                      }
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-default-700 mb-2">Kênh gửi</p>
                <div className="flex gap-4">
                  {[{ key: "in_app", label: "Thông báo trong app" }, { key: "email", label: "Email" }].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox"
                        checked={form.channels.includes(key)}
                        onChange={(e) => {
                          const ch = e.target.checked
                            ? [...form.channels, key]
                            : form.channels.filter(c => c !== key);
                          setF("channels", ch);
                        }} className="accent-primary" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Lời nhắn (tuỳ chọn)"
                placeholder="Nhập lời nhắn kèm voucher..."
                value={form.message}
                onValueChange={(v) => setF("message", v)}
                radius="lg"
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onModalClose}>Huỷ</Button>
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function ManageVoucher() {
  const toast = useToast();

  // ── List state ───────────────────────────────────────────────────────────────
  const [vouchers,    setVouchers]    = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");
  const [statusFilter,setStatusFilter]= useState("");
  const [copiedId,    setCopiedId]    = useState(null);
  const [togglingId,  setTogglingId]  = useState(null);
  const [distributeVoucher, setDistributeVoucher] = useState(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [mode,     setMode]    = useState(null);    // "create" | "edit" | "detail"
  const [fields,   setFields]  = useState(null);    // form data
  const [errors,   setErrors]  = useState({});
  const [saving,   setSaving]  = useState(false);

  // Keep a ref so handlers always see the latest page without stale closure
  const pageRef = useRef(page);
  useEffect(() => { pageRef.current = page; }, [page]);

  // ── Load list ────────────────────────────────────────────────────────────────
  const load = useCallback(async (pg) => {
    const target = pg ?? pageRef.current;
    setListLoading(true);
    try {
      const res = await voucherApi.getAll(target, 10, searchTerm, statusFilter);
      const d   = res?.data || res;  // handle both { data: {...} } and raw
      setVouchers(d?.items || []);
      setTotal(d?.total || 0);
      setTotalPages(d?.totalPages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Không tải được danh sách voucher");
    } finally {
      setListLoading(false);
    }
  }, [searchTerm, statusFilter]); // eslint-disable-line

  useEffect(() => { load(page); }, [page, searchTerm, statusFilter]); // eslint-disable-line

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setFields(f => ({ ...f, [key]: val }));
    // Clear error for this field on change
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const openCreate = () => {
    setFields({ ...BLANK });
    setErrors({});
    setMode("create");
  };

  const openEdit = (v) => {
    setFields({
      ...BLANK,             // start clean to avoid stale keys
      ...v,
      discount_value:       String(v.discount_value ?? ""),
      max_uses:             String(v.max_uses ?? ""),
      usage_limit_per_user: String(v.usage_limit_per_user ?? "1"),
      min_order_value:      String(v.min_order_value ?? "0"),
      valid_from:           toInputDate(v.valid_from),
      valid_to:             toInputDate(v.valid_to),
      is_active:            v.is_active !== false, // default true if undefined
    });
    setErrors({});
    setMode("edit");
  };

  const openDetail = (v) => {
    setFields(v);
    setErrors({});
    setMode("detail");
  };

  const closeModal = () => {
    setMode(null);
    setFields(null);
    setErrors({});
  };

  // ── Save (create / edit) ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs = validate(fields, mode);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    const payload = {
      code:                 fields.code.trim().toUpperCase(),
      discount_type:        fields.discount_type,
      discount_value:       Number(fields.discount_value),
      max_uses:             Number(fields.max_uses),
      usage_limit_per_user: Number(fields.usage_limit_per_user) || 1,
      min_order_value:      Number(fields.min_order_value) || 0,
      valid_from:           fields.valid_from,
      valid_to:             fields.valid_to,
      is_active:            fields.is_active === true,   // strict boolean
    };

    setSaving(true);
    try {
      if (mode === "create") {
        await voucherApi.create(payload);
        toast.success("Tạo voucher thành công");
        closeModal();
        setPage(1);
        load(1);
      } else {
        await voucherApi.update(fields._id, payload);
        toast.success("Cập nhật voucher thành công");
        closeModal();
        load(pageRef.current);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Lưu thất bại";
      toast.error(msg);
      // Map backend error back to field if possible
      if (msg.toLowerCase().includes("mã voucher đã tồn tại")) {
        setErrors(prev => ({ ...prev, code: "Mã này đã được sử dụng, hãy chọn mã khác" }));
      } else if (msg.toLowerCase().includes("ngày bắt đầu")) {
        setErrors(prev => ({ ...prev, valid_from: msg }));
      } else if (msg.toLowerCase().includes("ngày kết thúc")) {
        setErrors(prev => ({ ...prev, valid_to: msg }));
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Set is_active explicitly (deterministic — no flip-direction confusion) ────
  const handleToggle = async (v, targetActive) => {
    if (togglingId) return;
    const newActive = targetActive !== undefined ? Boolean(targetActive) : !v.is_active;
    setTogglingId(v._id);
    // Optimistic update
    setVouchers(prev => prev.map(item =>
      item._id === v._id ? { ...item, is_active: newActive } : item
    ));
    try {
      // Use setActive (PUT) so the value is always set to exactly what we want
      const res = await voucherApi.setActive(v._id, newActive);
      // Backend PUT returns { success, data: voucher } — read is_active from returned voucher
      const confirmed = Boolean(res?.data?.is_active ?? newActive);
      toast.success(confirmed ? "Đã kích hoạt voucher" : "Đã tắt voucher");
      setVouchers(prev => prev.map(item =>
        item._id === v._id ? { ...item, is_active: confirmed } : item
      ));
    } catch (e) {
      // Revert to original on error
      setVouchers(prev => prev.map(item =>
        item._id === v._id ? { ...item, is_active: v.is_active } : item
      ));
      toast.error(e?.response?.data?.message || e.message || "Thao tác thất bại");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (v) => {
    if (!window.confirm(`Xoá voucher "${v.code}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await voucherApi.delete(v._id);
      toast.success("Đã xoá voucher");
      // Remove optimistically then refresh
      setVouchers(prev => prev.filter(item => item._id !== v._id));
      load(pageRef.current);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Xoá thất bại");
    }
  };

  // ── Copy code ─────────────────────────────────────────────────────────────────
  const copyCode = (code, id) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900 flex items-center gap-2">
            <Zap size={20} className="text-warning" />
            Quản lý Voucher
          </h1>
          <p className="text-sm text-default-400 mt-0.5">Tổng cộng {total} voucher</p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); setPage(1); }}
            className="flex gap-2"
          >
            <Input
              size="sm" radius="lg" className="w-48"
              placeholder="Tìm theo mã voucher..."
              value={searchInput}
              onValueChange={setSearchInput}
              startContent={<Search size={14} className="text-default-400" />}
              onClear={() => { setSearchInput(""); setSearchTerm(""); setPage(1); }}
              isClearable
            />
            <Button size="sm" type="submit" variant="bordered" radius="lg">Tìm</Button>
          </form>

          {/* Status filter */}
          <Select
            size="sm" radius="lg" className="w-44"
            aria-label="Lọc trạng thái"
            placeholder="Tất cả trạng thái"
            selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
            onSelectionChange={(k) => { setStatusFilter(Array.from(k)[0] || ""); setPage(1); }}
          >
            <SelectItem key="active">Đang hoạt động</SelectItem>
            <SelectItem key="upcoming">Sắp diễn ra</SelectItem>
            <SelectItem key="expired">Hết hạn / hết lượt</SelectItem>
            <SelectItem key="inactive">Chưa kích hoạt</SelectItem>
          </Select>

          <Button size="sm" color="primary" radius="lg" startContent={<Plus size={14} />} onPress={openCreate}>
            Tạo voucher
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {listLoading ? (
            <div className="flex justify-center items-center py-16"><Spinner label="Đang tải..." /></div>
          ) : vouchers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-default-400 text-sm">Không có voucher nào.</p>
              <Button size="sm" color="primary" radius="lg" className="mt-3" startContent={<Plus size={13} />} onPress={openCreate}>
                Tạo ngay
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {[
                    "Code",
                    "Giảm giá",
                    "Lượt dùng",
                    "Hiệu lực",
                    "Trạng thái",
                    "",
                  ].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {vouchers.map((v) => {
                  const status  = getStatus(v);
                  const usedPct = v.max_uses > 0 ? Math.min(100, Math.round((v.used_count / v.max_uses) * 100)) : 0;
                  return (
                    <tr key={v._id} className="hover:bg-default-50 transition-colors">

                      {/* Code */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-default-900 tracking-widest font-mono text-xs bg-default-100 px-2 py-0.5 rounded-md">
                            {v.code}
                          </span>
                          <button
                            className="text-default-400 hover:text-primary transition-colors"
                            title="Sao chép mã"
                            onClick={() => copyCode(v.code, v._id)}
                          >
                            {copiedId === v._id
                              ? <Check size={13} className="text-success" />
                              : <Copy size={13} />}
                          </button>
                        </div>
                        {v.min_order_value > 0 && (
                          <p className="text-xs text-default-400 mt-1">
                            Đơn tối thiểu {formatCurrency(v.min_order_value)}
                          </p>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-danger-600 text-base">
                          {v.discount_type === "percent"
                            ? `-${v.discount_value}%`
                            : `-${formatCurrency(v.discount_value)}`}
                        </span>
                      </td>

                      {/* Usage */}
                      <td className="px-4 py-3 min-w-[130px]">
                        <div className="text-xs text-default-500 mb-1.5 flex justify-between">
                          <span>Đã dùng</span>
                          <span className="font-semibold">{v.used_count ?? 0}/{v.max_uses}</span>
                        </div>
                        <Progress
                          size="sm"
                          radius="full"
                          value={usedPct}
                          aria-label={`${v.used_count ?? 0}/${v.max_uses} lượt`}
                          color={usedPct >= 100 ? "danger" : usedPct >= 75 ? "warning" : "success"}
                          className="max-w-[110px]"
                        />
                        {v.usage_limit_per_user > 1 && (
                          <p className="text-xs text-default-400 mt-1">{v.usage_limit_per_user} lượt/người</p>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="px-4 py-3 text-xs text-default-500 whitespace-nowrap">
                        <p>{formatDate(v.valid_from)}</p>
                        <p className="text-default-400">→ {formatDate(v.valid_to)}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Chip size="sm" color={status.color} variant="flat">{status.label}</Chip>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <Button isIconOnly size="sm" variant="light" title="Xem chi tiết" onPress={() => openDetail(v)}>
                            <Eye size={14} />
                          </Button>
                          <Button isIconOnly size="sm" variant="light" title="Chỉnh sửa" onPress={() => openEdit(v)}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            isIconOnly size="sm" variant="light"
                            title={v.is_active ? "Tắt voucher" : "Kích hoạt voucher"}
                            color={v.is_active ? "warning" : "success"}
                            isLoading={togglingId === v._id}
                            isDisabled={!!togglingId}
                            onPress={() => handleToggle(v, !v.is_active)}
                          >
                            {togglingId !== v._id && (v.is_active
                              ? <XCircle size={15} />
                              : <CheckCircle2 size={15} />)}
                          </Button>
                          <Button isIconOnly size="sm" variant="light" color="primary" title="Gửi cho khách" onPress={() => setDistributeVoucher(v)}>
                            <Send size={14} />
                          </Button>
                          <Button isIconOnly size="sm" variant="light" color="danger" title="Xoá voucher" onPress={() => handleDelete(v)}>
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

      {/* ── Distribute Modal ── */}
      <DistributeModal
        voucher={distributeVoucher}
        onClose={() => setDistributeVoucher(null)}
      />

      {/* ── Create / Edit / Detail Modal ── */}
      {mode && fields && (
        <Modal
          isOpen
          onOpenChange={(open) => !open && closeModal()}
          radius="xl"
          size="lg"
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="font-bold text-base">
                  {mode === "detail" ? "Chi tiết voucher"
                    : mode === "create" ? "Tạo voucher mới"
                    : `Chỉnh sửa: ${fields.code}`}
                </ModalHeader>

                <ModalBody className="space-y-4 pb-2">
                  {/* ── DETAIL VIEW ── */}
                  {mode === "detail" && (
                    <div className="space-y-2">
                      {[
                        ["Mã voucher",       fields.code],
                        ["Loại giảm",        fields.discount_type === "percent" ? "Phần trăm (%)" : "Số tiền cố định"],
                        ["Giá trị giảm",     fields.discount_type === "percent" ? `${fields.discount_value}%` : formatCurrency(fields.discount_value)],
                        ["Đơn tối thiểu",    formatCurrency(fields.min_order_value || 0)],
                        ["Tổng lượt",        fields.max_uses],
                        ["Đã dùng",          fields.used_count ?? 0],
                        ["Giới hạn/người",   fields.usage_limit_per_user],
                        ["Bắt đầu",          formatDt(fields.valid_from)],
                        ["Kết thúc",         formatDt(fields.valid_to)],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between items-center border border-default-100 rounded-xl px-4 py-2.5">
                          <span className="text-sm text-default-500 font-medium">{label}</span>
                          <span className="text-sm font-semibold">{String(val)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center border border-default-100 rounded-xl px-4 py-2.5">
                        <span className="text-sm text-default-500 font-medium">Trạng thái</span>
                        <span className={`text-sm font-semibold flex items-center gap-1.5 ${fields.is_active !== false ? "text-success-600" : "text-default-400"}`}>
                          {fields.is_active !== false
                            ? <><CheckCircle2 size={15} /> Đang kích hoạt</>
                            : <><XCircle size={15} /> Chưa kích hoạt</>}
                        </span>
                      </div>
                      {(fields.max_uses ?? 0) > 0 && (
                        <div className="pt-1">
                          <div className="flex justify-between text-xs text-default-500 mb-1">
                            <span>Tiến độ sử dụng</span>
                            <span className="font-semibold">{fields.used_count ?? 0}/{fields.max_uses}</span>
                          </div>
                          <Progress
                            value={fields.max_uses > 0 ? Math.min(100, Math.round(((fields.used_count ?? 0) / fields.max_uses) * 100)) : 0}
                            aria-label={`${fields.used_count ?? 0}/${fields.max_uses} lượt`}
                            color={getStatus(fields).color}
                            size="sm"
                            radius="full"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── CREATE / EDIT FORM ── */}
                  {(mode === "create" || mode === "edit") && (
                    <>
                      {/* Code */}
                      <Input
                        label="Mã voucher *"
                        placeholder="VD: SALE30, SUMMER2026"
                        value={fields.code}
                        onValueChange={(v) => setField("code", v.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                        radius="lg"
                        isInvalid={!!errors.code}
                        errorMessage={errors.code}
                        description="3–30 ký tự: chữ IN HOA, số, _ hoặc -"
                        maxLength={30}
                      />

                      {/* Discount type + value */}
                      <div className="grid grid-cols-2 gap-3">
                        <Select
                          label="Loại giảm *"
                          aria-label="Loại giảm giá"
                          selectedKeys={new Set([fields.discount_type])}
                          onSelectionChange={(k) => setField("discount_type", Array.from(k)[0])}
                          radius="lg"
                          isInvalid={!!errors.discount_type}
                          errorMessage={errors.discount_type}
                        >
                          <SelectItem key="percent">Phần trăm (%)</SelectItem>
                          <SelectItem key="fixed">Số tiền (₫)</SelectItem>
                        </Select>

                        <Input
                          label={fields.discount_type === "percent" ? "Giảm (%) *" : "Giảm (₫) *"}
                          type="number"
                          min="1"
                          max={fields.discount_type === "percent" ? 100 : undefined}
                          step={fields.discount_type === "percent" ? 1 : 1000}
                          placeholder={fields.discount_type === "percent" ? "1 – 100" : "VD: 50000"}
                          value={String(fields.discount_value)}
                          onValueChange={(v) => setField("discount_value", v)}
                          radius="lg"
                          isInvalid={!!errors.discount_value}
                          errorMessage={errors.discount_value}
                        />
                      </div>

                      {/* Max uses + per user */}
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Tổng số lượt *"
                          type="number"
                          min="1"
                          placeholder="VD: 100"
                          value={String(fields.max_uses)}
                          onValueChange={(v) => setField("max_uses", v)}
                          radius="lg"
                          isInvalid={!!errors.max_uses}
                          errorMessage={errors.max_uses}
                        />
                        <Input
                          label="Giới hạn mỗi người *"
                          type="number"
                          min="1"
                          placeholder="VD: 1"
                          value={String(fields.usage_limit_per_user)}
                          onValueChange={(v) => setField("usage_limit_per_user", v)}
                          radius="lg"
                          isInvalid={!!errors.usage_limit_per_user}
                          errorMessage={errors.usage_limit_per_user}
                        />
                      </div>

                      {/* Min order */}
                      <Input
                        label="Giá trị đơn tối thiểu (₫)"
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="0 = không yêu cầu"
                        value={String(fields.min_order_value)}
                        onValueChange={(v) => setField("min_order_value", v)}
                        radius="lg"
                        isInvalid={!!errors.min_order_value}
                        errorMessage={errors.min_order_value}
                      />

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Ngày bắt đầu *"
                          type="date"
                          min={mode === "create" ? todayStr() : undefined}
                          value={fields.valid_from || ""}
                          onValueChange={(v) => setField("valid_from", v)}
                          radius="lg"
                          isInvalid={!!errors.valid_from}
                          errorMessage={errors.valid_from}
                        />
                        <Input
                          label="Ngày kết thúc *"
                          type="date"
                          min={fields.valid_from || todayStr()}
                          value={fields.valid_to || ""}
                          onValueChange={(v) => setField("valid_to", v)}
                          radius="lg"
                          isInvalid={!!errors.valid_to}
                          errorMessage={errors.valid_to}
                        />
                      </div>

                      {/* is_active toggle — always defaults ON */}
                      <div className={`flex items-center justify-between rounded-xl px-4 py-3 border-2 transition-colors ${
                        fields.is_active
                          ? "border-success-300 bg-success-50"
                          : "border-default-200 bg-default-50"
                      }`}>
                        <div>
                          <p className="text-sm font-semibold text-default-800">
                            Trạng thái kích hoạt
                          </p>
                          <p className={`text-xs mt-0.5 font-medium flex items-center gap-1 ${fields.is_active ? "text-success-600" : "text-default-400"}`}>
                            {fields.is_active
                              ? <><CheckCircle2 size={13} /> Voucher sẽ hoạt động ngay khi lưu</>
                              : <><XCircle size={13} /> Voucher sẽ bị tắt, khách không dùng được</>}
                          </p>
                        </div>
                        <Switch
                          isSelected={fields.is_active === true}
                          onValueChange={(v) => setField("is_active", v === true)}
                          color="success"
                          size="lg"
                          aria-label="Kích hoạt voucher"
                        />
                      </div>
                    </>
                  )}
                </ModalBody>

                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    {mode === "detail" ? "Đóng" : "Huỷ"}
                  </Button>
                  {mode !== "detail" && (
                    <Button
                      color="primary"
                      isLoading={saving}
                      onPress={handleSave}
                      startContent={!saving && <Check size={15} />}
                    >
                      {mode === "create" ? "Tạo voucher" : "Lưu thay đổi"}
                    </Button>
                  )}
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
