import React from "react";
import { Card, CardBody } from "@heroui/react";
import { useTranslation } from "react-i18next";

export default function TopCustomersTable({ rows = [] }) {
  const { t } = useTranslation();
  return (
    <Card radius="xl" shadow="sm">
      <CardBody>
        <h3 className="text-base font-bold mb-3">{t("shop.top_customers")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default-100 text-default-500 text-left">
                <th className="pb-2 pr-3">{t("common.name")}</th>
                <th className="pb-2 pr-3">{t("auth.email")}</th>
                <th className="pb-2 pr-3">{t("common.phone")}</th>
                <th className="pb-2 pr-3 text-right">{t("order.orders")}</th>
                <th className="pb-2 text-right">{t("shop.spending")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {rows.map((r) => (
                <tr key={r.user_id} className="hover:bg-default-50">
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.email}</td>
                  <td className="py-2 pr-3">{r.phone}</td>
                  <td className="py-2 pr-3 text-right">{r.orders}</td>
                  <td className="py-2 text-right">{r.spend.toLocaleString()} ₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
