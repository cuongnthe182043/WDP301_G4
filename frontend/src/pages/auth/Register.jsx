import React, { useState, useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";
import { Input, Button, Checkbox, Divider } from "@heroui/react";
import { Eye, EyeOff, User, AtSign, Mail, Lock, ShieldCheck, KeyRound, ChevronLeft, CheckCircle2 } from "lucide-react";
import { authService } from "../../services/authService";
import { isEmail, isValidFullName, isValidPassword, isValidUsername } from "../../utils/validators";

/* ─── helpers ─── */
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

/* ─── Step bar ─── */
const StepBar = ({ step, labels }) => (
  <div className="flex items-center gap-0 mb-8">
    {[1, 2].map((n, i) => (
      <React.Fragment key={n}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 flex-shrink-0"
            style={{
              background: step >= n ? "linear-gradient(135deg, #1E40AF, #2563EB)" : "#f4f4f5",
              color: step >= n ? "#fff" : "#a1a1aa",
              boxShadow: step === n ? "0 0 0 4px rgba(29,78,216,.18)" : "none",
            }}>
            {step > n ? <CheckCircle2 size={16} /> : n}
          </div>
          <span className="text-sm font-semibold hidden sm:block"
            style={{ color: step >= n ? "#1D4ED8" : "#a1a1aa" }}>
            {labels[i]}
          </span>
        </div>
        {i === 0 && (
          <div className="flex-1 mx-3 h-0.5 rounded-full"
            style={{ background: step > 1 ? "#1D4ED8" : "#e4e4e7", minWidth: 32 }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const Feature = ({ children }) => (
  <li className="flex items-start gap-2.5 text-sm text-blue-100" style={{ opacity: 0.75 }}>
    <CheckCircle2 size={15} className="text-blue-300 flex-shrink-0 mt-0.5" />
    {children}
  </li>
);

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [showPwd, setShowPwd]   = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [agree, setAgree]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [touched, setTouched]   = useState({});
  const [message, setMessage]   = useState({ text: "", error: true });
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", confirmPassword: "" });

  const strengthLabel = (s) => [
    "", t("auth.pwd_strength_very_weak"), t("auth.pwd_strength_weak"),
    t("auth.pwd_strength_medium"), t("auth.pwd_strength_strong"), t("auth.pwd_strength_very_strong")
  ][s] || "";

  const validate = (data = form) => {
    const e = {};
    if (!data.name?.trim())               e.name = t("common.required");
    else if (!isValidFullName(data.name)) e.name = t("auth.full_name_invalid");
    if (!data.username?.trim())               e.username = t("common.required");
    else if (!isValidUsername(data.username)) e.username = t("auth.username_invalid");
    if (!data.email?.trim())          e.email = t("auth.email_required");
    else if (!isEmail(data.email))    e.email = t("auth.err_email");
    if (!data.password)               e.password = t("auth.password_required");
    else if (!isValidPassword(data.password)) e.password = t("auth.err_min_length", { count: 8 });
    if (!data.confirmPassword)        e.confirmPassword = t("auth.confirm_password_required");
    else if (data.password !== data.confirmPassword) e.confirmPassword = t("auth.err_password_match");
    return e;
  };

  const allErrors = validate();
  const visibleErrors = Object.fromEntries(Object.entries(allErrors).filter(([k]) => touched[k]));
  if (touched.agree && !agree) visibleErrors.agree = t("auth.agree_required");
  const step1Valid = Object.keys(allErrors).length === 0 && agree;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === "username" || name === "email" ? value.toLowerCase().trim() : value }));
  };
  const handleBlur = (field) => setTouched(t => ({ ...t, [field]: true }));
  const otpValue = otpDigits.join("");

  const handleOtpChange = (i, val) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits]; next[i] = clean; setOtpDigits(next);
    if (clean && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) document.getElementById(`otp-${i - 1}`)?.focus();
  };
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (paste.length) {
      setOtpDigits([...paste.split(""), ...Array(6 - paste.length).fill("")]);
      document.getElementById(`otp-${Math.min(paste.length, 5)}`)?.focus();
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => setMessage({ text: "", error: true }), 5000);
    return () => clearTimeout(timer);
  }, [message.text]);

  const showMsg = (text, error = true) => setMessage({ text, error });

  const handleRequestOTP = async (e) => {
    e?.preventDefault?.();
    setTouched({ name:true, username:true, email:true, password:true, confirmPassword:true, agree:true });
    if (!step1Valid) { showMsg(t("common.error")); return; }
    try {
      setLoading(true);
      await authService.requestRegisterOTP({ email: form.email });
      showMsg(t("auth.otp_sent"), false);
      setStep(2);
    } catch (err) { showMsg(err?.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e?.preventDefault?.();
    if (otpValue.length < 6) { showMsg(t("auth.otp_required")); return; }
    try {
      setLoading(true);
      await authService.verifyRegister({ ...form, otp: otpValue });
      showMsg(t("auth.register_done"), false);
      setTimeout(() => navigate("/login", { replace: true }), 1600);
    } catch (err) { showMsg(err?.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const pwdStrength = getPasswordStrength(form.password);
  const stepLabels = [t("auth.step_info"), t("auth.step_otp")];

  const stepsInfo = [
    { n: "01", label: t("auth.step_info"),     active: step === 1 },
    { n: "02", label: t("auth.step_otp"),      active: step === 2 },
    { n: "03", label: t("auth.step_done"),     active: false },
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
              {t("auth.register_free_badge")}
            </div>
            <h2 className="text-white font-black text-[2.2rem] leading-tight tracking-tight"
              style={{ fontFamily: "'Baloo 2', cursive" }}>
              {t("auth.register_hero_title")}<br />
              <span style={{ background: "linear-gradient(90deg, #93C5FD, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {t("auth.register_hero_subtitle")}
              </span>
            </h2>
            <p className="text-blue-200 text-sm mt-3 leading-relaxed max-w-[260px]" style={{ opacity: 0.8 }}>
              {t("auth.register_hero_desc")}
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            <Feature>{t("auth.feature_free")}</Feature>
            <Feature>{t("auth.feature_2fa")}</Feature>
            <Feature>{t("auth.feature_access")}</Feature>
            <Feature>{t("auth.feature_support")}</Feature>
          </ul>

          <div className="flex flex-col gap-2 mt-2">
            {stepsInfo.map(({ n, label, active }) => (
              <div key={n} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: active ? "rgba(59,130,246,.18)" : "transparent",
                  border: active ? "1px solid rgba(59,130,246,.35)" : "1px solid transparent",
                }}>
                <span className="text-xs font-black" style={{ color: active ? "#93C5FD" : "rgba(255,255,255,.3)" }}>{n}</span>
                <span className="text-sm" style={{ color: active ? "#fff" : "rgba(255,255,255,.35)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck size={14} className="text-blue-300" />
          <p className="text-blue-300 text-xs" style={{ opacity: 0.6 }}>{t("common.secure_ssl")}</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto" style={{ background: "#f8faff" }}>
        <div className="w-full max-w-[430px] py-4">

          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow">
              <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
            </div>
            <span className="font-black text-lg text-default-900" style={{ fontFamily: "'Baloo 2', cursive" }}>Daily Fit</span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-default-900 tracking-tight" style={{ fontFamily: "'Baloo 2', cursive" }}>
              {t("auth.register_title")}
            </h1>
            <p className="text-default-500 text-sm mt-1.5">
              {t("auth.have_account")}{" "}
              <RouterLink to="/login" className="font-semibold hover:underline" style={{ color: "#1D4ED8" }}>{t("common.login")}</RouterLink>
            </p>
          </div>

          <StepBar step={step} labels={stepLabels} />

          {message.text && (
            <div className={`mb-5 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 ${
              message.error ? "bg-danger-50 text-danger border border-danger-200" : "bg-success-50 text-success border border-success-200"
            }`}>
              <span>{message.error ? "⚠" : "✓"}</span>
              {message.text}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={handleRequestOTP} noValidate className="flex flex-col gap-4">
              <Input autoFocus label={t("auth.full_name")} name="name" value={form.name}
                onChange={handleChange} onBlur={() => handleBlur("name")}
                variant="bordered" radius="lg"
                isInvalid={!!visibleErrors.name} errorMessage={visibleErrors.name}
                color={visibleErrors.name ? "danger" : touched.name && form.name && !allErrors.name ? "success" : "default"}
                startContent={<User size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
              />
              <Input label={t("auth.username")} name="username" value={form.username}
                onChange={handleChange} onBlur={() => handleBlur("username")}
                variant="bordered" radius="lg"
                isInvalid={!!visibleErrors.username} errorMessage={visibleErrors.username}
                color={visibleErrors.username ? "danger" : touched.username && form.username && !allErrors.username ? "success" : "default"}
                startContent={<AtSign size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                description={!visibleErrors.username && !touched.username ? t("auth.username_hint") : undefined}
              />
              <Input label={t("auth.email")} name="email" type="email" value={form.email}
                onChange={handleChange} onBlur={() => handleBlur("email")}
                variant="bordered" radius="lg"
                isInvalid={!!visibleErrors.email} errorMessage={visibleErrors.email}
                color={visibleErrors.email ? "danger" : touched.email && form.email && !allErrors.email ? "success" : "default"}
                startContent={<Mail size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
              />
              <div className="flex flex-col gap-1.5">
                <Input label={t("auth.password")} name="password" type={showPwd ? "text" : "password"}
                  value={form.password} onChange={handleChange} onBlur={() => handleBlur("password")}
                  variant="bordered" radius="lg" autoComplete="new-password"
                  isInvalid={!!visibleErrors.password} errorMessage={visibleErrors.password}
                  color={visibleErrors.password ? "danger" : touched.password && form.password && !allErrors.password ? "success" : "default"}
                  startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                  classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                  endContent={
                    <button type="button" onClick={() => setShowPwd(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
                {form.password && (
                  <div className="flex items-center gap-1.5 px-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i < pwdStrength ? strengthColor(pwdStrength) : "#e4e4e7" }} />
                    ))}
                    <span className="text-xs ml-1 font-medium flex-shrink-0" style={{ color: strengthColor(pwdStrength) }}>
                      {strengthLabel(pwdStrength)}
                    </span>
                  </div>
                )}
              </div>
              <Input label={t("auth.confirm_password")} name="confirmPassword" type={showPwd2 ? "text" : "password"}
                value={form.confirmPassword} onChange={handleChange} onBlur={() => handleBlur("confirmPassword")}
                variant="bordered" radius="lg" autoComplete="new-password"
                isInvalid={!!visibleErrors.confirmPassword} errorMessage={visibleErrors.confirmPassword}
                color={visibleErrors.confirmPassword ? "danger" : touched.confirmPassword && form.confirmPassword && !allErrors.confirmPassword ? "success" : "default"}
                startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                endContent={
                  <button type="button" onClick={() => setShowPwd2(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                    {showPwd2 ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />
              <div>
                <Checkbox isSelected={agree} onValueChange={(v) => { setAgree(v); setTouched(t => ({ ...t, agree: true })); }} size="sm" radius="sm">
                  <span className="text-sm text-default-600">
                    {t("auth.agree_terms")}{" "}
                    <RouterLink to="/legal/privacy" className="font-medium hover:underline" style={{ color: "#1D4ED8" }}>
                      {t("auth.terms_privacy")}
                    </RouterLink>
                  </span>
                </Checkbox>
                {visibleErrors.agree && <p className="text-danger text-xs mt-1 pl-1">{visibleErrors.agree}</p>}
              </div>
              <Button type="submit" color="primary" isLoading={loading} isDisabled={loading}
                radius="lg" size="lg" className="w-full font-bold text-base h-12 shadow-md mt-1"
                style={{ background: "linear-gradient(135deg, #1E40AF, #1D4ED8, #2563EB)" }}>
                {loading ? t("auth.sending_otp") : t("auth.continue")}
              </Button>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form onSubmit={handleVerify} noValidate className="flex flex-col gap-6">
              <div className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                style={{ background: "rgba(29,78,216,.06)", border: "1px solid rgba(29,78,216,.15)" }}>
                <Mail size={18} style={{ color: "#1D4ED8" }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-default-800">{t("auth.check_inbox")}</p>
                  <p className="text-xs text-default-500 mt-0.5">
                    {t("auth.otp_sent_to")}{" "}
                    <span className="font-semibold" style={{ color: "#1D4ED8" }}>{form.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <label className="text-sm font-semibold text-default-700 self-start flex items-center gap-1.5">
                  <KeyRound size={14} style={{ color: "#1D4ED8" }} />
                  {t("auth.enter_otp")}
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, i) => (
                    <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                      value={d} onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="text-center text-xl font-black rounded-xl outline-none transition-all"
                      style={{
                        width: 46, height: 52,
                        border: d ? "2px solid #1D4ED8" : "2px solid #DBEAFE",
                        background: d ? "rgba(29,78,216,.06)" : "#fff",
                        color: "#1e3a8a",
                        boxShadow: d ? "0 0 0 3px rgba(29,78,216,.1)" : "none",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-default-400 text-center">
                  {t("auth.otp_valid_minutes")}{" "}
                  <button type="button" onClick={handleRequestOTP} disabled={loading}
                    className="font-semibold hover:underline disabled:opacity-50" style={{ color: "#1D4ED8" }}>
                    {t("auth.resend_otp")}
                  </button>
                </p>
              </div>

              <Button type="submit" color="primary" isLoading={loading} isDisabled={loading || otpValue.length < 6}
                radius="lg" size="lg" className="w-full font-bold text-base h-12 shadow-md"
                style={{ background: "linear-gradient(135deg, #1E40AF, #1D4ED8, #2563EB)" }}>
                {loading ? t("auth.verifying") : t("auth.verify_complete")}
              </Button>

              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors mx-auto">
                <ChevronLeft size={15} />
                {t("common.back")}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-default-400 mt-6 leading-relaxed">
            {t("auth.register_footer")}{" "}
            <RouterLink to="/terms" className="underline hover:text-default-600">{t("common.terms_of_service")}</RouterLink>
            {" "}{t("auth.and")}{" "}
            <RouterLink to="/privacy" className="underline hover:text-default-600">{t("common.privacy_policy")}</RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
}
