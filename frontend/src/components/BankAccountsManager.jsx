import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Select, SelectItem, Skeleton, Chip, Avatar,
} from "@heroui/react";
import {
  Plus, Trash2, Star, Check, AlertCircle, CreditCard,
  Building2, Shield, ShieldCheck, KeyRound, RefreshCw,
} from "lucide-react";
import { bankService } from "../services/bankService";

/* ─── VietQR bank list ─────────────────────────────────────────── */
async function fetchVietQRBanks() {
  const res = await fetch("https://api.vietqr.io/v2/banks");
  const json = await res.json();
  return (json.data || []).map((b) => ({
    code:     b.code,
    name:     b.name,
    shortName:b.shortName,
    logo:     b.logo,
  }));
}

/* ─── Helpers ──────────────────────────────────────────────────── */
const maskAcc = (acc = "") =>
  acc.length <= 4 ? acc : `•••• •••• ${acc.slice(-4)}`;

function validateForm(form) {
  const e = {};
  if (!form.bank_code) e.bank_code = "Vui lòng chọn ngân hàng";
  if (!form.account_number.trim()) {
    e.account_number = "Vui lòng nhập số tài khoản";
  } else if (!/^\d+$/.test(form.account_number)) {
    e.account_number = "Số tài khoản chỉ được chứa chữ số";
  } else if (form.account_number.length < 6 || form.account_number.length > 20) {
    e.account_number = "Số tài khoản phải từ 6 đến 20 chữ số";
  }
  if (!form.owner_name.trim()) {
    e.owner_name = "Vui lòng nhập tên chủ tài khoản";
  } else if (form.owner_name.trim().length < 2) {
    e.owner_name = "Tên chủ tài khoản ít nhất 2 ký tự";
  } else if (/[^a-zA-ZÀ-ỹ\s]/.test(form.owner_name)) {
    e.owner_name = "Tên không được chứa ký tự đặc biệt";
  }
  return e;
}

/* ─── Skeleton card ────────────────────────────────────────────── */
function BankCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-50 bg-white">
      <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-3 w-48 rounded-lg" />
        <Skeleton className="h-3 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 rounded-xl" />
    </div>
  );
}

/* ─── OTP dots display ─────────────────────────────────────────── */
function OtpDots({ otp }) {
  if (!otp) return null;
  return (
    <div className="mt-3 p-3 rounded-xl text-center" style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0" }}>
      <p className="text-xs text-green-600 font-semibold mb-1">Mã OTP (môi trường test)</p>
      <p className="text-2xl font-black tracking-[0.4em] text-green-700">{otp}</p>
      <p className="text-[10px] text-green-500 mt-1">Hết hạn sau 5 phút</p>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────── */
export default function BankAccountsManager() {
  const [items, setItems]         = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [banks, setBanks]         = useState([]);   // VietQR list
  const [banksLoading, setBanksLoading] = useState(false);

  // Add-form modal
  const [addOpen, setAddOpen]     = useState(false);
  const [form, setForm]           = useState({ bank_code: "", account_number: "", owner_name: "" });
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState("");

  // OTP modal
  const [otpItem, setOtpItem]     = useState(null);   // the bank account being verified
  const [otpOpen, setOtpOpen]     = useState(false);
  const [otpCode, setOtpCode]     = useState("");
  const [otpSent, setOtpSent]     = useState("");      // the mock OTP from server
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpErr, setOtpErr]       = useState("");

  // Delete confirm modal
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  // Flash message
  const [flash, setFlash]         = useState({ type: "", text: "" });
  const flashTimer = useRef(null);

  const showFlash = useCallback((type, text) => {
    setFlash({ type, text });
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash({ type: "", text: "" }), 3500);
  }, []);

  /* ── Load bank accounts ── */
  const load = useCallback(async () => {
    try {
      setLoadingList(true);
      const { items: list } = await bankService.list();
      setItems(list || []);
    } catch { setItems([]); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Load VietQR bank list ── */
  useEffect(() => {
    setBanksLoading(true);
    fetchVietQRBanks()
      .then(setBanks)
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, []);

  /* ── Derived: selected bank meta ── */
  const selectedBank = banks.find((b) => b.code === form.bank_code) || null;

  /* ── Form helpers ── */
  const setField = (key, val) => {
    setForm((s) => ({ ...s, [key]: val }));
    setErrors((s) => ({ ...s, [key]: undefined }));
    setSubmitErr("");
  };

  const resetAdd = () => {
    setForm({ bank_code: "", account_number: "", owner_name: "" });
    setErrors({});
    setSubmitErr("");
  };

  /* ── Submit add form ── */
  const onSubmit = async () => {
    const e = validateForm(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true); setSubmitErr("");
    try {
      const bank = selectedBank;
      await bankService.create({
        bank_code: form.bank_code,
        bank_name: bank?.name || form.bank_code,
        account_number: form.account_number.trim(),
        owner_name: form.owner_name.trim().toUpperCase(),
        logo_url: bank?.logo || "",
      });
      await load();
      showFlash("ok", "Đã thêm tài khoản ngân hàng");
      setAddOpen(false);
      resetAdd();
    } catch (err) {
      setSubmitErr(err?.response?.data?.message || err.message || "Có lỗi xảy ra");
    } finally { setSubmitting(false); }
  };

  /* ── Set default ── */
  const onSetDefault = async (id) => {
    try {
      await bankService.setDefault(id);
      await load();
      showFlash("ok", "Đã đặt tài khoản mặc định");
    } catch { showFlash("err", "Không thể cập nhật"); }
  };

  /* ── Send OTP ── */
  const onSendOtp = async (item) => {
    setOtpItem(item); setOtpCode(""); setOtpSent(""); setOtpErr(""); setOtpOpen(true);
    setOtpLoading(true);
    try {
      const { otp } = await bankService.sendOtp(item._id);
      setOtpSent(otp); // mock: show OTP in UI
    } catch (err) {
      setOtpErr(err?.response?.data?.message || "Không gửi được OTP");
    } finally { setOtpLoading(false); }
  };

  const onResendOtp = async () => {
    if (!otpItem) return;
    setOtpCode(""); setOtpErr(""); setOtpLoading(true);
    try {
      const { otp } = await bankService.sendOtp(otpItem._id);
      setOtpSent(otp);
    } catch (err) {
      setOtpErr(err?.response?.data?.message || "Không gửi được OTP");
    } finally { setOtpLoading(false); }
  };

  const onVerifyOtp = async () => {
    if (!otpCode.trim()) { setOtpErr("Vui lòng nhập mã OTP"); return; }
    setOtpVerifying(true); setOtpErr("");
    try {
      await bankService.verifyOtp(otpItem._id, otpCode.trim());
      await load();
      showFlash("ok", "Xác minh tài khoản thành công!");
      setOtpOpen(false);
    } catch (err) {
      setOtpErr(err?.response?.data?.message || "Mã OTP không đúng");
    } finally { setOtpVerifying(false); }
  };

  /* ── Delete ── */
  const onDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await bankService.remove(deleteItem._id);
      await load();
      showFlash("ok", "Đã xóa tài khoản ngân hàng");
      setDeleteOpen(false);
    } catch { showFlash("err", "Không thể xóa"); }
    finally { setDeleting(false); setDeleteItem(null); }
  };

  /* ── Render ── */
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-blue-400 font-semibold">
          {items.length} tài khoản đã liên kết
        </p>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { resetAdd(); setAddOpen(true); }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-black text-white shadow-md"
          style={{ background: "linear-gradient(135deg, #1E40AF, #2563EB)", boxShadow: "0 4px 14px rgba(29,78,216,0.3)" }}
        >
          <Plus size={15} /> Thêm ngân hàng
        </motion.button>
      </div>

      {/* Flash message */}
      <AnimatePresence>
        {flash.text && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl mb-4 ${
              flash.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {flash.type === "ok" ? <Check size={15} /> : <AlertCircle size={15} />}
            {flash.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund notice */}
      {items.some((it) => it.is_default) && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-4"
          style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
        >
          <CreditCard size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 font-semibold leading-relaxed">
            Hoàn tiền sẽ được chuyển vào tài khoản mặc định của bạn.
          </p>
        </motion.div>
      )}

      {/* Skeleton / Empty / List */}
      {loadingList ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <BankCardSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-14 rounded-2xl"
          style={{ background: "#F8FAFF", border: "2px dashed #BFDBFE" }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center mb-3 border border-blue-100"
          >
            <Building2 size={28} className="text-blue-300" />
          </motion.div>
          <p className="text-sm font-bold text-blue-400">Chưa có tài khoản nào</p>
          <p className="text-xs text-blue-300 mt-1">Thêm tài khoản ngân hàng để nhận hoàn tiền</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((it, idx) => (
              <motion.div
                key={it._id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.22 }}
                whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(29,78,216,0.10)" }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-default"
                style={it.is_default
                  ? { background: "#EFF6FF", borderColor: "#93C5FD", boxShadow: "0 2px 12px rgba(29,78,216,0.10)" }
                  : { background: "#FAFBFF", borderColor: "#E0EAFF" }
                }
              >
                {/* Logo */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white border border-blue-100 shadow-sm overflow-hidden">
                  {it.logo_url
                    ? <img src={it.logo_url} alt={it.bank_name} className="w-10 h-10 object-contain" />
                    : <span className="text-xl font-black text-blue-600">{(it.bank_name || "?").charAt(0)}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-black text-sm text-gray-800">{it.bank_name}</span>
                    {it.is_default && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "#DBEAFE", color: "#1D4ED8", border: "1px solid #93C5FD" }}>
                        <Star size={9} className="fill-blue-600" /> MẶC ĐỊNH
                      </span>
                    )}
                    {it.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC" }}>
                        <ShieldCheck size={9} /> Đã xác minh
                      </span>
                    ) : (
                      <button
                        onClick={() => onSendOtp(it)}
                        className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                        style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                      >
                        <Shield size={9} /> Chưa xác minh · Xác minh ngay
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-mono font-bold text-blue-500">{maskAcc(it.account_number)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{it.owner_name}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!it.is_default && (
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => onSetDefault(it._id)}
                      className="h-8 px-3 rounded-xl text-xs font-bold border-2 transition-all"
                      style={{ borderColor: "#BFDBFE", color: "#2563EB", background: "#EFF6FF" }}
                    >
                      Mặc định
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                    onClick={() => { setDeleteItem(it); setDeleteOpen(true); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2"
                    style={{ borderColor: "#FECACA", background: "#FFF1F2", color: "#EF4444" }}
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ══ ADD BANK MODAL ══ */}
      <Modal isOpen={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAdd(); }}
        radius="2xl" size="lg" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #1E40AF, #2563EB)" }}>
                    <CreditCard size={17} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 leading-tight">Thêm ngân hàng liên kết</p>
                    <p className="text-xs text-gray-400 font-normal">Điền thông tin tài khoản của bạn</p>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="gap-4">
                {/* Bank selector */}
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5">Ngân hàng *</p>
                  {banksLoading ? (
                    <Skeleton className="h-12 rounded-xl" />
                  ) : (
                    <Select
                      placeholder="Chọn ngân hàng..."
                      selectedKeys={form.bank_code ? new Set([form.bank_code]) : new Set()}
                      onSelectionChange={(keys) => setField("bank_code", Array.from(keys)[0] || "")}
                      variant="bordered"
                      radius="lg"
                      isInvalid={!!errors.bank_code}
                      errorMessage={errors.bank_code}
                      classNames={{ trigger: "h-12", value: "font-semibold" }}
                      renderValue={(items) => {
                        const bk = banks.find((b) => b.code === form.bank_code);
                        if (!bk) return null;
                        return (
                          <div className="flex items-center gap-2">
                            {bk.logo && <img src={bk.logo} alt={bk.shortName} className="w-6 h-6 object-contain rounded" />}
                            <span>{bk.shortName} — {bk.name}</span>
                          </div>
                        );
                      }}
                    >
                      {banks.map((b) => (
                        <SelectItem key={b.code} value={b.code}
                          startContent={b.logo ? <img src={b.logo} alt={b.shortName} className="w-6 h-6 object-contain rounded" /> : <Building2 size={16} />}
                          description={b.name}
                        >
                          {b.shortName}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </div>

                {/* Selected bank logo preview */}
                {selectedBank && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
                  >
                    {selectedBank.logo && (
                      <img src={selectedBank.logo} alt={selectedBank.shortName} className="w-10 h-10 object-contain rounded-xl bg-white p-1 border border-blue-100" />
                    )}
                    <div>
                      <p className="font-black text-sm text-blue-900">{selectedBank.shortName}</p>
                      <p className="text-xs text-blue-500">{selectedBank.name}</p>
                    </div>
                  </motion.div>
                )}

                {/* Account number */}
                <Input
                  label="Số tài khoản *"
                  placeholder="VD: 1234567890"
                  value={form.account_number}
                  onValueChange={(v) => setField("account_number", v.replace(/\D/g, ""))}
                  variant="bordered"
                  radius="lg"
                  isInvalid={!!errors.account_number}
                  errorMessage={errors.account_number}
                  description="Chỉ nhập chữ số, từ 6 đến 20 ký tự"
                  maxLength={20}
                />

                {/* Owner name */}
                <Input
                  label="Họ tên chủ tài khoản *"
                  placeholder="VD: NGUYEN VAN A"
                  value={form.owner_name}
                  onValueChange={(v) => setField("owner_name", v.toUpperCase())}
                  variant="bordered"
                  radius="lg"
                  isInvalid={!!errors.owner_name}
                  errorMessage={errors.owner_name}
                  description="Nhập đúng tên như trên thẻ ngân hàng"
                />

                {submitErr && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200"
                  >
                    <AlertCircle size={14} /> {submitErr}
                  </motion.div>
                )}
              </ModalBody>

              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Huỷ</Button>
                <Button
                  color="primary" radius="lg" className="font-bold"
                  onPress={onSubmit}
                  isDisabled={submitting}
                  isLoading={submitting}
                  startContent={!submitting && <Plus size={15} />}
                >
                  Thêm tài khoản
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ══ OTP VERIFY MODAL ══ */}
      <Modal isOpen={otpOpen} onOpenChange={(open) => { setOtpOpen(open); if (!open) { setOtpCode(""); setOtpErr(""); setOtpSent(""); } }}
        radius="2xl" size="sm" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #059669, #10B981)" }}>
                    <KeyRound size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 leading-tight">Xác minh OTP</p>
                    <p className="text-xs text-gray-400 font-normal">
                      {otpItem ? maskAcc(otpItem.account_number) : ""}
                    </p>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="gap-3">
                {otpLoading ? (
                  <div className="flex flex-col items-center py-4 gap-2">
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Đang gửi OTP…</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Nhập mã OTP 6 số để xác minh quyền sở hữu tài khoản ngân hàng.
                    </p>
                    <OtpDots otp={otpSent} />
                    <Input
                      label="Mã OTP"
                      placeholder="Nhập 6 chữ số"
                      value={otpCode}
                      onValueChange={(v) => { setOtpCode(v.replace(/\D/g, "").slice(0, 6)); setOtpErr(""); }}
                      variant="bordered"
                      radius="lg"
                      maxLength={6}
                      isInvalid={!!otpErr}
                      errorMessage={otpErr}
                      classNames={{ input: "text-center text-xl font-black tracking-widest" }}
                    />
                    <button
                      onClick={onResendOtp}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors mx-auto"
                    >
                      <RefreshCw size={12} /> Gửi lại OTP
                    </button>
                  </>
                )}
              </ModalBody>

              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Huỷ</Button>
                <Button
                  radius="lg" className="font-bold"
                  style={{ background: "linear-gradient(135deg, #059669, #10B981)", color: "#fff" }}
                  onPress={onVerifyOtp}
                  isDisabled={otpLoading || otpVerifying || otpCode.length !== 6}
                  isLoading={otpVerifying}
                  startContent={!otpVerifying && <ShieldCheck size={15} />}
                >
                  Xác minh
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ══ DELETE CONFIRM MODAL ══ */}
      <Modal isOpen={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteItem(null); }}
        radius="2xl" size="sm" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-red-100">
                    <Trash2 size={16} className="text-red-500" />
                  </div>
                  <p className="font-black text-gray-900">Xoá tài khoản ngân hàng?</p>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-600">
                  Bạn có chắc muốn xoá{" "}
                  <b>{deleteItem?.bank_name}</b>{" "}
                  <span className="font-mono text-blue-500">{maskAcc(deleteItem?.account_number)}</span>?
                  Hành động này không thể hoàn tác.
                </p>
                {deleteItem?.is_default && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl mt-1"
                    style={{ background: "#FEF3C7", border: "1.5px solid #FDE68A" }}>
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 font-semibold">
                      Đây là tài khoản mặc định. Tài khoản tiếp theo sẽ được tự động đặt làm mặc định.
                    </p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Huỷ</Button>
                <Button color="danger" radius="lg" className="font-bold" onPress={onDelete}
                  isLoading={deleting} isDisabled={deleting}>
                  Xoá
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
