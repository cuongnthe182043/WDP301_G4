import React, { useEffect, useState } from "react";
import { sellerCatalogService } from "../../services/sellerCatalogService";
import { Card, CardBody } from "@heroui/react";

export default function CategoriesPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { (async () => setRows(await sellerCatalogService.listCategories()))(); }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Danh mục</h1>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-4">
          <ul className="divide-y divide-default-100">
            {rows.map((r) => (
              <li key={r._id} className="py-2 text-sm text-default-700" style={{ paddingLeft: `${(r.level || 0) * 16 + 8}px` }}>
                {r.level > 0 ? "└ " : ""}{r.name}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
