import React, { useEffect, useState } from "react";
import { sellerCatalogService } from "../../services/sellerCatalogService";
import { Card, CardBody } from "@heroui/react";

export default function BrandsPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { (async () => setRows(await sellerCatalogService.listBrands()))(); }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Thương hiệu</h1>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-4">
          <ul className="divide-y divide-default-100">
            {rows.map((r) => <li key={r._id} className="py-2 text-sm text-default-700">{r.name}</li>)}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
