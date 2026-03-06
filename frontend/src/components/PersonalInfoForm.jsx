import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { userService } from "../services/userService";
import { Camera, Check, AlertCircle, User, Mail, Phone, Calendar, Ruler, Weight, Shirt } from "lucide-react";

/* ── Reusable styled input ── */
function Field({ label, icon: Icon, error, hint, children, full = false }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block mb-1.5">
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
          {Icon && <Icon size={12} className="text-blue-400" />}
          {label}
        </span>
        {children}
      </label>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"
          >
            <AlertCircle size={11} /> {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className="text-xs text-blue-300 mt-1">{hint}</p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls = (hasError) =>
  `w-full h-10 px-3.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none
  ${hasError
    ? "border-2 border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100"
    : "border-2 border-blue-100 bg-blue-50/50 text-gray-800 placeholder-blue-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
  }`;

const disabledInputCls =
  "w-full h-10 px-3.5 rounded-xl text-sm font-medium border-2 border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed";

/* ── Section divider ── */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #BFDBFE, transparent)" }} />
      <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">{children}</span>
      <div className="h-px flex-1" style={{ background: "linear-gradient(270deg, #BFDBFE, transparent)" }} />
    </div>
  );
}

export default function PersonalInfoForm({ me, onUpdated }) {
  const [form, setForm] = useState({
    name: me?.name || "",
    email: me?.email || "",
    phone: me?.phone || "",
    gender: me?.gender || "other",
    dob: me?.dob ? me.dob.slice(0, 10) : "",
    avatar_url: me?.avatar_url || "",
    preferences: {
      height: me?.preferences?.height || "",
      weight: me?.preferences?.weight || "",
      size_top: me?.preferences?.size_top || "",
      size_bottom: me?.preferences?.size_bottom || "",
    },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [previewUrl, setPreviewUrl] = useState(me?.avatar_url || "");
  const [avatarHover, setAvatarHover] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setPreviewUrl(form.avatar_url || ""); }, [form.avatar_url]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const setPref  = (k, v) => setForm(prev => ({ ...prev, preferences: { ...prev.preferences, [k]: v } }));

  const onPickFile = (e) => {
    setErr("");
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/image\/(jpeg|png)/i.test(f.type)) return setErr("Chỉ hỗ trợ ảnh .JPG, .PNG");
    if (f.size > 1024 * 1024) return setErr("Dung lượng tối đa 1 MB");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setField("avatar_url", dataUrl);
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false); setErr("");
    try {
      const payload = { ...form };
      if (!payload.dob) delete payload.dob;
      const { user } = await userService.update(payload);
      onUpdated?.(user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e?.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const initial = (me?.name || me?.email || "U").charAt(0).toUpperCase();

  return (
    <form onSubmit={onSubmit} className="space-y-0">

      {/* ── Avatar + Basic info layout ── */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <motion.div
            className="relative cursor-pointer"
            onHoverStart={() => setAvatarHover(true)}
            onHoverEnd={() => setAvatarHover(false)}
            whileTap={{ scale: 0.97 }}
            onClick={() => fileRef.current?.click()}
          >
            {/* Animated ring */}
            <motion.div
              animate={avatarHover ? { scale: 1.08, opacity: 1 } : { scale: 1, opacity: 0.5 }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                margin: -4,
                background: "linear-gradient(135deg, #2563EB, #6366F1)",
                borderRadius: "50%",
              }}
            />
            <div
              className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 z-10"
              style={{ boxShadow: "0 0 0 3px #fff, 0 4px 16px rgba(29,78,216,0.25)" }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-black text-3xl"
                  style={{ background: "linear-gradient(135deg, #1D4ED8, #4F46E5)" }}
                >
                  {initial}
                </div>
              )}
              {/* Hover overlay */}
              <AnimatePresence>
                {avatarHover && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{ background: "rgba(29,78,216,0.75)" }}
                  >
                    <Camera size={18} className="text-white" />
                    <span className="text-white text-[10px] font-bold">Đổi ảnh</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={onPickFile} />

          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => fileRef.current?.click()}
            className="text-xs font-bold px-4 py-1.5 rounded-full transition-all"
            style={{
              background: "#EFF6FF",
              border: "1.5px solid #BFDBFE",
              color: "#2563EB",
            }}
          >
            Chọn ảnh
          </motion.button>
          <p className="text-[10px] text-blue-300 text-center leading-relaxed">
            JPG, PNG · Tối đa 1MB
          </p>
        </div>

        {/* Right: form fields */}
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-4 min-w-0">
          <Field label="Tên đăng nhập" icon={User} hint="Chỉ thay đổi được 1 lần">
            <input className={disabledInputCls} value={me?.username || ""} disabled />
          </Field>

          <Field label="Họ và tên" icon={User}>
            <input
              className={inputCls(false)}
              value={form.name}
              onChange={e => setField("name", e.target.value)}
              placeholder="Nhập họ và tên…"
              required
            />
          </Field>

          <Field label="Email" icon={Mail}>
            <input
              className={inputCls(false)}
              type="email"
              value={form.email}
              onChange={e => setField("email", e.target.value)}
              placeholder="email@example.com"
              required
            />
          </Field>

          <Field label="Số điện thoại" icon={Phone}>
            <input
              className={inputCls(false)}
              value={form.phone || ""}
              onChange={e => setField("phone", e.target.value)}
              placeholder="0912 345 678"
            />
          </Field>

          <Field label="Ngày sinh" icon={Calendar}>
            <input
              className={inputCls(false)}
              type="date"
              value={form.dob}
              onChange={e => setField("dob", e.target.value)}
            />
          </Field>

          <Field label="Giới tính" full={false}>
            <div className="flex gap-2 mt-1">
              {[
                { v: "male",   label: "Nam" },
                { v: "female", label: "Nữ" },
                { v: "other",  label: "Khác" },
              ].map(({ v, label }) => (
                <motion.button
                  key={v}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setField("gender", v)}
                  className="flex-1 h-10 rounded-xl text-sm font-bold transition-all duration-200 border-2"
                  style={form.gender === v ? {
                    background: "linear-gradient(135deg, #1D4ED8, #2563EB)",
                    borderColor: "#1D4ED8",
                    color: "#ffffff",
                    boxShadow: "0 3px 10px rgba(29,78,216,0.3)",
                  } : {
                    background: "#EFF6FF",
                    borderColor: "#BFDBFE",
                    color: "#3B82F6",
                  }}
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      {/* ── Body measurements ── */}
      <SectionLabel>Số đo gợi ý size</SectionLabel>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: "height",      label: "Chiều cao",  icon: Ruler,  placeholder: "175", unit: "cm" },
          { key: "weight",      label: "Cân nặng",   icon: Weight, placeholder: "65",  unit: "kg" },
          { key: "size_top",    label: "Size áo",    icon: Shirt,  placeholder: "M" },
          { key: "size_bottom", label: "Size quần",  icon: Shirt,  placeholder: "32" },
        ].map(({ key, label, icon: Icon, placeholder, unit }) => (
          <div key={key}>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Icon size={12} className="text-blue-400" />
              {label}
            </span>
            <div className="relative">
              <input
                type={key === "height" || key === "weight" ? "number" : "text"}
                className={inputCls(false) + " pr-10"}
                value={form.preferences[key]}
                onChange={e => setPref(key, key === "height" || key === "weight" ? Number(e.target.value) : e.target.value)}
                placeholder={placeholder}
              />
              {unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-300 pointer-events-none">
                  {unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 mt-7 pt-5" style={{ borderTop: "1.5px solid #EFF6FF" }}>
        <motion.button
          type="submit"
          disabled={saving}
          whileHover={!saving ? { scale: 1.02, y: -1 } : {}}
          whileTap={!saving ? { scale: 0.98 } : {}}
          className="h-10 px-7 rounded-xl text-sm font-black text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
              Đang lưu…
            </span>
          ) : "Lưu thay đổi"}
        </motion.button>

        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="flex items-center gap-1.5 text-sm font-bold text-green-600"
            >
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={12} className="text-green-600" />
              </div>
              Đã lưu!
            </motion.div>
          )}
          {err && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-sm font-bold text-red-500"
            >
              <AlertCircle size={14} />
              {err}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}