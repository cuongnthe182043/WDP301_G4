import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card, CardBody, CardHeader, Input, Textarea, Button, Chip,
} from "@heroui/react";
import { Store, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import { registerShop, getMyShop } from "../../services/shopService";

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "warning",
    label: "Đang chờ duyệt",
    desc: "Đơn đăng ký của bạn đang được admin xem xét. Chúng tôi sẽ thông báo kết quả sớm nhất.",
  },
  approved: {
    icon: CheckCircle,
    color: "success",
    label: "Đã được duyệt",
    desc: "Chúc mừng! Shop của bạn đã được duyệt. Bạn có thể bắt đầu bán hàng ngay.",
  },
  suspended: {
    icon: XCircle,
    color: "danger",
    label: "Bị tạm khóa",
    desc: "Shop của bạn đang bị tạm khóa. Vui lòng liên hệ admin để biết thêm chi tiết.",
  },
};
//datamock

export default function RegisterShop() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [existingShop, setExistingShop] = useState(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    shop_name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    getMyShop()
      .then(setExistingShop)
      .catch(() => {})
      .finally(() => setLoadingShop(false));
  }, []);

  const set = (field) => (val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSubmit = async () => {
    if (!form.shop_name.trim()) {
      toast.error("Vui lòng nhập tên shop");
      return;
    }
    setLoading(true);
    try {
      const result = await registerShop(form);
      toast.success(result.message || "Đăng ký thành công!");
      setExistingShop(result.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (loadingShop) return null;

  if (existingShop) {
    const cfg = STATUS_CONFIG[existingShop.status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card radius="xl" shadow="lg">
            <CardBody className="p-8 flex flex-col items-center gap-4 text-center">
              <div className={`p-4 rounded-full bg-${cfg.color === "warning" ? "amber" : cfg.color === "success" ? "emerald" : "red"}-100`}>
                <Icon size={40} className={`text-${cfg.color === "warning" ? "amber" : cfg.color === "success" ? "emerald" : "red"}-500`} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">{existingShop.shop_name}</h2>
                <Chip color={cfg.color} variant="flat" size="sm" className="mt-2">{cfg.label}</Chip>
              </div>
              <p className="text-sm text-gray-500">{cfg.desc}</p>
              {existingShop.rejection_reason && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  Lý do: {existingShop.rejection_reason}
                </div>
              )}
              {existingShop.status === "approved" && (
                <Button
                  color="primary"
                  radius="lg"
                  endContent={<ArrowRight size={16} />}
                  onPress={() => navigate("/shop/dashboard")}
                  className="w-full font-bold"
                >
                  Vào trang quản lý shop
                </Button>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <Card radius="xl" shadow="lg">
          <CardHeader className="px-6 pt-6 pb-0 flex-col items-start gap-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Store size={24} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">Đăng ký bán hàng</h1>
                <p className="text-sm text-gray-500">Mở shop và bắt đầu kinh doanh trên nền tảng</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-6 py-5 flex flex-col gap-4">
            <Input
              label="Tên shop *"
              placeholder="VD: Thời Trang Hoàng Yến"
              value={form.shop_name}
              onValueChange={set("shop_name")}
              radius="lg"
              variant="bordered"
            />
            <Textarea
              label="Mô tả shop"
              placeholder="Giới thiệu về shop của bạn..."
              value={form.description}
              onValueChange={set("description")}
              radius="lg"
              variant="bordered"
              minRows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Số điện thoại"
                placeholder="0901234567"
                value={form.phone}
                onValueChange={set("phone")}
                radius="lg"
                variant="bordered"
              />
              <Input
                label="Email shop"
                placeholder="shop@example.com"
                value={form.email}
                onValueChange={set("email")}
                radius="lg"
                variant="bordered"
              />
            </div>
            <Input
              label="Địa chỉ shop"
              placeholder="123 Đường ABC, Quận 1, TP.HCM"
              value={form.address}
              onValueChange={set("address")}
              radius="lg"
              variant="bordered"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
              Sau khi đăng ký, đơn của bạn sẽ được admin xem xét trong vòng 1-3 ngày làm việc.
            </div>

            <Button
              color="primary"
              radius="lg"
              size="lg"
              isLoading={loading}
              onPress={handleSubmit}
              className="w-full font-bold"
              endContent={!loading && <ArrowRight size={16} />}
            >
              Gửi đơn đăng ký
            </Button>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
