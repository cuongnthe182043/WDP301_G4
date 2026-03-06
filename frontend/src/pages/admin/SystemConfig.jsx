import React from "react";
import { Card, CardBody } from "@heroui/react";
import { Settings } from "lucide-react";

export default function SystemConfig() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Cấu hình hệ thống</h1>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-12 flex flex-col items-center gap-3 text-center">
          <Settings size={48} className="text-default-300" />
          <p className="text-default-500">Chức năng đang phát triển.</p>
        </CardBody>
      </Card>
    </div>
  );
}
