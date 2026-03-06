import React, { useEffect, useState } from "react";
import { Button, Input, Divider } from "@heroui/react";
import { Trash2, X } from "lucide-react";
import VariantMatrix from "./VariantMatrix";

export default function VariantsDrawer({ open, onClose, productId, svc }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ sku: "", price: "", stock: "", variant_attributes: { size: "", color: "" } });

  useEffect(() => { if (open && productId) svc.listVariants(productId).then(setRows); }, [open, productId]);

  const add = async () => {
    const payload = { ...form, price: Number(form.price || 0), stock: Number(form.stock || 0) };
    const r = await svc.createVariant(productId, payload);
    setRows([r, ...rows]);
    setForm({ sku: "", price: "", stock: "", variant_attributes: { size: "", color: "" } });
  };

  const upd = async (id, patch) => {
    const r = await svc.updateVariant(id, patch);
    setRows(rows.map(x => x._id === id ? r : x));
  };

  const del = async (id) => {
    await svc.removeVariant(id);
    setRows(rows.filter(x => x._id !== id));
  };

  const generateBulk = async (bulkRows) => {
    await svc.createVariantsBulk(productId, bulkRows);
    setRows(await svc.listVariants(productId));
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white shadow-xl z-50 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Phiên bản</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-default-100 text-default-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ma trận biến thể 2 trục */}
        <VariantMatrix onGenerate={generateBulk} />
        <Divider />

        {/* Thêm nhanh 1 dòng */}
        <div className="space-y-2">
          <Input size="sm" label="SKU" value={form.sku} onValueChange={v => setForm({ ...form, sku: v })} />
          <Input size="sm" label="Giá" value={form.price} onValueChange={v => setForm({ ...form, price: v })} />
          <Input size="sm" label="Tồn" value={form.stock} onValueChange={v => setForm({ ...form, stock: v })} />
          <div className="flex gap-2">
            <Input
              size="sm"
              label="Size"
              value={form.variant_attributes.size}
              onValueChange={v => setForm({ ...form, variant_attributes: { ...form.variant_attributes, size: v } })}
            />
            <Input
              size="sm"
              label="Màu"
              value={form.variant_attributes.color}
              onValueChange={v => setForm({ ...form, variant_attributes: { ...form.variant_attributes, color: v } })}
            />
          </div>
          <Button variant="bordered" size="sm" onPress={add}>Thêm 1 biến thể</Button>
        </div>
        <Divider />

        {/* Danh sách hiện có */}
        <div className="space-y-2">
          {rows.map(v => (
            <div key={v._id} className="flex gap-2 items-center">
              <Input size="sm" label="SKU" value={v.sku} onValueChange={val => upd(v._id, { sku: val })} />
              <Input size="sm" label="Giá" value={String(v.price)} onValueChange={val => upd(v._id, { price: Number(val || 0) })} />
              <Input size="sm" label="Tồn" value={String(v.stock)} onValueChange={val => upd(v._id, { stock: Number(val || 0) })} />
              <button
                className="p-1 rounded-lg text-danger hover:bg-danger-50 flex-shrink-0"
                onClick={() => del(v._id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
