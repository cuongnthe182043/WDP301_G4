import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";
import { Input, Button } from "@heroui/react";
import { Eye, EyeOff, Lock, ShieldCheck, CheckCircle2, ChevronLeft } from "lucide-react";
import { authService } from "../../services/authService";

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

export default function ChangePassword() {
  const [form, setForm]       = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [message, setMessage] = useState({ text: "", error: true });
  const [done, setDone]       = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleBlur   = (f) => setTouched(t => ({ ...t, [f]: true }));
  const showMsg = (text, error = true) => setMessage({ text, error });

  const oldErr = touched.oldPassword && !form.oldPassword ? "Vui lòng nhập mật khẩu cũ" : null;
  const newErr = touched.newPassword
    ? (!form.newPassword ? "Vui lòng nhập mật khẩu mới"
      : form.newPassword.length < 8 ? "Tối thiểu 8 ký tự"
      : !/[A-Z]/.test(form.newPassword) ? "Cần ít nhất 1 chữ hoa"
      : !/[0-9]/.test(form.newPassword) ? "Cần ít nhất 1 chữ số"
      : null)
    : null;
  const cfmErr = touched.confirmPassword
    ? (!form.confirmPassword ? "Vui lòng xác nhận mật khẩu mới"
      : form.newPassword !== form.confirmPassword ? "Mật khẩu không khớp" : null)
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
      setDone(true); showMsg("Đổi mật khẩu thành công!", false);
    } catch (err) { showMsg(err?.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

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
              🔒 Bảo mật tài khoản
            </div>
            <h2 className="text-white font-black text-[2.1rem] leading-tight tracking-tight"
              style={{ fontFamily: "'Baloo 2', cursive" }}>
              Đổi<br />
              <span style={{ background: "linear-gradient(90deg, #93C5FD, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                mật khẩu
              </span><br />
              an toàn
            </h2>
            <p className="text-blue-200 text-sm mt-3 leading-relaxed max-w-[260px]" style={{ opacity: 0.8 }}>
              Cập nhật mật khẩu định kỳ giúp tài khoản của bạn luôn được bảo vệ tốt nhất.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {["Tối thiểu 8 ký tự", "Kết hợp chữ hoa, thường, số", "Không dùng lại mật khẩu cũ", "Không chia sẻ mật khẩu với ai"].map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-blue-100" style={{ opacity: 0.75 }}>
                <CheckCircle2 size={15} className="text-blue-300 flex-shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
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

          <div className="mb-8">
            <h1 className="text-3xl font-black text-default-900 tracking-tight" style={{ fontFamily: "'Baloo 2', cursive" }}>
              Đổi mật khẩu
            </h1>
            <p className="text-default-500 text-sm mt-1.5">Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
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
                style={{ background: "linear-gradient(135deg, #DBEAFE, #BFDBFE)" }}>
                <CheckCircle2 size={32} style={{ color: "#1D4ED8" }} />
              </div>
              <div>
                <p className="text-xl font-black text-default-900" style={{ fontFamily: "'Baloo 2', cursive" }}>
                  Đổi mật khẩu thành công!
                </p>
                <p className="text-default-500 text-sm mt-1">Mật khẩu mới đã được cập nhật.</p>
              </div>
              <RouterLink to="/profile"
                className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                style={{ color: "#1D4ED8" }}>
                <ChevronLeft size={15} />
                Quay lại hồ sơ
              </RouterLink>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input autoFocus label="Mật khẩu hiện tại" name="oldPassword"
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
                <Input label="Mật khẩu mới" name="newPassword"
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
                        style={{ background: i < pwdStrength ? strengthColor(pwdStrength) : "#e4e4e7" }} />
                    ))}
                    <span className="text-xs ml-1 font-medium flex-shrink-0" style={{ color: strengthColor(pwdStrength) }}>
                      {strengthLabel(pwdStrength)}
                    </span>
                  </div>
                )}
              </div>

              <Input label="Xác nhận mật khẩu mới" name="confirmPassword"
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
                {loading ? "Đang cập nhật…" : "Cập nhật mật khẩu →"}
              </Button>

              <div className="flex justify-center">
                <RouterLink to="/profile"
                  className="inline-flex items-center gap-1.5 text-sm text-default-500 hover:text-default-800 transition-colors">
                  <ChevronLeft size={15} />
                  Quay lại hồ sơ
                </RouterLink>
              </div>
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