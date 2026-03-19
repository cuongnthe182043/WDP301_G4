import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Card, CardBody, CardHeader, Input, Textarea, Button, Chip,
} from "@heroui/react";
import { Store, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import { registerShop, getMyShop } from "../../services/shopService";

export default function RegisterShop() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const STATUS_CONFIG = {
    pending: {
      icon: Clock,
      color: "warning",
      label: t("shop.status_pending"),
      desc: t("shop.status_pending_desc"),
    },
    approved: {
      icon: CheckCircle,
      color: "success",
      label: t("shop.status_approved"),
      desc: t("shop.status_approved_desc"),
    },
    suspended: {
      icon: XCircle,
      color: "danger",
      label: t("shop.status_suspended"),
      desc: t("shop.status_suspended_desc"),
    },
  };

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
      toast.error(t("shop.shop_name_required"));
      return;
    }
    setLoading(true);
    try {
      const result = await registerShop(form);
      toast.success(result.message || t("shop.register_success"));
      setExistingShop(result.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t("shop.register_failed"));
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
                  {t("shop.rejection_reason")} {existingShop.rejection_reason}
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
                  {t("shop.go_to_dashboard")}
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
                <h1 className="text-xl font-black text-gray-900">{t("shop.register_page_title")}</h1>
                <p className="text-sm text-gray-500">{t("shop.register_page_subtitle")}</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-6 py-5 flex flex-col gap-4">
            <Input
              label={t("shop.shop_name_label")}
              placeholder={t("shop.shop_name_placeholder")}
              value={form.shop_name}
              onValueChange={set("shop_name")}
              radius="lg"
              variant="bordered"
            />
            <Textarea
              label={t("shop.description_label")}
              placeholder={t("shop.description_placeholder")}
              value={form.description}
              onValueChange={set("description")}
              radius="lg"
              variant="bordered"
              minRows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("shop.phone_label")}
                placeholder="0901234567"
                value={form.phone}
                onValueChange={set("phone")}
                radius="lg"
                variant="bordered"
              />
              <Input
                label={t("shop.email_label")}
                placeholder="shop@example.com"
                value={form.email}
                onValueChange={set("email")}
                radius="lg"
                variant="bordered"
              />
            </div>
            <Input
              label={t("shop.address_label")}
              placeholder={t("shop.address_placeholder")}
              value={form.address}
              onValueChange={set("address")}
              radius="lg"
              variant="bordered"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
              {t("shop.approval_notice")}
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
              {t("shop.submit_application")}
            </Button>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
