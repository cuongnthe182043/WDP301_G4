import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";
import { Input, Button } from "@heroui/react";
import { Eye, EyeOff, Lock, ShieldCheck, CheckCircle2, ChevronLeft } from "lucide-react";
import { authService } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";

const Dot = ({ style }) => (
  <div className="absolute rounded-full" style={{ opacity: 0.18, ...style }} />
);

const getPasswordStrength = (pwd) => {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)          s++;
  if (pwd.length >= 12)         s++;
  if (/[A-Z]/.test(pwd))        s++;
  if (/[0-9]/.test(pwd))        s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
};
const strengthColor = (s) => ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"][s] || "#e4e4e7";

export default function ChangePassword() {
  const { t } = useTranslation();
  const [form, setForm]       = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [message, setMessage] = useState({ text: "", error: true });
  const [done, setDone]       = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const strengthLabel = (s) => [
    "", t("auth.pwd_strength_very_weak"), t("auth.pwd_strength_weak"),
    t("auth.pwd_strength_medium"), t("auth.pwd_strength_strong"), t("auth.pwd_strength_very_strong")
  ][s] || "";

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleBlur   = (f) => setTouched(prev => ({ ...prev, [f]: true }));
  const showMsg = (text, error = true) => setMessage({ text, error });

  const oldErr = touched.oldPassword && !form.oldPassword ? t("auth.old_password_required") : null;
  const newErr = touched.newPassword
    ? (!form.newPassword ? t("auth.new_password_required")
      : form.newPassword.length < 8 ? t("auth.err_min_length", { count: 8 })
      : !/[A-Z]/.test(form.newPassword) ? t("auth.pwd_require_uppercase")
      : !/[0-9]/.test(form.newPassword) ? t("auth.pwd_require_number")
      : null)
    : null;
  const cfmErr = touched.confirmPassword
    ? (!form.confirmPassword ? t("auth.confirm_password_required")
      : form.newPassword !== form.confirmPassword ? t("auth.err_password_match") : null)
    : null;

  const formValid = form.oldPassword && form.newPassword.length >= 8
    && /[A-Z]/.test(form.newPassword) && /[0-9]/.test(form.newPassword)
    && form.newPassword === form.confirmPassword;

  const pwdStrength = getPasswordStrength(form.newPassword);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setTouched({ oldPassword: true, newPassword: true, confirmPassword: true });
    if (!formValid) return;
    try {
      setLoading(true);
      await authService.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setDone(true);
      showMsg(t("auth.change_done"), false);

      try {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.disableAutoSelect();
        }
      } catch {}
    } catch (err) {
      showMsg(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const tips = [
    t("auth.pwd_tip_min8"),
    t("auth.pwd_tip_uppercase"),
    t("auth.pwd_tip_no_reuse"),
    t("auth.pwd_tip_no_share"),
  ];

  return (
    <div className="min-h-dvh flex items-stretch">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden p-10"
        style={{ background: "linear-gradient(145deg, #0f1f5c 0%, #1E3A8A 45%, #1E40AF 80%, #1D4ED8 100%)" }}>
        <Dot style={{ width: 340, height: 340, background: "radial-gradient(circle, #3B82F6, transparent)", top: -100, left: -100 }} />
        <Dot style={{ width: 260, height: 260, background: "radial-gradient(circle, #60A5FA, transparent)", bottom: 20, right: -80 }} />
        <Dot style={{ width: 200, height: 200, background: "radial-gradient(circle, #93C5FD, transparent)", top: "42%", right: "18%" }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div className="relative z-10">
          <RouterLink to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-white/25 group-hover:ring-white/50 transition-all shadow-lg">
              <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
            </div>
            <span className="text-white font-black text-xl tracking-tight" style={{ fontFamily: "'Baloo 2', cursive" }}>
              Daily Fit
            </span>
          </RouterLink>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center gap-6 my-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: "rgba(96,165,250,.2)", color: "#BFDBFE", border: "1px solid rgba(96,165,250,.35)" }}>
              {t("auth.security_badge")}
            </div>
            <h2 className="text-white font-black text-[2.1rem] leading-tight tracking-tight"
              style={{ fontFamily: "'Baloo 2', cursive" }}>
              {t("auth.change_pwd_hero")}<br />
              <span style={{ background: "linear-gradient(90deg, #93C5FD, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {t("auth.change_pwd_hero2")}
              </span><br />
              {t("auth.change_pwd_hero3")}
            </h2>
            <p className="text-blue-200 text-sm mt-3 leading-relaxed max-w-[260px]" style={{ opacity: 0.8 }}>
              {t("auth.change_pwd_desc")}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-blue-100" style={{ opacity: 0.75 }}>
                <CheckCircle2 size={15} className="text-blue-300 flex-shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck size={14} className="text-blue-300" />
          <p className="text-blue-300 text-xs" style={{ opacity: 0.6 }}>{t("common.secure_ssl")}</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto" style={{ background: isDark ? "#181d2e" : "#f8faff" }}>
        <div className="w-full max-w-[420px] py-4">

          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow">
              <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
            </div>
            <span className="font-black text-lg text-default-900" style={{ fontFamily: "'Baloo 2', cursive" }}>Daily Fit</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-default-900 tracking-tight" style={{ fontFamily: "'Baloo 2', cursive" }}>
              {t("auth.change_password")}
            </h1>
            <p className="text-default-500 text-sm mt-1.5">{t("auth.change_pwd_subtitle")}</p>
          </div>

          {message.text && (
            <div className={`mb-5 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 ${
              message.error ? "bg-danger-50 text-danger border border-danger-200" : "bg-success-50 text-success border border-success-200"
            }`}>
              <span>{message.error ? "⚠" : "✓"}</span>
              {message.text}
            </div>
          )}

          {done ? (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: isDark ? "rgba(29,78,216,.25)" : "linear-gradient(135deg, #DBEAFE, #BFDBFE)" }}>
                <CheckCircle2 size={32} style={{ color: "#1D4ED8" }} />
              </div>
              <div>
                <p className="text-xl font-black text-default-900" style={{ fontFamily: "'Baloo 2', cursive" }}>
                  {t("auth.change_pwd_success")}
                </p>
                <p className="text-default-500 text-sm mt-1">{t("auth.change_pwd_new_saved")}</p>
                <p className="text-warning text-xs mt-2 px-4">
                  {t("auth.change_pwd_google_hint")}
                </p>
              </div>
              <RouterLink to="/profile"
                className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                style={{ color: "#1D4ED8" }}>
                <ChevronLeft size={15} />
                {t("common.back_to_profile")}
              </RouterLink>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input autoFocus label={t("auth.current_password")} name="oldPassword"
                type={showOld ? "text" : "password"}
                value={form.oldPassword} onChange={handleChange} onBlur={() => handleBlur("oldPassword")}
                variant="bordered" radius="lg"
                isInvalid={!!oldErr} errorMessage={oldErr}
                color={oldErr ? "danger" : touched.oldPassword && form.oldPassword ? "success" : "default"}
                startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                endContent={
                  <button type="button" onClick={() => setShowOld(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                    {showOld ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />

              <div className="flex flex-col gap-1.5">
                <Input label={t("auth.new_password")} name="newPassword"
                  type={showNew ? "text" : "password"}
                  value={form.newPassword} onChange={handleChange} onBlur={() => handleBlur("newPassword")}
                  variant="bordered" radius="lg" autoComplete="new-password"
                  isInvalid={!!newErr} errorMessage={newErr}
                  color={newErr ? "danger" : touched.newPassword && form.newPassword && !newErr ? "success" : "default"}
                  startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                  classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                  endContent={
                    <button type="button" onClick={() => setShowNew(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                      {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
                {form.newPassword && (
                  <div className="flex items-center gap-1.5 px-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i < pwdStrength ? strengthColor(pwdStrength) : (isDark ? "#374151" : "#e4e4e7") }} />
                    ))}
                    <span className="text-xs ml-1 font-medium flex-shrink-0" style={{ color: strengthColor(pwdStrength) }}>
                      {strengthLabel(pwdStrength)}
                    </span>
                  </div>
                )}
              </div>

              <Input label={t("auth.confirm_password")} name="confirmPassword"
                type={showCfm ? "text" : "password"}
                value={form.confirmPassword} onChange={handleChange} onBlur={() => handleBlur("confirmPassword")}
                variant="bordered" radius="lg" autoComplete="new-password"
                isInvalid={!!cfmErr} errorMessage={cfmErr}
                color={cfmErr ? "danger" : touched.confirmPassword && form.confirmPassword && form.newPassword === form.confirmPassword ? "success" : "default"}
                startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                endContent={
                  <button type="button" onClick={() => setShowCfm(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                    {showCfm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />

              <Button type="submit" color="primary" isLoading={loading} isDisabled={loading}
                radius="lg" size="lg" className="w-full font-bold text-base h-12 shadow-md mt-1"
                style={{ background: "linear-gradient(135deg, #1E40AF, #1D4ED8, #2563EB)" }}>
                {loading ? t("auth.updating") : t("auth.update_password")}
              </Button>

              <div className="flex justify-center">
                <RouterLink to="/profile"
                  className="inline-flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors">
                  <ChevronLeft size={15} />
                  {t("common.back_to_profile")}
                </RouterLink>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-default-400 mt-8 leading-relaxed">
            <RouterLink to="/terms" className="underline hover:text-default-600">{t("common.terms_of_service")}</RouterLink>
            {" · "}
            <RouterLink to="/privacy" className="underline hover:text-default-600">{t("common.privacy_policy")}</RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
}
