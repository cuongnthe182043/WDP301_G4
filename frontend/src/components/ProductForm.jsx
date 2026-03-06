import React, { useEffect, useState } from "react";
import { Input, Button, Select, SelectItem } from "@heroui/react";
import MediaUploader from "./MediaUploader";
import CategoryCascader from "./CategoryCascader";

export default function ProductForm({ initial, onSubmit, svc }) {
  const [form, setForm] = useState(initial || { name: "", price: "", category_id: "", brand_id: "", images: [], video: null });
  const [brands, setBrands] = useState([]);
  useEffect(() => { svc.listBrands().then(setBrands); }, []);

  const submit = () => onSubmit({ ...form, price: Number(form.price || 0) });

  return (
    <div className="space-y-4">
      <Input label="Tên sản phẩm" value={form.name} onValueChange={v => setForm({ ...form, name: v })} />
      <Input label="Giá" value={form.price} onValueChange={v => setForm({ ...form, price: v })} />
      <CategoryCascader value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })} svc={svc} />
      <Select
        label="Brand"
        selectedKeys={form.brand_id ? new Set([form.brand_id]) : new Set()}
        onSelectionChange={(k) => setForm({ ...form, brand_id: Array.from(k)[0] || "" })}
      >
        {brands.map(b => <SelectItem key={b._id}>{b.name}</SelectItem>)}
      </Select>
      <MediaUploader
        images={form.images}
        setImages={(imgs) => setForm({ ...form, images: imgs })}
        video={form.video}
        setVideo={(v) => setForm({ ...form, video: v })}
        svc={svc}
      />
      <Button color="primary" onPress={submit}>Lưu</Button>
    </div>
  );
}
