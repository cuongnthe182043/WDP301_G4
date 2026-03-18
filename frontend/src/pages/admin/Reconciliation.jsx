import React from "react";
import { Card, CardBody } from "@heroui/react";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Reconciliation() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">{t("admin.reconciliation")}</h1>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-12 flex flex-col items-center gap-3 text-center">
          <BarChart3 size={48} className="text-default-300" />
          <p className="text-default-500">{t("common.coming_soon")}</p>
        </CardBody>
      </Card>
    </div>
  );
}
