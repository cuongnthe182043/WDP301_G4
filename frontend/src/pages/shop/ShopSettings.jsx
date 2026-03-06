import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card, CardBody, CardHeader, Input, Textarea, Button, Avatar,
  Divider, Chip,
} from "@heroui/react";
import { Store, Camera, Save, ExternalLink } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import { getMyShop, updateMyShop } from "../../services/shopService";
import { Link } from "react-router-dom";

const STATUS_COLOR = { pending: "warning", approved: "success", suspended: "danger" };
const STATUS_LABEL = { pending: "Đang chờ duyệt", approved: "Đang hoạt động", suspended: "Đã tạm khóa" };

export default function ShopSettings() {
  const { toast } = useToast();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shop_name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    shop_logo: "",
    banner_url: "",
  });

  useEffect(() => {
    getMyShop()
      .then((data) => {
        setShop(data);
        if (data) {
          setForm({
            shop_name: data.shop_name || "",
            description: data.description || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            shop_logo: data.shop_logo || "",
            banner_url: data.banner_url || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSave = async () => {
    if (!form.shop_name.trim()) {
      toast.error("Tên shop không được để trống");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyShop(form);
      setShop(updated);
      toast.success("Đã lưu thông tin shop");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
        <Store size={40} className="text-gray-300" />
        <p>Bạn chưa có shop. <Link to="/register-shop" className="text-blue-500 hover:underline">Đăng ký ngay</Link></p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Cài đặt shop</h1>
        <div className="flex items-center gap-2">
          <Chip color={STATUS_COLOR[shop.status] || "default"} variant="flat" size="sm">
            {STATUS_LABEL[shop.status] || shop.status}
          </Chip>
          {shop.status === "approved" && (
            <Link to={`/shops/${shop.shop_slug}`} target="_blank">
              <Button size="sm" variant="bordered" radius="lg" endContent={<ExternalLink size={13} />}>
                Xem shop
              </Button>
            </Link>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Avatar & Banner */}
        <Card radius="xl" shadow="sm">
          <CardHeader className="px-5 pt-5 pb-0">
            <h3 className="font-bold text-gray-800">Hình ảnh shop</h3>
          </CardHeader>
          <CardBody className="p-5 flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar
                src={form.shop_logo}
                name={form.shop_name?.charAt(0)}
                className="w-24 h-24 text-2xl border-2 border-gray-200"
              />
              <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer">
                <Camera size={12} />
              </div>
            </div>
            <Input
              label="URL Logo shop"
              placeholder="https://example.com/logo.png"
              value={form.shop_logo}
              onValueChange={set("shop_logo")}
              variant="bordered"
              radius="lg"
              size="sm"
            />
            <Divider />
            <div
              className="w-full h-20 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 bg-cover bg-center flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
              style={form.banner_url ? { backgroundImage: `url(${form.banner_url})` } : {}}
            >
              {!form.banner_url && <Camera size={20} className="text-white opacity-60" />}
            </div>
            <Input
              label="URL Banner"
              placeholder="https://example.com/banner.png"
              value={form.banner_url}
              onValueChange={set("banner_url")}
              variant="bordered"
              radius="lg"
              size="sm"
            />
          </CardBody>
        </Card>

        {/* Right: Info form */}
        <Card radius="xl" shadow="sm" className="lg:col-span-2">
          <CardHeader className="px-5 pt-5 pb-0">
            <h3 className="font-bold text-gray-800">Thông tin shop</h3>
          </CardHeader>
          <CardBody className="p-5 flex flex-col gap-4">
            <Input
              label="Tên shop *"
              value={form.shop_name}
              onValueChange={set("shop_name")}
              variant="bordered"
              radius="lg"
            />
            <Textarea
              label="Mô tả shop"
              value={form.description}
              onValueChange={set("description")}
              variant="bordered"
              radius="lg"
              minRows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Số điện thoại"
                value={form.phone}
                onValueChange={set("phone")}
                variant="bordered"
                radius="lg"
              />
              <Input
                label="Email"
                value={form.email}
                onValueChange={set("email")}
                variant="bordered"
                radius="lg"
              />
            </div>
            <Input
              label="Địa chỉ shop"
              value={form.address}
              onValueChange={set("address")}
              variant="bordered"
              radius="lg"
            />

            {shop.status !== "approved" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                Shop chưa được duyệt. Thông tin sẽ được lưu nhưng shop chưa hoạt động công khai.
              </div>
            )}

            <div className="flex justify-end">
              <Button
                color="primary"
                radius="lg"
                isLoading={saving}
                onPress={handleSave}
                startContent={!saving && <Save size={16} />}
                className="font-bold"
              >
                Lưu thay đổi
              </Button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Shop slug info */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Địa chỉ shop</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Shop của bạn có thể được truy cập tại:{" "}
                <span className="text-blue-600 font-mono">/shops/{shop.shop_slug}</span>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
