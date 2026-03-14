import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Button } from "@heroui/react";
import { Tag, Zap, Image } from "lucide-react";

const ITEMS = [
  { icon: Tag,   label: "Voucher",    desc: "Tạo mã giảm giá cho đơn hàng",       to: "/shop/marketing/vouchers" },
  { icon: Zap,   label: "Flash Sale", desc: "Tạo chương trình giảm giá có thời hạn", to: "/shop/marketing/flashsale" },
  { icon: Image, label: "Banner",     desc: "Quản lý ảnh banner quảng cáo",         to: "/shop/marketing/banners" },
];

export default function ManageMarketing() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Marketing</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ITEMS.map(({ icon: Icon, label, desc, to }) => (
          <Card key={to} isPressable radius="xl" shadow="sm" onPress={() => navigate(to)}>
            <CardBody className="p-6 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-default-900">{label}</p>
                <p className="text-sm text-default-400 mt-0.5">{desc}</p>
              </div>
              <Button size="sm" color="primary" variant="flat" radius="lg">Quản lý</Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
