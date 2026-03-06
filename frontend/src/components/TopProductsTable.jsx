import React from "react";
import { Card, CardBody } from "@heroui/react";

export default function TopProductsTable({ rows = [] }) {
  return (
    <Card radius="xl" shadow="sm">
      <CardBody>
        <h3 className="text-base font-bold mb-3">Top sản phẩm bán chạy</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default-100 text-default-500 text-left">
                <th className="pb-2 pr-3">Sản phẩm</th>
                <th className="pb-2 pr-3 text-right">Số lượng</th>
                <th className="pb-2 text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {rows.map((r) => (
                <tr key={r.product_id} className="hover:bg-default-50">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={r.image}
                        alt={r.name}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      />
                      <span>{r.name}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right">{r.qty}</td>
                  <td className="py-2 text-right">{r.revenue.toLocaleString("vi-VN")} ₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
