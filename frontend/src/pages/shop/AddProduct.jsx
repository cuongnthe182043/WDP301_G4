import React from "react";
import { Card, CardBody } from "@heroui/react";
import ProductForm from "../../components/ProductForm";
import { productAdminService as svc } from "../../services/productAdminService";

export default function AddProduct() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Thêm sản phẩm</h1>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-5">
          <ProductForm onSubmit={(d) => svc.create(d)} svc={svc} />
        </CardBody>
      </Card>
    </div>
  );
}
