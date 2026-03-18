import React from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import { TrendingUp, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function DashboardCards({ kpis }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Card className="flex-1" radius="xl" shadow="sm">
        <CardBody className="flex flex-row items-center gap-4">
          <TrendingUp size={40} className="text-primary" />
          <div>
            <p className="text-xs uppercase text-default-400 tracking-wide">{t("shop.today")}</p>
            <p className="text-2xl font-bold">{(kpis?.todayRevenue || 0).toLocaleString()} ₫</p>
            <Chip size="sm" className="mt-2 bg-primary text-white">{t("shop.revenue")}</Chip>
          </div>
        </CardBody>
      </Card>

      <Card className="flex-1" radius="xl" shadow="sm">
        <CardBody className="flex flex-row items-center gap-4">
          <Truck size={40} className="text-primary" />
          <div>
            <p className="text-xs uppercase text-default-400 tracking-wide">{t("shop.processing_orders")}</p>
            <p className="text-2xl font-bold">{kpis?.processingOrders || 0}</p>
            <Chip size="sm" className="mt-2 bg-primary text-white">Real-time</Chip>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
