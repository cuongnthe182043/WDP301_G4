import React, { useState } from "react";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "../../services/authService";

export default function ChangePassword() {
  const [form, setForm]       = useState({ oldPassword: "", newPassword: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(true);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!form.oldPassword || !form.newPassword) {
      setIsError(true);
      setMessage("Vui lòng nhập đầy đủ mật khẩu cũ và mới!");
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      await authService.changePassword(form, token);
      setIsError(false);
      setMessage("Đổi mật khẩu thành công!");
      setForm({ oldPassword: "", newPassword: "" });
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
          <h1 className="text-2xl font-black text-primary mb-1">Đổi mật khẩu</h1>
          <p className="text-default-500 text-sm mb-6">
            Hãy đặt mật khẩu mới thật mạnh để bảo vệ tài khoản của bạn.
          </p>

          {message && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              isError ? "bg-danger-50 text-danger border border-danger-200" : "bg-success-50 text-success border border-success-200"
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              autoFocus label="Mật khẩu cũ" name="oldPassword"
              type={showOld ? "text" : "password"}
              value={form.oldPassword} onChange={handleChange}
              variant="bordered" radius="lg"
              endContent={
                <button type="button" onClick={() => setShowOld(s => !s)} className="text-default-400">
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <Input
              label="Mật khẩu mới" name="newPassword"
              type={showNew ? "text" : "password"}
              value={form.newPassword} onChange={handleChange}
              variant="bordered" radius="lg"
              endContent={
                <button type="button" onClick={() => setShowNew(s => !s)} className="text-default-400">
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <Button
              type="submit" color="primary" isLoading={loading}
              isDisabled={loading} radius="lg" className="w-full font-semibold" size="lg"
            >
              {loading ? "Đang xử lý…" : "Xác nhận"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
