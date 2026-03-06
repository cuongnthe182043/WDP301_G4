import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Card, CardBody, Input, Button, Divider } from "@heroui/react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { authService } from "../../services/authService";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ email: "", otp: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(true);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if (!form.email) { setIsError(true); setMessage("Vui lòng nhập email!"); return; }
    try {
      setLoading(true);
      await authService.requestResetOTP({ email: form.email });
      setIsError(false);
      setMessage("Đã gửi OTP tới email!");
      setStep(2);
    } catch (err) {
      setIsError(true);
      setMessage(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e?.preventDefault?.();
    if (!form.otp) { setIsError(true); setMessage("Vui lòng nhập OTP!"); return; }
    if (!form.newPassword) { setIsError(true); setMessage("Vui lòng nhập mật khẩu mới!"); return; }
    try {
      setLoading(true);
      await authService.resetPassword(form);
      setIsError(false);
      setMessage("Mật khẩu đã được đặt lại! Đang chuyển về trang đăng nhập…");
      navigate("/login", { replace: true });
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
          <h1 className="text-2xl font-black text-primary mb-1">Quên mật khẩu</h1>
          <p className="text-default-500 text-sm mb-6">
            Nhập email để nhận mã OTP, sau đó đặt mật khẩu mới.
          </p>

          {message && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              isError ? "bg-danger-50 text-danger border border-danger-200" : "bg-success-50 text-success border border-success-200"
            }`}>
              {message}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSend} className="flex flex-col gap-4">
              <Input
                autoFocus label="Email" name="email" type="email"
                value={form.email} onChange={handleChange}
                variant="bordered" radius="lg"
              />
              <Button type="submit" color="primary" isLoading={loading}
                radius="lg" className="w-full font-semibold" size="lg">
                {loading ? "Đang gửi OTP…" : "Gửi OTP"}
              </Button>
              <Divider />
              <div className="flex justify-center">
                <RouterLink to="/login" className="text-sm text-primary hover:underline">
                  Quay lại đăng nhập
                </RouterLink>
              </div>
            </form>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <Input
                autoFocus label="Mã OTP" name="otp"
                value={form.otp} onChange={handleChange}
                variant="bordered" radius="lg"
              />
              <Input
                label="Mật khẩu mới" name="newPassword"
                type={showPwd ? "text" : "password"}
                value={form.newPassword} onChange={handleChange}
                variant="bordered" radius="lg"
                endContent={
                  <button type="button" onClick={() => setShowPwd(s => !s)} className="text-default-400">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Button type="submit" color="primary" isLoading={loading}
                radius="lg" className="w-full font-semibold" size="lg">
                {loading ? "Đang xác nhận…" : "Xác nhận"}
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="light" size="sm" startContent={<ArrowLeft size={15} />} onPress={() => setStep(1)}>
                  Nhập lại email
                </Button>
                <Button variant="light" size="sm" onPress={handleSend}>Gửi lại OTP</Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
