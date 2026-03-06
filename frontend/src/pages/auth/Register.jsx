import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";
import { Card, CardBody, Input, Button, Checkbox } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "../../services/authService";
import { isEmail, isValidFullName, isValidPassword, isValidUsername } from "../../utils/validators";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [showPwd, setShowPwd]   = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [agree, setAgree]       = useState(true);
  const [loading, setLoading]   = useState(false);

  const [form, setForm] = useState({
    name: "", username: "", email: "", password: "", confirmPassword: "", otp: "",
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(true);
  const [errors, setErrors]   = useState({});

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validateStep1 = (data) => {
    const e = {};
    if (!data.name?.trim())              e.name = "Vui lòng nhập họ tên";
    else if (!isValidFullName(data.name)) e.name = "Họ tên không hợp lệ";
    if (!data.username?.trim())          e.username = "Vui lòng nhập tên đăng nhập";
    else if (!isValidUsername(data.username)) e.username = "Username 3–30 ký tự, chỉ a–z và 0–9";
    if (!data.email?.trim())             e.email = "Vui lòng nhập email";
    else if (!isEmail(data.email))       e.email = "Email không hợp lệ";
    if (!data.password)                  e.password = "Vui lòng nhập mật khẩu";
    else if (!isValidPassword(data.password)) e.password = "Tối thiểu 8 ký tự, gồm hoa, thường, số và ký tự đặc biệt";
    if (!data.confirmPassword)           e.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (data.password !== data.confirmPassword) e.confirmPassword = "Mật khẩu xác nhận không khớp";
    if (!agree)                          e.agree = "Bạn cần đồng ý điều khoản để tiếp tục";
    return e;
  };

  const handleRequestOTP = async (e) => {
    e?.preventDefault?.();
    setMessage("");
    const v = validateStep1(form);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      setIsError(true);
      setMessage("Vui lòng kiểm tra lại thông tin.");
      return;
    }
    try {
      setLoading(true);
      await authService.requestRegisterOTP({ email: form.email.trim().toLowerCase() });
      setIsError(false);
      setMessage("Đã gửi OTP tới email của bạn.");
      setStep(2);
    } catch (err) {
      setIsError(true);
      setMessage(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault?.();
    try {
      if (form.password !== form.confirmPassword) return setMessage("Mật khẩu xác nhận không khớp!");
      if (!form.otp) return setMessage("Vui lòng nhập OTP!");
      setLoading(true);
      await authService.verifyRegister(form);
      setIsError(false);
      setMessage("Đăng ký thành công! Hãy đăng nhập.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setIsError(true);
      setMessage(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

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
              <div className="w-20 h-20 rounded-full overflow-hidden shadow-md">
                <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover scale-125" />
              </div>
            </RouterLink>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-black text-primary">Đăng ký</h1>
              <p className="text-default-500 text-sm mt-1">Hãy để việc mua hàng trở nên dễ dàng và thú vị!</p>
            </div>
          </div>

          {message && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              isError ? "bg-danger-50 text-danger border border-danger-200" : "bg-success-50 text-success border border-success-200"
            }`}>
              {message}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOTP} className="flex flex-col gap-4">
              <Input
                autoFocus label="Họ tên" name="name" value={form.name}
                onChange={handleChange} variant="bordered" radius="lg"
                isInvalid={!!errors.name} errorMessage={errors.name}
              />
              <Input
                label="Tên đăng nhập" name="username" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                variant="bordered" radius="lg"
                isInvalid={!!errors.username} errorMessage={errors.username}
              />
              <Input
                label="Email" name="email" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value.trim().toLowerCase() })}
                variant="bordered" radius="lg"
                isInvalid={!!errors.email} errorMessage={errors.email}
              />
              <Input
                label="Mật khẩu" name="password"
                type={showPwd ? "text" : "password"}
                value={form.password} onChange={handleChange}
                variant="bordered" radius="lg" autoComplete="new-password"
                isInvalid={!!errors.password} errorMessage={errors.password}
                endContent={
                  <button type="button" onClick={() => setShowPwd(s => !s)} className="text-default-400">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Input
                label="Xác nhận mật khẩu" name="confirmPassword"
                type={showPwd2 ? "text" : "password"}
                value={form.confirmPassword} onChange={handleChange}
                variant="bordered" radius="lg" autoComplete="new-password"
                isInvalid={!!errors.confirmPassword} errorMessage={errors.confirmPassword}
                endContent={
                  <button type="button" onClick={() => setShowPwd2(s => !s)} className="text-default-400">
                    {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Checkbox isSelected={agree} onValueChange={setAgree} size="sm">
                <span className="text-sm text-default-600">
                  Tôi đồng ý với{" "}
                  <RouterLink to="/legal/privacy" className="text-primary hover:underline">
                    chính sách & điều khoản
                  </RouterLink>
                </span>
              </Checkbox>
              {errors.agree && <p className="text-danger text-xs -mt-2">{errors.agree}</p>}

              <Button
                type="submit" color="primary" isLoading={loading}
                isDisabled={loading || !form.name || !form.username || !form.email || !form.password || !form.confirmPassword || !agree}
                radius="lg" className="w-full font-semibold" size="lg"
              >
                {loading ? "Đang gửi OTP…" : "Gửi OTP"}
              </Button>

              <p className="text-center text-sm text-default-600">
                Đã có tài khoản?{" "}
                <RouterLink to="/login" className="text-primary font-semibold hover:underline">Đăng nhập</RouterLink>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <Input
                autoFocus label="Mã OTP" name="otp" value={form.otp}
                onChange={handleChange} variant="bordered" radius="lg"
                description="Kiểm tra email của bạn để lấy mã OTP."
              />
              <Button
                type="submit" color="primary" isLoading={loading}
                isDisabled={loading} radius="lg" className="w-full font-semibold" size="lg"
              >
                {loading ? "Đang xác thực…" : "Xác thực & Đăng ký"}
              </Button>
              <div className="flex justify-between">
                <Button variant="light" size="sm" onPress={() => setStep(1)}>← Sửa thông tin</Button>
                <Button variant="light" size="sm" onPress={handleRequestOTP}>Gửi lại OTP</Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
