import React from "react";
import { Card, CardBody } from "@heroui/react";
import { Key } from "lucide-react";

export default function ApiKeyManager() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Quản lý API Key</h1>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-12 flex flex-col items-center gap-3 text-center">
          <Key size={48} className="text-default-300" />
          <p className="text-default-500">Chức năng đang phát triển.</p>
        </CardBody>
      </Card>
    </div>
  );
}
