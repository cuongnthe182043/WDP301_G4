import React, { useEffect, useState } from "react";
import { sellerCatalogService } from "../../services/sellerCatalogService";
import { Card, CardBody } from "@heroui/react";

export default function AttributesPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { (async () => setRows(await sellerCatalogService.listAttributes()))(); }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Thuộc tính</h1>
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
