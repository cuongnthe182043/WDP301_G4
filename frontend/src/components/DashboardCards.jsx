import React from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import { TrendingUp, Truck } from "lucide-react";

export default function DashboardCards({ kpis }) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Card className="flex-1" radius="xl" shadow="sm">
        <CardBody className="flex flex-row items-center gap-4">
          <TrendingUp size={40} className="text-primary" />
          <div>
            <p className="text-xs uppercase text-default-400 tracking-wide">Hôm nay</p>
            <p className="text-2xl font-bold">{(kpis?.todayRevenue || 0).toLocaleString("vi-VN")} ₫</p>
            <Chip size="sm" className="mt-2 bg-primary text-white">Doanh thu</Chip>
          </div>
        </CardBody>
      </Card>

      <Card className="flex-1" radius="xl" shadow="sm">
        <CardBody className="flex flex-row items-center gap-4">
          <Truck size={40} className="text-primary" />
          <div>
            <p className="text-xs uppercase text-default-400 tracking-wide">Đơn đang xử lý</p>
            <p className="text-2xl font-bold">{kpis?.processingOrders || 0}</p>
            <Chip size="sm" className="mt-2 bg-primary text-white">Real-time</Chip>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
