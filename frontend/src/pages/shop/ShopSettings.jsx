import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Card, CardBody, CardHeader, Input, Textarea, Button, Avatar,
  Divider, Chip, Select, SelectItem, Spinner,
} from "@heroui/react";
import { Store, Camera, Save, ExternalLink, Truck, MapPin } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import {
  getMyShop, updateMyShop,
  getPickupAddress, updatePickupAddress,
  ghnGetProvinces, ghnGetDistricts, ghnGetWards,
} from "../../services/shopService";
import { Link } from "react-router-dom";

const STATUS_COLOR = { pending: "warning", approved: "success", suspended: "danger" };

export default function ShopSettings() {
  const { t } = useTranslation();
  const toast = useToast();
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

  // ── GHN pickup address state ──────────────────────────────────────────────
  const [pickup,        setPickup]        = useState({ name: "", phone: "", address: "", province_id: "", province_name: "", district_id: "", district_name: "", ward_code: "", ward_name: "" });
  const [savingPickup,  setSavingPickup]  = useState(false);
  const [provinces,     setProvinces]     = useState([]);
  const [districts,     setDistricts]     = useState([]);
  const [wards,         setWards]         = useState([]);
  const [loadingDist,   setLoadingDist]   = useState(false);
  const [loadingWard,   setLoadingWard]   = useState(false);

  useEffect(() => {
    ghnGetProvinces().then(setProvinces).catch(() => {});
    getPickupAddress().then((d) => {
      if (d && d.district_id) setPickup(d);
    }).catch(() => {});
  }, []);

  const handleProvinceChange = async (keys) => {
    const pid = Number([...keys][0]);
    const prov = provinces.find((p) => p.ProvinceID === pid);
    setPickup((p) => ({ ...p, province_id: pid, province_name: prov?.ProvinceName || "", district_id: "", district_name: "", ward_code: "", ward_name: "" }));
    setDistricts([]); setWards([]);
    if (!pid) return;
    setLoadingDist(true);
    try { setDistricts(await ghnGetDistricts(pid)); } finally { setLoadingDist(false); }
  };

  const handleDistrictChange = async (keys) => {
    const did = Number([...keys][0]);
    const dist = districts.find((d) => d.DistrictID === did);
    setPickup((p) => ({ ...p, district_id: did, district_name: dist?.DistrictName || "", ward_code: "", ward_name: "" }));
    setWards([]);
    if (!did) return;
    setLoadingWard(true);
    try { setWards(await ghnGetWards(did)); } finally { setLoadingWard(false); }
  };

  const handleWardChange = (keys) => {
    const wcode = [...keys][0];
    const ward = wards.find((w) => w.WardCode === wcode);
    setPickup((p) => ({ ...p, ward_code: wcode, ward_name: ward?.WardName || "" }));
  };

  const handleSavePickup = async () => {
    setSavingPickup(true);
    try {
      await updatePickupAddress(pickup);
      toast.success("Đã lưu địa chỉ lấy hàng");
    } catch (err) {
      toast.error(err.response?.data?.message || t("common.error"));
    } finally {
      setSavingPickup(false);
    }
  };

  const set = (field) => (val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSave = async () => {
    if (!form.shop_name.trim()) {
      toast.error(t("shop.shop_name_required"));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyShop(form);
      setShop(updated);
      toast.success(t("common.success"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("common.error"));
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
        <p>{t("shop.register_page_title")}. <Link to="/register-shop" className="text-blue-500 hover:underline">{t("shop.register_cta")}</Link></p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">{t("shop.settings")}</h1>
        <div className="flex items-center gap-2">
          <Chip color={STATUS_COLOR[shop.status] || "default"} variant="flat" size="sm">
            {shop.status === "pending" ? t("shop.status_pending") : shop.status === "approved" ? t("shop.status_approved") : t("shop.status_suspended")}
          </Chip>
          {shop.status === "approved" && (
            <Link to={`/shops/${shop.shop_slug}`} target="_blank">
              <Button size="sm" variant="bordered" radius="lg" endContent={<ExternalLink size={13} />}>
                {t("product.view_shop")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Avatar & Banner */}
        <Card radius="xl" shadow="sm">
          <CardHeader className="px-5 pt-5 pb-0">
            <h3 className="font-bold text-gray-800">{t("common.image")}</h3>
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
            <h3 className="font-bold text-gray-800">{t("common.info")}</h3>
          </CardHeader>
          <CardBody className="p-5 flex flex-col gap-4">
            <Input
              label={t("shop.shop_name_label")}
              value={form.shop_name}
              onValueChange={set("shop_name")}
              variant="bordered"
              radius="lg"
            />
            <Textarea
              label={t("shop.description_label")}
              value={form.description}
              onValueChange={set("description")}
              variant="bordered"
              radius="lg"
              minRows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("shop.phone_label")}
                value={form.phone}
                onValueChange={set("phone")}
                variant="bordered"
                radius="lg"
              />
              <Input
                label={t("shop.email_label")}
                value={form.email}
                onValueChange={set("email")}
                variant="bordered"
                radius="lg"
              />
            </div>
            <Input
              label={t("shop.address_label")}
              value={form.address}
              onValueChange={set("address")}
              variant="bordered"
              radius="lg"
            />

            {shop.status !== "approved" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                {t("shop.approval_notice")}
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
                {t("common.save")}
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
              <p className="text-sm font-semibold text-gray-700">{t("shop.address_label")}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="text-blue-600 font-mono">/shops/{shop.shop_slug}</span>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* GHN Pickup Address */}
      <Card radius="xl" shadow="sm">
        <CardHeader className="px-5 pt-5 pb-0 flex items-center gap-2">
          <Truck size={16} className="text-primary" />
          <h3 className="font-bold text-gray-800">Địa chỉ lấy hàng GHN</h3>
          {pickup.ward_code && (
            <Chip size="sm" color="success" variant="flat" className="ml-auto">Đã cấu hình</Chip>
          )}
          {!pickup.ward_code && (
            <Chip size="sm" color="warning" variant="flat" className="ml-auto">Chưa cấu hình</Chip>
          )}
        </CardHeader>
        <CardBody className="p-5 flex flex-col gap-4">
          <p className="text-xs text-gray-400">
            Địa chỉ này được gửi tới GHN làm điểm lấy hàng cho mỗi đơn vận chuyển. Mỗi shop cần cấu hình riêng.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Tên người liên hệ" placeholder="Nguyễn Văn A"
              value={pickup.name}
              onValueChange={(v) => setPickup((p) => ({ ...p, name: v }))}
              variant="bordered" radius="lg"
            />
            <Input
              label="Số điện thoại" placeholder="0912345678"
              value={pickup.phone}
              onValueChange={(v) => setPickup((p) => ({ ...p, phone: v }))}
              variant="bordered" radius="lg"
            />
          </div>

          <Input
            label="Số nhà, tên đường" placeholder="123 Đường ABC"
            value={pickup.address}
            onValueChange={(v) => setPickup((p) => ({ ...p, address: v }))}
            variant="bordered" radius="lg"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Province */}
            <Select
              label="Tỉnh / Thành phố"
              selectedKeys={pickup.province_id ? new Set([String(pickup.province_id)]) : new Set()}
              onSelectionChange={handleProvinceChange}
              variant="bordered" radius="lg"
              isDisabled={provinces.length === 0}
            >
              {provinces.map((p) => (
                <SelectItem key={String(p.ProvinceID)}>{p.ProvinceName}</SelectItem>
              ))}
            </Select>

            {/* District */}
            <Select
              label="Quận / Huyện"
              selectedKeys={pickup.district_id ? new Set([String(pickup.district_id)]) : new Set()}
              onSelectionChange={handleDistrictChange}
              variant="bordered" radius="lg"
              isDisabled={!pickup.province_id || loadingDist}
              startContent={loadingDist ? <Spinner size="sm" /> : null}
            >
              {districts.map((d) => (
                <SelectItem key={String(d.DistrictID)}>{d.DistrictName}</SelectItem>
              ))}
            </Select>

            {/* Ward */}
            <Select
              label="Phường / Xã"
              selectedKeys={pickup.ward_code ? new Set([pickup.ward_code]) : new Set()}
              onSelectionChange={handleWardChange}
              variant="bordered" radius="lg"
              isDisabled={!pickup.district_id || loadingWard}
              startContent={loadingWard ? <Spinner size="sm" /> : null}
            >
              {wards.map((w) => (
                <SelectItem key={w.WardCode}>{w.WardName}</SelectItem>
              ))}
            </Select>
          </div>

          {pickup.ward_code && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin size={12} />
              <span>{[pickup.address, pickup.ward_name, pickup.district_name, pickup.province_name].filter(Boolean).join(", ")}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              color="primary" radius="lg"
              isLoading={savingPickup}
              onPress={handleSavePickup}
              isDisabled={!pickup.ward_code}
              startContent={!savingPickup && <Save size={16} />}
              className="font-bold"
            >
              Lưu địa chỉ lấy hàng
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
