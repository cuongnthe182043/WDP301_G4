import React from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardBody } from "@heroui/react";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center p-4" style={{ background: "linear-gradient(180deg,#f6fbff 0%,#fff 100%)" }}>
      <Card radius="xl" shadow="sm" className="max-w-sm w-full">
        <CardBody className="p-10 text-center flex flex-col items-center gap-4">
          <SearchX size={56} className="text-default-300" />
          <h1 className="text-7xl font-black text-primary">404</h1>
          <p className="text-default-500">Không tìm thấy trang bạn yêu cầu.</p>
          <Button as={Link} to="/" color="primary" radius="lg" startContent={<Home size={15} />}>
            Về trang chủ
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
