import React from "react";
import { Card, CardBody } from "@heroui/react";
import { useTranslation } from "react-i18next";

export default function SalesProducts() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">{t("admin.sales_products")}</h1>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-12 text-center text-default-400">{t("common.coming_soon")}</CardBody>
      </Card>
    </div>
  );
}
