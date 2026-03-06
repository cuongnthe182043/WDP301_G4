import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bankService } from "../services/bankService";
import { Plus, Trash2, Star, Check, AlertCircle, X, CreditCard, Building2 } from "lucide-react";

const inputCls = (hasError) =>
  `w-full h-10 px-3.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none border-2
  ${hasError
    ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100"
    : "border-blue-100 bg-blue-50/50 text-gray-800 placeholder-blue-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
  }`;

const BANK_COLORS = ["#1D4ED8", "#0891B2", "#7C3AED", "#059669", "#DC2626", "#D97706"];

function BankLogo({ bank }) {
  const color = BANK_COLORS[bank.bank_name?.charCodeAt(0) % BANK_COLORS.length] || "#1D4ED8";
  return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg shadow-md"
      style={{
        background: bank.logo_url
          ? "transparent"
          : `linear-gradient(135deg, ${color}, ${color}cc)`,
      }}
    >
      {bank.logo_url ? (
        <img src={bank.logo_url} alt={bank.bank_name} className="w-10 h-10 object-contain rounded-xl" />
      ) : (
        (bank.bank_name || "?").charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function BankAccountsManager() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    bank_name: "", account_number: "", owner_name: "", branch: "", logo_url: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { items } = await bankService.list();
    setItems(items || []);
  };
  useEffect(() => { load(); }, []);

  const maskAcc = (acc = "") => acc ? `•••• •••• ${acc.slice(-4)}` : "";

  const validate = (p) => {
    const e = {};
    if (!p.bank_name?.trim()) e.bank_name = "Vui lòng nhập tên ngân hàng";
    if (!p.account_number?.trim()) e.account_number = "Vui lòng nhập số tài khoản";
    if (!p.owner_name?.trim()) e.owner_name = "Vui lòng nhập tên chủ tài khoản";
    if (!p.branch?.trim()) e.branch = "Vui lòng nhập chi nhánh";
    return e;
  };

  const onChange = (k, v) => {
    setForm(s => ({ ...s, [k]: v }));
    if (errors[k]) setErrors(s => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      await bankService.create(form);
      setMsg({ type: "ok", text: "Đã thêm tài khoản ngân hàng" });
      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
      setForm({ bank_name: "", account_number: "", owner_name: "", branch: "", logo_url: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg({ type: "err", text: err.message || "Có lỗi xảy ra" });
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    if (confirm("Xóa tài khoản này?")) { await bankService.remove(id); load(); }
  };

  const onSetDefault = async (id) => {
    if (typeof bankService.setDefault !== "function") return alert("Chưa có API setDefault.");
    await bankService.setDefault(id);
    await load();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-blue-400 font-semibold mt-0.5">
            {items.length} tài khoản đã liên kết
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-black text-white shadow-md"
          style={{ background: "linear-gradient(135deg, #1E40AF, #2563EB)", boxShadow: "0 4px 14px rgba(29,78,216,0.3)" }}
        >
          <Plus size={15} />
          Thêm ngân hàng
        </motion.button>
      </div>

      {/* Success / error flash */}
      <AnimatePresence>
        {msg.text && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl mb-4 ${
              msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {msg.type === "ok" ? <Check size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!items.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 rounded-2xl"
          style={{ background: "#F8FAFF", border: "2px dashed #BFDBFE" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 border border-blue-100">
            <Building2 size={24} className="text-blue-300" />
          </div>
          <p className="text-sm font-bold text-blue-400">Chưa có tài khoản nào</p>
          <p className="text-xs text-blue-300 mt-1">Thêm tài khoản ngân hàng để nhận hoàn tiền</p>
        </motion.div>
      )}

      {/* Bank list */}
      <div className="space-y-3">
        {items.map((it, idx) => (
          <motion.div
            key={it._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200"
            style={it.is_default
              ? { background: "#EFF6FF", borderColor: "#93C5FD", boxShadow: "0 2px 12px rgba(29,78,216,0.1)" }
              : { background: "#FAFBFF", borderColor: "#E0EAFF" }
            }
          >
            <BankLogo bank={it} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm text-gray-800">{it.bank_name}</span>
                {it.is_default && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: "#DBEAFE", color: "#1D4ED8", border: "1px solid #93C5FD" }}>
                    <Star size={9} className="fill-blue-600" /> MẶC ĐỊNH
                  </span>
                )}
                {it.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC" }}>
                    <Check size={9} /> Đã xác minh
                  </span>
                )}
              </div>
              <p className="text-sm font-mono font-bold text-blue-500 mt-0.5">{maskAcc(it.account_number)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {it.owner_name}{it.branch ? ` · ${it.branch}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!it.is_default && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSetDefault(it._id)}
                  className="h-8 px-3 rounded-xl text-xs font-bold transition-all border-2"
                  style={{ borderColor: "#BFDBFE", color: "#2563EB", background: "#EFF6FF" }}
                >
                  Mặc định
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.08, background: "#FEE2E2" }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onDelete(it._id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2"
                style={{ borderColor: "#FECACA", background: "#FFF1F2", color: "#EF4444" }}
              >
                <Trash2 size={14} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Add modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 24px 64px rgba(29,78,216,0.2)" }}
            >
              {/* Modal header */}
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, #1E40AF, #2563EB)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <CreditCard size={16} className="text-white" />
                  </div>
                  <h3 className="text-white font-black text-base">Thêm ngân hàng liên kết</h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, background: "rgba(255,255,255,0.25)" }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 transition-all"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* Modal body */}
              <form onSubmit={onSubmit} className="p-6 space-y-4">
                {[
                  { key: "bank_name",      label: "Tên ngân hàng",         placeholder: "Vietcombank, Techcombank…" },
                  { key: "account_number", label: "Số tài khoản",          placeholder: "1234 5678 9012 3456" },
                  { key: "owner_name",     label: "Họ tên chủ tài khoản",  placeholder: "NGUYEN VAN A" },
                  { key: "branch",         label: "Chi nhánh",             placeholder: "Chi nhánh Hà Nội" },
                  { key: "logo_url",       label: "Logo URL (tuỳ chọn)",   placeholder: "https://…" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1.5">{label}</span>
                    <input
                      className={inputCls(!!errors[key])}
                      value={form[key]}
                      onChange={e => onChange(key, e.target.value)}
                      placeholder={placeholder}
                      autoFocus={key === "bank_name"}
                    />
                    <AnimatePresence>
                      {errors[key] && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"
                        >
                          <AlertCircle size={11} /> {errors[key]}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={!submitting ? { scale: 1.02, y: -1 } : {}}
                    whileTap={!submitting ? { scale: 0.98 } : {}}
                    className="flex-1 h-10 rounded-xl text-sm font-black text-white disabled:opacity-60 transition-all"
                    style={{ background: "linear-gradient(135deg, #1E40AF, #2563EB)", boxShadow: "0 4px 14px rgba(29,78,216,0.3)" }}
                  >
                    {submitting ? "Đang thêm…" : "Thêm tài khoản"}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowForm(false); setErrors({}); }}
                    className="h-10 px-5 rounded-xl text-sm font-bold border-2 transition-all"
                    style={{ borderColor: "#BFDBFE", color: "#3B82F6", background: "#EFF6FF" }}
                  >
                    Huỷ
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}