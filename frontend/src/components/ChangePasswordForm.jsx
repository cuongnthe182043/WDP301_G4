import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { userService } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Lock, Check, AlertCircle, ShieldCheck } from "lucide-react";

const inputWrapCls = (hasError) =>
  `flex items-center gap-2.5 h-11 px-3.5 rounded-xl border-2 transition-all duration-200
  ${hasError
    ? "border-red-300 bg-red-50 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100"
    : "border-blue-100 bg-blue-50/50 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100"
  }`;

const STRENGTH_CONFIG = [
  { label: "Quá yếu",   color: "#EF4444", bg: "#FEE2E2", width: "33%" },
  { label: "Trung bình", color: "#F59E0B", bg: "#FEF3C7", width: "66%" },
  { label: "Mạnh",      color: "#10B981", bg: "#D1FAE5", width: "100%" },
];

function PasswordField({ label, value, onChange, show, onToggleShow, error, autoComplete, hint }) {
  return (
    <div>
      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
        <Lock size={11} className="text-blue-400" />
        {label}
      </span>
      <div className={inputWrapCls(!!error)}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-800 placeholder-blue-200"
          placeholder="••••••••"
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onToggleShow}
          className="flex-shrink-0 transition-colors"
          style={{ color: show ? "#2563EB" : "#93C5FD" }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </motion.button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1"
          >
            <AlertCircle size={11} /> {error}
          </motion.p>
        )}
        {hint && !error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-blue-300 mt-1.5"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChangePasswordForm() {
  const { logout } = useAuth();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const onChange = (k, v) => {
    setForm(s => ({ ...s, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
    if (msg.text) setMsg({ type: "", text: "" });
  };

  const strength = useMemo(() => {
    const pw = form.new_password || "";
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0-3
  }, [form.new_password]);

  const validate = (p) => {
    const e = {};
    if (!p.current_password?.trim()) e.current_password = "Vui lòng nhập mật khẩu hiện tại";
    if (!p.new_password?.trim()) e.new_password = "Vui lòng nhập mật khẩu mới";
    else if (p.new_password.length < 8) e.new_password = "Mật khẩu mới tối thiểu 8 ký tự";
    if (!p.confirm?.trim()) e.confirm = "Vui lòng xác nhận lại mật khẩu";
    else if (p.new_password && p.confirm && p.new_password !== p.confirm) e.confirm = "Mật khẩu xác nhận không khớp";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const eobj = validate(form);
    setErrors(eobj);
    if (Object.keys(eobj).length) return;
    setSaving(true);
    try {
      await userService.changePassword({ current_password: form.current_password, new_password: form.new_password });
      setMsg({ type: "ok", text: "Đổi mật khẩu thành công! Đang đăng xuất…" });
      setForm({ current_password: "", new_password: "", confirm: "" });
      // Force logout so the old token is cleared and the user re-authenticates
      // with the new password. Delay gives the success message time to show.
      setTimeout(() => logout(), 1500);
    } catch (err) {
      setMsg({ type: "err", text: err?.message || "Đổi mật khẩu thất bại" });
    } finally {
      setSaving(false);
    }
  };

  const sConfig = form.new_password.length > 0 ? STRENGTH_CONFIG[Math.max(0, strength - 1)] : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">

      {/* Info banner */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-2xl"
        style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
      >
        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ShieldCheck size={16} className="text-blue-600" />
        </div>
        <p className="text-sm text-blue-700 font-medium leading-relaxed">
          Để bảo mật tài khoản, vui lòng <strong>không chia sẻ mật khẩu</strong> cho người khác.
          Mật khẩu mạnh nên có ít nhất 8 ký tự, gồm chữ hoa, thường và số.
        </p>
      </div>

      {/* Current password */}
      <PasswordField
        label="Mật khẩu hiện tại"
        value={form.current_password}
        onChange={e => onChange("current_password", e.target.value)}
        show={show.current}
        onToggleShow={() => setShow(s => ({ ...s, current: !s.current }))}
        error={errors.current_password}
        autoComplete="current-password"
      />

      {/* New password */}
      <div>
        <PasswordField
          label="Mật khẩu mới"
          value={form.new_password}
          onChange={e => onChange("new_password", e.target.value)}
          show={show.next}
          onToggleShow={() => setShow(s => ({ ...s, next: !s.next }))}
          error={errors.new_password}
          autoComplete="new-password"
        />

        {/* Strength bar */}
        <AnimatePresence>
          {form.new_password.length > 0 && sConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5"
            >
              {/* Track */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: sConfig.width }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: sConfig.color }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-bold" style={{ color: sConfig.color }}>
                  {sConfig.label}
                </span>
                <span className="text-[10px] text-blue-300">{form.new_password.length} ký tự</span>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {[
                  { pass: form.new_password.length >= 8, label: "Ít nhất 8 ký tự" },
                  { pass: /[A-Z]/.test(form.new_password), label: "Có chữ hoa (A–Z)" },
                  { pass: /[a-z]/.test(form.new_password), label: "Có chữ thường (a–z)" },
                  { pass: /[\d^A-Za-z]/.test(form.new_password), label: "Có số hoặc ký tự đặc biệt" },
                ].map(({ pass, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                      style={{ background: pass ? "#D1FAE5" : "#F1F5F9" }}
                    >
                      <Check size={9} style={{ color: pass ? "#059669" : "#CBD5E1" }} />
                    </div>
                    <span className="text-[11px]" style={{ color: pass ? "#059669" : "#94A3B8" }}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm password */}
      <PasswordField
        label="Nhập lại mật khẩu"
        value={form.confirm}
        onChange={e => onChange("confirm", e.target.value)}
        show={show.confirm}
        onToggleShow={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
        error={errors.confirm}
        autoComplete="new-password"
      />

      {/* Actions */}
      <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1.5px solid #EFF6FF" }}>
        <motion.button
          type="submit"
          disabled={saving}
          whileHover={!saving ? { scale: 1.02, y: -1 } : {}}
          whileTap={!saving ? { scale: 0.98 } : {}}
          className="h-10 px-7 rounded-xl text-sm font-black text-white disabled:opacity-60 transition-all"
          style={{
            background: saving ? "#93C5FD" : "linear-gradient(135deg, #1E40AF, #2563EB)",
            boxShadow: saving ? "none" : "0 4px 14px rgba(29,78,216,0.35)",
          }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full inline-block"
              />
              Đang đổi…
            </span>
          ) : "Đổi mật khẩu"}
        </motion.button>

        <AnimatePresence>
          {msg.text && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-1.5 text-sm font-bold ${msg.type === "ok" ? "text-green-600" : "text-red-500"}`}
            >
              {msg.type === "ok"
                ? <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center"><Check size={12} className="text-green-600" /></div>
                : <AlertCircle size={14} />
              }
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}