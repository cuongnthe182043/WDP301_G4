import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";
import {
  Card, CardBody, Input, Button, Checkbox, Divider,
} from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const clearAuthStorage = () => {
  try {
    ["DFS_TOKEN","dfs_token","access_token","accessToken"].forEach(k => localStorage.removeItem(k));
  } catch {}
};

export default function Login() {
  const [form, setForm]               = useState({ identifier: "", password: "" });
  const [showPwd, setShowPwd]         = useState(false);
  const [remember, setRemember]       = useState(true);
  const [message, setMessage]         = useState("");
  const [isError, setIsError]         = useState(true);
  const [loading, setLoading]         = useState(false);

  const { login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 320 }
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

  const disabled = loading || !form.identifier?.trim() || !form.password?.trim();

  return (
    <div className="min-h-dvh flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(1000px 500px at 10% -10%, rgba(99,102,241,.08), transparent), radial-gradient(800px 400px at 100% 0, rgba(16,185,129,.08), transparent)",
      }}
    >
      <Card className="w-full max-w-[460px] shadow-2xl" radius="lg">
        <CardBody className="p-8 sm:p-10">
          {/* Logo + Title */}
          <div className="flex flex-col sm:flex-row items-center gap-5 mb-7">
            <RouterLink to="/" className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg">
                <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
              </div>
            </RouterLink>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-black text-default-900">Chào mừng đến với DFS</h1>
              <p className="text-default-500 text-sm mt-1">Vui lòng đăng nhập để bắt đầu trải nghiệm.</p>
            </div>
          </div>

          {/* Alert */}
          {message && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              isError ? "bg-danger-50 text-danger border border-danger-200" : "bg-success-50 text-success border border-success-200"
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              autoFocus
              label="Email / Username / SĐT"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              variant="bordered"
              radius="lg"
            />

            <Input
              label="Mật khẩu"
              name="password"
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              variant="bordered"
              radius="lg"
              endContent={
                <button type="button" onClick={() => setShowPwd(s => !s)} className="text-default-400 hover:text-default-600">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <Checkbox isSelected={remember} onValueChange={setRemember} size="sm">
                <span className="text-sm text-default-600">Ghi nhớ tôi</span>
              </Checkbox>
              <RouterLink to="/forgot-password" className="text-sm text-primary hover:underline">
                Quên mật khẩu?
              </RouterLink>
            </div>

            <Button
              type="submit"
              color="primary"
              isLoading={loading}
              isDisabled={disabled}
              radius="lg"
              className="w-full font-semibold"
              size="lg"
            >
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>

            <div className="flex justify-center items-center gap-2 text-sm flex-wrap">
              <span className="text-default-600">Bạn mới dùng nền tảng?</span>
              <RouterLink to="/register" className="text-primary font-semibold hover:underline">
                Tạo tài khoản
              </RouterLink>
            </div>

            <Divider />
            <p className="text-center text-xs text-default-400">hoặc đăng nhập bằng</p>

            <div className="flex justify-center"><div id="googleLoginDiv" /></div>

            <div className="flex justify-center">
              <Button
                variant="bordered"
                onPress={promptGoogle}
                radius="full"
                className="border-[#DB4437] text-[#DB4437] hover:bg-[#DB4437]/10 font-semibold"
              >
                Google
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
