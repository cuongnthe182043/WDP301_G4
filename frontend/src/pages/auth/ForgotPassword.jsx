import React, { useState, useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";
import { Input, Button } from "@heroui/react";
import {
  Eye, EyeOff, Mail, Lock, KeyRound, ShieldCheck,
  ChevronLeft, CheckCircle2, RefreshCw,
} from "lucide-react";
import { authService } from "../../services/authService";

/* ─── helpers ─── */
const Dot = ({ style }) => (
  <div className="absolute rounded-full" style={{ opacity: 0.15, ...style }} />
);

const getPasswordStrength = (pwd) => {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)         s++;
  if (pwd.length >= 12)        s++;
  if (/[A-Z]/.test(pwd))       s++;
  if (/[0-9]/.test(pwd))       s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
};
const strengthLabel = (s) => ["", "Rất yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"][s] || "";
const strengthColor = (s) => ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"][s] || "#e4e4e7";

const validateEmail = (v) => {
  if (!v?.trim()) return "Vui lòng nhập email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email không hợp lệ";
  return null;
};
const validatePassword = (v) => {
  if (!v) return "Vui lòng nhập mật khẩu mới";
  if (v.length < 8) return "Tối thiểu 8 ký tự";
  if (!/[A-Z]/.test(v)) return "Cần ít nhất 1 chữ hoa";
  if (!/[0-9]/.test(v)) return "Cần ít nhất 1 chữ số";
  if (!/[^A-Za-z0-9]/.test(v)) return "Cần ít nhất 1 ký tự đặc biệt";
  return null;
};

/* ─── Step indicator ─── */
const StepBar = ({ step }) => {
  const steps = ["Nhập email", "Mã OTP", "Mật khẩu mới"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  background: done || active ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "#f4f4f5",
                  color: done || active ? "#fff" : "#a1a1aa",
                  boxShadow: active ? "0 0 0 4px rgba(99,102,241,.18)" : "none",
                }}
              >
                {done ? <CheckCircle2 size={15} /> : n}
              </div>
              <span
                className="text-xs font-semibold hidden sm:block"
                style={{ color: done || active ? "#4f46e5" : "#a1a1aa" }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 mx-2 h-0.5 rounded-full"
                style={{ background: step > n ? "#6366f1" : "#e4e4e7", minWidth: 20 }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [showPwd, setShowPwd]   = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [touched, setTouched]   = useState({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage]   = useState({ text: "", error: true });

  const [form, setForm] = useState({
    email: "", newPassword: "", confirmPassword: "",
  });
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const otpValue = otpDigits.join("");

  /* cooldown timer */
  useEffect(() => {
    if (!resendCooldown) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  /* auto-clear message */
  useEffect(() => {
    if (!message.text) return;
    const t = setTimeout(() => setMessage({ text: "", error: true }), 5000);
    return () => clearTimeout(t);
  }, [message.text]);

  const showMsg = (text, error = true) => setMessage({ text, error });
  const handleBlur = (f) => setTouched(t => ({ ...t, [f]: true }));

  /* derived errors */
  const emailError    = touched.email    ? validateEmail(form.email)       : null;
  const pwdError      = touched.newPassword ? validatePassword(form.newPassword) : null;
  const confirmError  = touched.confirmPassword
    ? (!form.confirmPassword ? "Vui lòng xác nhận mật khẩu"
        : form.newPassword !== form.confirmPassword ? "Mật khẩu không khớp" : null)
    : null;

  /* OTP handlers */
  const handleOtpChange = (i, val) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[i] = clean;
    setOtpDigits(next);
    if (clean && i < 5) document.getElementById(`otp-fp-${i + 1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0)
      document.getElementById(`otp-fp-${i - 1}`)?.focus();
  };
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length) {
      setOtpDigits([...paste.split(""), ...Array(6 - paste.length).fill("")]);
      document.getElementById(`otp-fp-${Math.min(paste.length, 5)}`)?.focus();
      e.preventDefault();
    }
  };

  /* Step 1: send OTP */
  const handleSend = async (e) => {
    e?.preventDefault?.();
    setTouched(t => ({ ...t, email: true }));
    if (validateEmail(form.email)) return;
    try {
      setLoading(true);
      await authService.requestResetOTP({ email: form.email.trim().toLowerCase() });
      showMsg("Đã gửi OTP tới email của bạn.", false);
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      showMsg(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  /* Step 2 → 3: verify OTP */
  const handleVerifyOtp = (e) => {
    e?.preventDefault?.();
    if (otpValue.length < 6) { showMsg("Vui lòng nhập đủ 6 số OTP."); return; }
    setStep(3);
    setMessage({ text: "", error: true });
  };

  /* Step 3: reset password */
  const handleReset = async (e) => {
    e?.preventDefault?.();
    setTouched(t => ({ ...t, newPassword: true, confirmPassword: true }));
    if (validatePassword(form.newPassword) || form.newPassword !== form.confirmPassword) return;
    try {
      setLoading(true);
      await authService.resetPassword({ email: form.email, otp: otpValue, newPassword: form.newPassword });
      showMsg("Mật khẩu đã được đặt lại thành công!", false);
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      showMsg(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      await authService.requestResetOTP({ email: form.email });
      showMsg("Đã gửi lại OTP.", false);
      setResendCooldown(60);
      setOtpDigits(["","","","","",""]);
    } catch (err) {
      showMsg(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const pwdStrength = getPasswordStrength(form.newPassword);

  /* ─── left panel hints per step ─── */
  const panelContent = [
    {
      badge: "🔐 Bảo mật tài khoản",
      title: <>Khôi phục<br /><span style={{ background: "linear-gradient(90deg,#a5b4fc,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>mật khẩu</span><br />an toàn</>,
      desc: "Nhập email đã đăng ký. Chúng tôi sẽ gửi mã OTP để xác minh danh tính của bạn.",
      tips: ["Kiểm tra cả hòm thư Spam / Junk", "OTP có hiệu lực trong 10 phút", "Không chia sẻ OTP với bất kỳ ai"],
    },
    {
      badge: "📬 Kiểm tra email",
      title: <>Nhập mã<br /><span style={{ background: "linear-gradient(90deg,#a5b4fc,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>xác thực</span><br />OTP</>,
      desc: `Mã 6 chữ số đã được gửi đến ${form.email || "email của bạn"}.`,
      tips: ["Bạn có thể paste toàn bộ 6 số", "Gửi lại sau 60 giây nếu không nhận được", "Kiểm tra thư mục Spam nếu cần"],
    },
    {
      badge: "🔑 Tạo mật khẩu mới",
      title: <>Đặt lại<br /><span style={{ background: "linear-gradient(90deg,#a5b4fc,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>mật khẩu</span><br />mạnh hơn</>,
      desc: "Tạo mật khẩu mạnh để bảo vệ tài khoản của bạn tốt hơn.",
      tips: ["Tối thiểu 8 ký tự", "Kết hợp chữ hoa, thường, số và ký tự đặc biệt", "Không dùng lại mật khẩu cũ"],
    },
  ][step - 1];

  return (
    <div className="min-h-dvh flex items-stretch" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── LEFT BRAND PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden p-10"
        style={{ background: "linear-gradient(145deg,#0f172a 0%,#1e1b4b 55%,#0f2027 100%)" }}
      >
        <Dot style={{ width: 320, height: 320, background: "radial-gradient(circle,#6366f1,transparent)", top: -80, left: -80 }} />
        <Dot style={{ width: 220, height: 220, background: "radial-gradient(circle,#10b981,transparent)", bottom: 60, right: -40 }} />
        <Dot style={{ width: 160, height: 160, background: "radial-gradient(circle,#818cf8,transparent)", top: "50%", right: "25%" }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* logo */}
        <div className="relative z-10">
          <RouterLink to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
              <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
            </div>
            <span className="text-white font-black text-xl tracking-tight">DFS Platform</span>
          </RouterLink>
        </div>

        {/* dynamic content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center gap-6 my-10 transition-all">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: "rgba(99,102,241,.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,.35)" }}
            >
              {panelContent.badge}
            </div>
            <h2 className="text-white font-black text-[2.1rem] leading-tight tracking-tight">
              {panelContent.title}
            </h2>
            <p className="text-white/50 text-sm mt-3 leading-relaxed max-w-[260px]">
              {panelContent.desc}
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {panelContent.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>

          {/* step visual */}
          <div className="flex flex-col gap-2 mt-2">
            {["Nhập email", "Xác thực OTP", "Đặt mật khẩu mới"].map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div
                  key={n}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: active ? "rgba(99,102,241,.15)" : "transparent",
                    border: active ? "1px solid rgba(99,102,241,.3)" : "1px solid transparent",
                  }}
                >
                  <span className="text-xs font-black" style={{ color: active ? "#a5b4fc" : done ? "#34d399" : "rgba(255,255,255,.3)" }}>
                    {done ? "✓" : `0${n}`}
                  </span>
                  <span className="text-sm" style={{ color: active ? "#fff" : done ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.3)" }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <p className="text-white/40 text-xs">Bảo mật SSL · Mã hóa đầu cuối · Tuân thủ PDPA</p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto" style={{ background: "#fafafa" }}>
        <div className="w-full max-w-[420px] py-4">

          {/* mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow">
              <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
            </div>
            <span className="font-black text-lg text-default-900">DFS Platform</span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-default-900 tracking-tight">Quên mật khẩu</h1>
            <p className="text-default-500 text-sm mt-1.5">
              Nhớ lại rồi?{" "}
              <RouterLink to="/login" className="text-primary font-semibold hover:underline">
                Đăng nhập
              </RouterLink>
            </p>
          </div>

          <StepBar step={step} />

          {/* Alert */}
          {message.text && (
            <div className={`mb-5 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 ${
              message.error
                ? "bg-danger-50 text-danger border border-danger-200"
                : "bg-success-50 text-success border border-success-200"
            }`}>
              <span>{message.error ? "⚠" : "✓"}</span>
              {message.text}
            </div>
          )}

          {/* ── STEP 1: Email ── */}
          {step === 1 && (
            <form onSubmit={handleSend} noValidate className="flex flex-col gap-4">
              <Input
                autoFocus
                label="Địa chỉ Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                onBlur={() => handleBlur("email")}
                variant="bordered"
                radius="lg"
                isInvalid={!!emailError}
                errorMessage={emailError}
                color={emailError ? "danger" : touched.email && form.email && !validateEmail(form.email) ? "success" : "default"}
                startContent={<Mail size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm" }}
                description={!emailError && !touched.email ? "Email bạn đã dùng để đăng ký tài khoản" : undefined}
              />

              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                isDisabled={loading}
                radius="lg"
                size="lg"
                className="w-full font-bold text-base h-12 shadow-md"
                style={{ background: !validateEmail(form.email) ? "linear-gradient(135deg,#6366f1,#4f46e5)" : undefined }}
              >
                {loading ? "Đang gửi OTP…" : "Gửi mã OTP →"}
              </Button>

              <div className="flex justify-center">
                <RouterLink
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors"
                >
                  <ChevronLeft size={15} />
                  Quay lại đăng nhập
                </RouterLink>
              </div>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} noValidate className="flex flex-col gap-6">
              <div
                className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)" }}
              >
                <Mail size={18} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-default-800">Kiểm tra hộp thư của bạn</p>
                  <p className="text-xs text-default-500 mt-0.5">
                    Mã OTP đã được gửi đến{" "}
                    <span className="font-semibold text-primary">{form.email}</span>
                  </p>
                </div>
              </div>

              {/* OTP boxes */}
              <div className="flex flex-col items-center gap-3">
                <label className="text-sm font-semibold text-default-700 self-start flex items-center gap-1.5">
                  <KeyRound size={14} className="text-primary" />
                  Nhập mã OTP (6 chữ số)
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-fp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="text-center text-xl font-black rounded-xl outline-none transition-all"
                      style={{
                        width: 48, height: 54,
                        border: d ? "2px solid #6366f1" : "2px solid #e4e4e7",
                        background: d ? "rgba(99,102,241,.06)" : "#fff",
                        color: "#1e1b4b",
                        boxShadow: d ? "0 0 0 3px rgba(99,102,241,.1)" : "none",
                      }}
                    />
                  ))}
                </div>

                {/* resend */}
                <div className="flex items-center gap-1.5 text-xs text-default-400">
                  <RefreshCw size={12} />
                  {resendCooldown > 0 ? (
                    <span>Gửi lại sau <span className="font-bold text-primary">{resendCooldown}s</span></span>
                  ) : (
                    <>
                      Không nhận được?{" "}
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="text-primary font-semibold hover:underline disabled:opacity-50"
                      >
                        Gửi lại OTP
                      </button>
                    </>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                color="primary"
                isDisabled={otpValue.length < 6}
                radius="lg"
                size="lg"
                className="w-full font-bold text-base h-12 shadow-md"
                style={{ background: otpValue.length === 6 ? "linear-gradient(135deg,#6366f1,#4f46e5)" : undefined }}
              >
                Xác nhận OTP →
              </Button>

              <button
                type="button"
                onClick={() => { setStep(1); setOtpDigits(["","","","","",""]); }}
                className="flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors mx-auto"
              >
                <ChevronLeft size={15} />
                Đổi email khác
              </button>
            </form>
          )}

          {/* ── STEP 3: New password ── */}
          {step === 3 && (
            <form onSubmit={handleReset} noValidate className="flex flex-col gap-4">
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.2)" }}
              >
                <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-medium text-default-700">
                  Email <span className="text-primary font-semibold">{form.email}</span> đã xác thực
                </p>
              </div>

              {/* New password */}
              <div className="flex flex-col gap-1.5">
                <Input
                  autoFocus
                  label="Mật khẩu mới"
                  name="newPassword"
                  type={showPwd ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  onBlur={() => handleBlur("newPassword")}
                  variant="bordered"
                  radius="lg"
                  autoComplete="new-password"
                  isInvalid={!!pwdError}
                  errorMessage={pwdError}
                  color={pwdError ? "danger" : touched.newPassword && form.newPassword && !validatePassword(form.newPassword) ? "success" : "default"}
                  startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                  classNames={{ inputWrapper: "h-12 shadow-sm" }}
                  endContent={
                    <button type="button" onClick={() => setShowPwd(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
                {/* strength bar */}
                {form.newPassword && (
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

              {/* Confirm password */}
              <Input
                label="Xác nhận mật khẩu mới"
                name="confirmPassword"
                type={showPwd2 ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                onBlur={() => handleBlur("confirmPassword")}
                variant="bordered"
                radius="lg"
                autoComplete="new-password"
                isInvalid={!!confirmError}
                errorMessage={confirmError}
                color={confirmError ? "danger" : touched.confirmPassword && form.confirmPassword && form.newPassword === form.confirmPassword ? "success" : "default"}
                startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm" }}
                endContent={
                  <button type="button" onClick={() => setShowPwd2(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                    {showPwd2 ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />

              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                isDisabled={loading}
                radius="lg"
                size="lg"
                className="w-full font-bold text-base h-12 shadow-md mt-1"
                style={{
                  background: !validatePassword(form.newPassword) && form.newPassword === form.confirmPassword
                    ? "linear-gradient(135deg,#6366f1,#4f46e5)" : undefined,
                }}
              >
                {loading ? "Đang đặt lại…" : "Đặt lại mật khẩu ✓"}
              </Button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors mx-auto"
              >
                <ChevronLeft size={15} />
                Quay lại nhập OTP
              </button>
            </form>
          )}

          <p className="text-center text-xs text-default-400 mt-8 leading-relaxed">
            <RouterLink to="/terms" className="underline hover:text-default-600">Điều khoản dịch vụ</RouterLink>
            {" · "}
            <RouterLink to="/privacy" className="underline hover:text-default-600">Chính sách bảo mật</RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
}