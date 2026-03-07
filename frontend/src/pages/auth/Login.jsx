import React, { useEffect, useState, useCallback } from "react";
import { Link as RouterLink } from "react-router-dom";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";
import {
  Card, CardBody, Input, Button, Checkbox, Divider, Chip,
} from "@heroui/react";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Zap, Users, TrendingUp } from "lucide-react";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

/* ─── helpers ─── */
const clearAuthStorage = () => {
  try {
    ["DFS_TOKEN","dfs_token","access_token","accessToken"].forEach(k => localStorage.removeItem(k));
  } catch {}
};

const validateIdentifier = (v) => {
  if (!v.trim()) return "Vui lòng nhập email, username hoặc số điện thoại";
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^(0|\+84)[3-9]\d{8}$/;
  // allow username (≥3 chars, no spaces) OR email OR phone
  if (v.includes("@") && !emailRe.test(v)) return "Địa chỉ email không hợp lệ";
  if (/^\+?0?[0-9]{9,12}$/.test(v.replace(/\s/g,"")) && !phoneRe.test(v.replace(/\s/g,""))) 
    return "Số điện thoại không hợp lệ (VD: 0912345678)";
  if (v.trim().length < 3) return "Tối thiểu 3 ký tự";
  return null;
};

const validatePassword = (v) => {
  if (!v) return "Vui lòng nhập mật khẩu";
  if (v.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
  return null;
};

/* ─── decorative stat card ─── */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div
    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
    style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
  >
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "22" }}>
      <Icon size={16} style={{ color }} />
    </div>
    <div>
      <p className="text-white font-bold text-sm leading-none">{value}</p>
      <p className="text-white/50 text-xs mt-0.5">{label}</p>
    </div>
  </div>
);

/* ─── floating dot decoration ─── */
const Dot = ({ style }) => (
  <div className="absolute rounded-full" style={{ opacity: 0.15, ...style }} />
);

export default function Login() {
  const [form, setForm]       = useState({ identifier: "", password: "" });
  const [touched, setTouched] = useState({ identifier: false, password: false });
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  /* derived validation */
  const errors = {
    identifier: touched.identifier ? validateIdentifier(form.identifier) : null,
    password:   touched.password   ? validatePassword(form.password)     : null,
  };
  const formValid = !validateIdentifier(form.identifier) && !validatePassword(form.password);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleBlur   = (field) => setTouched(t => ({ ...t, [field]: true }));

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });
    if (!formValid) return;
    setMessage("");
    setLoading(true);
    clearAuthStorage();
    try {
      const res = await authService.login(form);
      const { accessToken, user } = res.data.data || {};
      if (remember) localStorage.setItem("dfs_remember", "1");
      else          localStorage.removeItem("dfs_remember");
      login(user, accessToken);
      setIsError(false);
      setMessage("Đăng nhập thành công!");
    } catch (err) {
      setIsError(true);
      setMessage(err?.response?.data?.message || err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        ux_mode: "popup",
      });
      try {
        window.google.accounts.id.renderButton(
          document.getElementById("googleLoginDiv"),
          { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 280 }
        );
      } catch {}
    }
  }, []);

  const handleGoogleCallback = async (response) => {
    try {
      setLoading(true);
      clearAuthStorage();
      const res = await authService.googleLogin({ token: response.credential });
      const { accessToken, user } = res.data.data || {};
      login(user, accessToken);
      setIsError(false);
      setMessage("Đăng nhập Google thành công!");
    } catch (err) {
      setIsError(true);
      setMessage("Lỗi Google Login: " + (err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const promptGoogle = () => {
    if (window.google?.accounts?.id) window.google.accounts.id.prompt();
    else { setIsError(true); setMessage("Google chưa sẵn sàng."); }
  };

  return (
    <div
      className="min-h-dvh flex items-stretch"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[48%] relative overflow-hidden p-10"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f2027 100%)",
        }}
      >
        {/* decorative blobs */}
        <Dot style={{ width: 320, height: 320, background: "radial-gradient(circle, #6366f1, transparent)", top: -80, left: -80 }} />
        <Dot style={{ width: 240, height: 240, background: "radial-gradient(circle, #10b981, transparent)", bottom: 40, right: -60 }} />
        <Dot style={{ width: 180, height: 180, background: "radial-gradient(circle, #818cf8, transparent)", top: "45%", right: "20%" }} />

        {/* grid overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* content */}
        <div className="relative z-10">
          <RouterLink to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
              <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
            </div>
            <span className="text-white font-black text-xl tracking-tight">DFS Platform</span>
          </RouterLink>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center gap-6 my-10">
          <div>
            <Chip
              size="sm"
              variant="flat"
              style={{ background: "rgba(99,102,241,.25)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,.4)" }}
              className="mb-4"
            >
              ✦ Nền tảng số #1 Việt Nam
            </Chip>
            <h2 className="text-white font-black text-4xl leading-tight tracking-tight">
              Trải nghiệm<br />
              <span style={{ background: "linear-gradient(90deg,#a5b4fc,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                vượt trội
              </span>
              <br />cùng DFS
            </h2>
            <p className="text-white/50 text-sm mt-3 leading-relaxed max-w-xs">
              Quản lý, kết nối và phát triển mọi hoạt động của bạn trong một nền tảng thông minh.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 max-w-xs">
            <StatCard icon={Users}      label="Người dùng đang hoạt động" value="12,400+"  color="#a5b4fc" />
            <StatCard icon={TrendingUp} label="Giao dịch hôm nay"          value="3,850"    color="#34d399" />
            <StatCard icon={Zap}        label="Tốc độ xử lý trung bình"    value="< 200ms"  color="#fbbf24" />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <p className="text-white/40 text-xs">Bảo mật SSL · Mã hóa đầu cuối · Tuân thủ PDPA</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10"
        style={{ background: "#fafafa" }}
      >
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow">
              <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
            </div>
            <span className="font-black text-lg text-default-900">DFS Platform</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-default-900 tracking-tight">Đăng nhập</h1>
            <p className="text-default-500 text-sm mt-1.5">
              Chưa có tài khoản?{" "}
              <RouterLink to="/register" className="text-primary font-semibold hover:underline">
                Tạo miễn phí
              </RouterLink>
            </p>
          </div>

          {/* Alert */}
          {message && (
            <div className={`mb-5 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 ${
              isError
                ? "bg-danger-50 text-danger border border-danger-200"
                : "bg-success-50 text-success border border-success-200"
            }`}>
              <span>{isError ? "⚠" : "✓"}</span>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Identifier */}
            <Input
              autoFocus
              label="Email / Username / SĐT"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              onBlur={() => handleBlur("identifier")}
              variant="bordered"
              radius="lg"
              isInvalid={!!errors.identifier}
              errorMessage={errors.identifier}
              color={errors.identifier ? "danger" : touched.identifier && form.identifier ? "success" : "default"}
              startContent={<Mail size={16} className="text-default-400 flex-shrink-0" />}
              classNames={{
                inputWrapper: "h-12 shadow-sm",
                label: "text-default-500 text-sm",
              }}
              description={!errors.identifier && !touched.identifier ? "Email, tên đăng nhập hoặc số điện thoại" : undefined}
            />

            {/* Password */}
            <Input
              label="Mật khẩu"
              name="password"
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              onBlur={() => handleBlur("password")}
              variant="bordered"
              radius="lg"
              isInvalid={!!errors.password}
              errorMessage={errors.password}
              color={errors.password ? "danger" : touched.password && form.password ? "success" : "default"}
              startContent={<Lock size={16} className="text-default-400 flex-shrink-0" />}
              classNames={{
                inputWrapper: "h-12 shadow-sm",
                label: "text-default-500 text-sm",
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="text-default-400 hover:text-default-600 transition-colors"
                  aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />

            {/* Password strength hint */}
            {form.password && (
              <div className="flex gap-1.5 -mt-2 px-1">
                {[6, 8, 12].map((n, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background: form.password.length >= n
                        ? i === 0 ? "#f97316" : i === 1 ? "#eab308" : "#22c55e"
                        : "#e4e4e7"
                    }}
                  />
                ))}
                <span className="text-xs text-default-400 ml-1 self-center">
                  {form.password.length < 6 ? "Yếu" : form.password.length < 8 ? "Trung bình" : form.password.length < 12 ? "Khá" : "Mạnh"}
                </span>
              </div>
            )}

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <Checkbox isSelected={remember} onValueChange={setRemember} size="sm" radius="sm">
                <span className="text-sm text-default-600">Ghi nhớ đăng nhập</span>
              </Checkbox>
              <RouterLink to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                Quên mật khẩu?
              </RouterLink>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              color="primary"
              isLoading={loading}
              isDisabled={loading}
              radius="lg"
              size="lg"
              className="w-full font-bold text-base h-12 shadow-md"
              style={{
                background: formValid
                  ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                  : undefined,
              }}
            >
              {loading ? "Đang đăng nhập…" : "Đăng nhập →"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <Divider className="flex-1" />
            <span className="text-xs text-default-400 font-medium px-1">hoặc tiếp tục với</span>
            <Divider className="flex-1" />
          </div>

          {/* Google login */}
          <div className="flex flex-col items-center gap-3">
            <div id="googleLoginDiv" className="w-full flex justify-center" />
            <Button
              variant="bordered"
              onPress={promptGoogle}
              radius="lg"
              size="lg"
              className="w-full font-semibold border-default-200 hover:border-default-400 h-12"
              startContent={
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              }
            >
              Đăng nhập bằng Google
            </Button>
          </div>

          <p className="text-center text-xs text-default-400 mt-6 leading-relaxed">
            Bằng cách đăng nhập, bạn đồng ý với{" "}
            <RouterLink to="/terms" className="underline hover:text-default-600">Điều khoản dịch vụ</RouterLink>
            {" "}và{" "}
            <RouterLink to="/privacy" className="underline hover:text-default-600">Chính sách bảo mật</RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
}