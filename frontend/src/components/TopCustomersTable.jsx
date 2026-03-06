import React from "react";
import { Card, CardBody } from "@heroui/react";

export default function TopCustomersTable({ rows = [] }) {
  return (
    <Card radius="xl" shadow="sm">
      <CardBody>
        <h3 className="text-base font-bold mb-3">Top khách hàng VIP</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default-100 text-default-500 text-left">
                <th className="pb-2 pr-3">Tên</th>
                <th className="pb-2 pr-3">Email</th>
                <th className="pb-2 pr-3">Điện thoại</th>
                <th className="pb-2 pr-3 text-right">Đơn</th>
                <th className="pb-2 text-right">Chi tiêu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {rows.map((r) => (
                <tr key={r.user_id} className="hover:bg-default-50">
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.email}</td>
                  <td className="py-2 pr-3">{r.phone}</td>
                  <td className="py-2 pr-3 text-right">{r.orders}</td>
                  <td className="py-2 text-right">{r.spend.toLocaleString("vi-VN")} ₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
