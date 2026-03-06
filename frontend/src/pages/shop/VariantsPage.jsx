import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { variantService } from "../../services/variantService";
import { productService } from "../../services/productService";
import { Card, CardBody, Button, Input } from "@heroui/react";

function genSku(slug, c, s) {
  const a = (slug || "PROD").slice(0, 6).toUpperCase();
  return `${a}-${(c || "").slice(0, 1)}${(s || "").slice(0, 2)}`.replace(/\s/g, "");
}
function fmt(n) { return Number(n || 0).toLocaleString("vi-VN") + " ₫"; }

export default function VariantsPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [rows,    setRows]    = useState([]);
  const [color,   setColor]   = useState("Đen,Trắng,Xanh");
  const [size,    setSize]    = useState("S,M,L,XL");

  async function load() {
    const p = await productService.get(id);
    setProduct(p);
    const v = await variantService.list(id);
    setRows(v);
  }
  useEffect(() => { load(); }, [id]);

  const onBulkCreate = async () => {
    const colors = color.split(",").map((s) => s.trim()).filter(Boolean);
    const sizes  = size.split(",").map((s) => s.trim()).filter(Boolean);
    const items  = [];
    for (const c of colors) for (const s of sizes) {
      items.push({ sku: genSku(product?.slug, c, s), price: product?.base_price || 0, stock: 0, variant_attributes: { color: c, size: s } });
    }
    await variantService.bulk(id, items);
    await load();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-default-900">Biến thể: {product?.name}</h1>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-4">
          <h3 className="font-bold text-default-800 mb-3">Tạo ma trận biến thể</h3>
          <div className="flex gap-3 flex-wrap items-end">
            <Input size="sm" label="Màu (phẩy)" value={color} onValueChange={setColor} radius="lg" className="flex-1 min-w-40" />
            <Input size="sm" label="Size (phẩy)" value={size} onValueChange={setSize} radius="lg" className="flex-1 min-w-40" />
            <Button color="primary" size="sm" radius="lg" onPress={onBulkCreate}>Tạo ma trận</Button>
          </div>
        </CardBody>
      </Card>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-default-50 border-b border-default-100">
              <tr>
                {["SKU", "Màu", "Size", "Giá", "Tồn kho", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-default-400">Chưa có biến thể nào</td></tr>
              ) : rows.map((v) => {
                const va = Object.fromEntries(Object.entries(v.variant_attributes || {}));
                return (
                  <tr key={v._id} className="hover:bg-default-50">
                    <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
                    <td className="px-4 py-3">{va.color || "-"}</td>
                    <td className="px-4 py-3">{va.size || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(v.price)}</td>
                    <td className="px-4 py-3">{v.stock}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" color="danger" variant="light" radius="lg"
                        onPress={async () => { await variantService.remove(v._id); await load(); }}>
                        Xoá
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
