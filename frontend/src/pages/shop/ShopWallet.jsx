import React from "react";
import { Card, CardBody } from "@heroui/react";
import { Wallet } from "lucide-react";

export default function ShopWallet() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Ví cửa hàng</h1>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-12 flex flex-col items-center gap-3 text-center">
          <Wallet size={48} className="text-default-300" />
          <p className="text-default-500">Chức năng ví sắp ra mắt.</p>
        </CardBody>
      </Card>
    </div>
  );
}
