import React, { useState, useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";
import { Input, Button } from "@heroui/react";
import { Eye, EyeOff, Mail, Lock, KeyRound, ShieldCheck, ChevronLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { authService } from "../../services/authService";

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
const strengthLabel = (s) => ["", "Rất yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"][s] || "";
const strengthColor = (s) => ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"][s] || "#e4e4e7";

const validateEmail    = (v) => (!v?.trim() ? "Vui lòng nhập email" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Email không hợp lệ" : null);
const validatePassword = (v) => (!v ? "Vui lòng nhập mật khẩu mới" : v.length < 8 ? "Tối thiểu 8 ký tự" : !/[A-Z]/.test(v) ? "Cần ít nhất 1 chữ hoa" : !/[0-9]/.test(v) ? "Cần ít nhất 1 chữ số" : !/[^A-Za-z0-9]/.test(v) ? "Cần ít nhất 1 ký tự đặc biệt" : null);

/* ─── Step bar ─── */
const StepBar = ({ step }) => {
  const steps = ["Nhập email", "Mã OTP", "Mật khẩu mới"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1; const done = step > n; const active = step === n;
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  background: done || active ? "linear-gradient(135deg, #1E40AF, #2563EB)" : "#f4f4f5",
                  color: done || active ? "#fff" : "#a1a1aa",
                  boxShadow: active ? "0 0 0 4px rgba(29,78,216,.18)" : "none",
                }}>
                {done ? <CheckCircle2 size={15} /> : n}
              </div>
              <span className="text-xs font-semibold hidden sm:block"
                style={{ color: done || active ? "#1D4ED8" : "#a1a1aa" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 rounded-full"
                style={{ background: step > n ? "#1D4ED8" : "#e4e4e7", minWidth: 20 }} />
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
  const [form, setForm]         = useState({ email: "", newPassword: "", confirmPassword: "" });
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const otpValue = otpDigits.join("");

  useEffect(() => {
    if (!resendCooldown) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (!message.text) return;
    const t = setTimeout(() => setMessage({ text: "", error: true }), 5000);
    return () => clearTimeout(t);
  }, [message.text]);

  const showMsg = (text, error = true) => setMessage({ text, error });
  const handleBlur = (f) => setTouched(t => ({ ...t, [f]: true }));

  const emailError   = touched.email    ? validateEmail(form.email)           : null;
  const pwdError     = touched.newPassword ? validatePassword(form.newPassword) : null;
  const confirmError = touched.confirmPassword
    ? (!form.confirmPassword ? "Vui lòng xác nhận mật khẩu" : form.newPassword !== form.confirmPassword ? "Mật khẩu không khớp" : null)
    : null;

  const handleOtpChange = (i, val) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits]; next[i] = clean; setOtpDigits(next);
    if (clean && i < 5) document.getElementById(`otp-fp-${i + 1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) document.getElementById(`otp-fp-${i - 1}`)?.focus();
  };
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length) {
      setOtpDigits([...paste.split(""), ...Array(6 - paste.length).fill("")]);
      document.getElementById(`otp-fp-${Math.min(paste.length, 5)}`)?.focus();
      e.preventDefault();
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault?.();
    setTouched(t => ({ ...t, email: true }));
    if (validateEmail(form.email)) return;
    try {
      setLoading(true);
      await authService.requestResetOTP({ email: form.email.trim().toLowerCase() });
      showMsg("Đã gửi OTP tới email của bạn.", false);
      setStep(2); setResendCooldown(60);
    } catch (err) { showMsg(err?.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = (e) => {
    e?.preventDefault?.();
    if (otpValue.length < 6) { showMsg("Vui lòng nhập đủ 6 số OTP."); return; }
    setStep(3); setMessage({ text: "", error: true });
  };

  const handleReset = async (e) => {
    e?.preventDefault?.();
    setTouched(t => ({ ...t, newPassword: true, confirmPassword: true }));
    if (validatePassword(form.newPassword) || form.newPassword !== form.confirmPassword) return;
    try {
      setLoading(true);
      await authService.resetPassword({ email: form.email, otp: otpValue, newPassword: form.newPassword });
      showMsg("Mật khẩu đã được đặt lại thành công!", false);
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) { showMsg(err?.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      await authService.requestResetOTP({ email: form.email });
      showMsg("Đã gửi lại OTP.", false);
      setResendCooldown(60); setOtpDigits(["","","","","",""]);
    } catch (err) { showMsg(err?.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const pwdStrength = getPasswordStrength(form.newPassword);

  const panelContent = [
    {
      badge: "🔐 Bảo mật tài khoản",
      title: <>Khôi phục<br /><span style={{ background: "linear-gradient(90deg, #93C5FD, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>mật khẩu</span><br />an toàn</>,
      desc: "Nhập email đã đăng ký. Chúng tôi sẽ gửi mã OTP để xác minh danh tính của bạn.",
      tips: ["Kiểm tra cả hòm thư Spam / Junk", "OTP có hiệu lực trong 10 phút", "Không chia sẻ OTP với bất kỳ ai"],
    },
    {
      badge: "📬 Kiểm tra email",
      title: <>Nhập mã<br /><span style={{ background: "linear-gradient(90deg, #93C5FD, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>xác thực</span><br />OTP</>,
      desc: `Mã 6 chữ số đã được gửi đến ${form.email || "email của bạn"}.`,
      tips: ["Bạn có thể paste toàn bộ 6 số", "Gửi lại sau 60 giây nếu không nhận được", "Kiểm tra thư mục Spam nếu cần"],
    },
    {
      badge: "🔑 Tạo mật khẩu mới",
      title: <>Đặt lại<br /><span style={{ background: "linear-gradient(90deg, #93C5FD, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>mật khẩu</span><br />mạnh hơn</>,
      desc: "Tạo mật khẩu mạnh để bảo vệ tài khoản của bạn tốt hơn.",
      tips: ["Tối thiểu 8 ký tự", "Kết hợp chữ hoa, thường, số và ký tự đặc biệt", "Không dùng lại mật khẩu cũ"],
    },
  ][step - 1];

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

        <div className="relative z-10 flex-1 flex flex-col justify-center gap-6 my-10 transition-all">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: "rgba(96,165,250,.2)", color: "#BFDBFE", border: "1px solid rgba(96,165,250,.35)" }}>
              {panelContent.badge}
            </div>
            <h2 className="text-white font-black text-[2.1rem] leading-tight tracking-tight"
              style={{ fontFamily: "'Baloo 2', cursive" }}>
              {panelContent.title}
            </h2>
            <p className="text-blue-200 text-sm mt-3 leading-relaxed max-w-[260px]" style={{ opacity: 0.8 }}>
              {panelContent.desc}
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {panelContent.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-blue-100" style={{ opacity: 0.75 }}>
                <CheckCircle2 size={15} className="text-blue-300 flex-shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 mt-2">
            {["Nhập email", "Xác thực OTP", "Đặt mật khẩu mới"].map((label, i) => {
              const n = i + 1; const active = step === n; const done = step > n;
              return (
                <div key={n} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: active ? "rgba(59,130,246,.18)" : "transparent",
                    border: active ? "1px solid rgba(59,130,246,.35)" : "1px solid transparent",
                  }}>
                  <span className="text-xs font-black"
                    style={{ color: active ? "#93C5FD" : done ? "#34d399" : "rgba(255,255,255,.3)" }}>
                    {done ? "✓" : `0${n}`}
                  </span>
                  <span className="text-sm"
                    style={{ color: active ? "#fff" : done ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.3)" }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck size={14} className="text-blue-300" />
          <p className="text-blue-300 text-xs" style={{ opacity: 0.6 }}>Bảo mật SSL · Mã hóa đầu cuối · Tuân thủ PDPA</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto" style={{ background: "#f8faff" }}>
        <div className="w-full max-w-[420px] py-4">

          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow">
              <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
            </div>
            <span className="font-black text-lg text-default-900" style={{ fontFamily: "'Baloo 2', cursive" }}>Daily Fit</span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-default-900 tracking-tight" style={{ fontFamily: "'Baloo 2', cursive" }}>
              Quên mật khẩu
            </h1>
            <p className="text-default-500 text-sm mt-1.5">
              Nhớ lại rồi?{" "}
              <RouterLink to="/login" className="font-semibold hover:underline" style={{ color: "#1D4ED8" }}>
                Đăng nhập
              </RouterLink>
            </p>
          </div>

          <StepBar step={step} />

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
            <form onSubmit={handleSend} noValidate className="flex flex-col gap-4">
              <Input autoFocus label="Địa chỉ Email" name="email" type="email"
                value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                onBlur={() => handleBlur("email")}
                variant="bordered" radius="lg"
                isInvalid={!!emailError} errorMessage={emailError}
                color={emailError ? "danger" : touched.email && form.email && !validateEmail(form.email) ? "success" : "default"}
                startContent={<Mail size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                description={!emailError && !touched.email ? "Email bạn đã dùng để đăng ký tài khoản" : undefined}
              />
              <Button type="submit" color="primary" isLoading={loading} isDisabled={loading}
                radius="lg" size="lg" className="w-full font-bold text-base h-12 shadow-md"
                style={{ background: "linear-gradient(135deg, #1E40AF, #1D4ED8, #2563EB)" }}>
                {loading ? "Đang gửi OTP…" : "Gửi mã OTP →"}
              </Button>
              <div className="flex justify-center">
                <RouterLink to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors">
                  <ChevronLeft size={15} />
                  Quay lại đăng nhập
                </RouterLink>
              </div>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} noValidate className="flex flex-col gap-6">
              <div className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                style={{ background: "rgba(29,78,216,.06)", border: "1px solid rgba(29,78,216,.15)" }}>
                <Mail size={18} style={{ color: "#1D4ED8" }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-default-800">Kiểm tra hộp thư của bạn</p>
                  <p className="text-xs text-default-500 mt-0.5">
                    Mã OTP đã được gửi đến{" "}
                    <span className="font-semibold" style={{ color: "#1D4ED8" }}>{form.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <label className="text-sm font-semibold text-default-700 self-start flex items-center gap-1.5">
                  <KeyRound size={14} style={{ color: "#1D4ED8" }} />
                  Nhập mã OTP (6 chữ số)
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, i) => (
                    <input key={i} id={`otp-fp-${i}`} type="text" inputMode="numeric" maxLength={1}
                      value={d} onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="text-center text-xl font-black rounded-xl outline-none transition-all"
                      style={{
                        width: 48, height: 54,
                        border: d ? "2px solid #1D4ED8" : "2px solid #DBEAFE",
                        background: d ? "rgba(29,78,216,.06)" : "#fff",
                        color: "#1e3a8a",
                        boxShadow: d ? "0 0 0 3px rgba(29,78,216,.1)" : "none",
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-default-400">
                  <RefreshCw size={12} />
                  {resendCooldown > 0 ? (
                    <span>Gửi lại sau <span className="font-bold" style={{ color: "#1D4ED8" }}>{resendCooldown}s</span></span>
                  ) : (
                    <>
                      Không nhận được?{" "}
                      <button type="button" onClick={handleResend} disabled={loading}
                        className="font-semibold hover:underline disabled:opacity-50" style={{ color: "#1D4ED8" }}>
                        Gửi lại OTP
                      </button>
                    </>
                  )}
                </div>
              </div>

              <Button type="submit" color="primary" isDisabled={otpValue.length < 6}
                radius="lg" size="lg" className="w-full font-bold text-base h-12 shadow-md"
                style={{ background: "linear-gradient(135deg, #1E40AF, #1D4ED8, #2563EB)" }}>
                Xác nhận OTP →
              </Button>

              <button type="button" onClick={() => { setStep(1); setOtpDigits(["","","","","",""]); }}
                className="flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors mx-auto">
                <ChevronLeft size={15} />
                Đổi email khác
              </button>
            </form>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <form onSubmit={handleReset} noValidate className="flex flex-col gap-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.2)" }}>
                <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-medium text-default-700">
                  Email <span className="font-semibold" style={{ color: "#1D4ED8" }}>{form.email}</span> đã xác thực
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Input autoFocus label="Mật khẩu mới" name="newPassword"
                  type={showPwd ? "text" : "password"}
                  value={form.newPassword} onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  onBlur={() => handleBlur("newPassword")}
                  variant="bordered" radius="lg" autoComplete="new-password"
                  isInvalid={!!pwdError} errorMessage={pwdError}
                  color={pwdError ? "danger" : touched.newPassword && form.newPassword && !validatePassword(form.newPassword) ? "success" : "default"}
                  startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                  classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                  endContent={
                    <button type="button" onClick={() => setShowPwd(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
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

              <Input label="Xác nhận mật khẩu mới" name="confirmPassword"
                type={showPwd2 ? "text" : "password"}
                value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                onBlur={() => handleBlur("confirmPassword")}
                variant="bordered" radius="lg" autoComplete="new-password"
                isInvalid={!!confirmError} errorMessage={confirmError}
                color={confirmError ? "danger" : touched.confirmPassword && form.confirmPassword && form.newPassword === form.confirmPassword ? "success" : "default"}
                startContent={<Lock size={15} className="text-default-400 flex-shrink-0" />}
                classNames={{ inputWrapper: "h-12 shadow-sm border-blue-100 hover:border-blue-300" }}
                endContent={
                  <button type="button" onClick={() => setShowPwd2(s => !s)} className="text-default-400 hover:text-default-600 transition-colors">
                    {showPwd2 ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />

              <Button type="submit" color="primary" isLoading={loading} isDisabled={loading}
                radius="lg" size="lg" className="w-full font-bold text-base h-12 shadow-md mt-1"
                style={{ background: "linear-gradient(135deg, #1E40AF, #1D4ED8, #2563EB)" }}>
                {loading ? "Đang đặt lại…" : "Đặt lại mật khẩu ✓"}
              </Button>

              <button type="button" onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors mx-auto">
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