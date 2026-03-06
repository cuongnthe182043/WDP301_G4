import React, { useEffect, useState } from "react";
import { productService } from "../../services/productService";
import { Card, CardBody, Input, Chip } from "@heroui/react";

export default function LowStockPage() {
  const [rows, setRows] = useState([]);
  const [th,   setTh]   = useState(5);
  useEffect(() => { (async () => setRows(await productService.lowStock(th)))(); }, [th]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-xl font-black text-default-900">Tồn kho thấp</h1>
        <Input size="sm" label="Ngưỡng" type="number" value={String(th)}
          onValueChange={(v) => setTh(Number(v) || 5)} className="w-28" radius="lg" />
      </div>
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-default-50 border-b border-default-100">
              <tr>
                {["SKU", "Thuộc tính", "Tồn kho"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {rows.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-default-400">Không có sản phẩm nào dưới ngưỡng</td></tr>
              ) : rows.map((r) => (
                <tr key={r._id} className="hover:bg-default-50">
                  <td className="px-4 py-3 font-mono text-sm">{r.sku}</td>
                  <td className="px-4 py-3 text-default-500">
                    {Object.entries(r.variant_attributes || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <Chip size="sm" color={r.stock === 0 ? "danger" : "warning"} variant="flat">{r.stock}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
