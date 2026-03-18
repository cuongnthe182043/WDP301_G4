import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Button } from "@heroui/react";
import { Tag, Zap, Image, Megaphone, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ManageMarketing() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const ITEMS = [
    { icon: Tag,       labelKey: "shop.vouchers",         descKey: "shop.manage_vouchers",   to: "/shop/marketing/vouchers" },
    { icon: Zap,       labelKey: "shop.manage_flashsale", descKey: "shop.manage_flashsale",  to: "/shop/marketing/flashsale" },
    { icon: Image,     labelKey: "shop.manage_banner",    descKey: "shop.manage_banner",     to: "/shop/marketing/banners" },
    { icon: Megaphone, labelKey: "shop.manage_campaigns", descKey: "shop.manage_campaigns",  to: "/shop/marketing/campaigns" },
    { icon: Gift,      labelKey: "shop.manage_credits",   descKey: "shop.manage_credits",    to: "/shop/marketing/credits" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">{t("shop.marketing")}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {ITEMS.map(({ icon: Icon, labelKey, descKey, to }) => (
          <Card key={to} isPressable radius="xl" shadow="sm" onPress={() => navigate(to)}>
            <CardBody className="p-6 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-default-900">{t(labelKey)}</p>
                <p className="text-sm text-default-400 mt-0.5">{t(descKey)}</p>
              </div>
              <Button size="sm" color="primary" variant="flat" radius="lg">{t("common.details")}</Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
