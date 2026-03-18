import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { productService } from "../../services/productService";
import { sellerCatalogService } from "../../services/sellerCatalogService";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { Card, CardBody, Button, Input, Select, SelectItem, Chip, Pagination } from "@heroui/react";
import { Plus, Download, Upload, Pencil, Layers } from "lucide-react";

function fmt(n) { return Number(n || 0).toLocaleString("vi-VN") + " ₫"; }
const STATUS_COLOR = { active: "success", out_of_stock: "warning", inactive: "default" };

export default function ManageProducts1() {
  const fileRef = useRef(null);
  const [rows,   setRows]   = useState([]);
  const [total,  setTotal]  = useState(0);
  const [q,      setQ]      = useState("");
  const [status, setStatus] = useState(new Set([""]));
  const [cat,    setCat]    = useState(new Set([""]));
  const [page,   setPage]   = useState(1);
  const [cats,   setCats]   = useState([]);
  const LIMIT = 20;

  async function load() {
    const statusVal = Array.from(status)[0] || undefined;
    const catVal    = Array.from(cat)[0]    || undefined;
    const r = await productService.list({ q, status: statusVal, category_id: catVal, page, limit: LIMIT });
    setRows(r.items || []); setTotal(r.total || 0);
  }
  useEffect(() => { (async () => setCats(await sellerCatalogService.listCategories()))(); }, []);
  useEffect(() => { load(); }, [q, status, cat, page]);

  const onImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData(); form.append("file", f);
    await productService.importExcel(form); await load();
  };

  const exportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["name", "slug", "category_id", "brand_id", "base_price", "status", "tags", "images"],
      ["Áo thun", "ao-thun", "<cat-id>", "<brand-id>", 199000, "active", "thun,nam", "https://...;https://..."],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "dfs_product_template.xlsx");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-default-900">Quản lý sản phẩm (Pro)</h1>
        <div className="flex gap-2 flex-wrap">
          <Button as={Link} to="/shop/admin/products/new" size="sm" color="primary" radius="lg" startContent={<Plus size={14} />}>
            Thêm sản phẩm
          </Button>
          <Button size="sm" variant="bordered" radius="lg" startContent={<Download size={14} />} onPress={exportTemplate}>
            Template Excel
          </Button>
          <Button size="sm" variant="bordered" radius="lg" startContent={<Upload size={14} />} onPress={() => fileRef.current?.click()}>
            Import Excel
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <Input size="sm" placeholder="Tìm theo tên..." value={q} onValueChange={setQ} radius="lg" className="w-52" />
        <Select size="sm" label="Trạng thái" selectedKeys={status} onSelectionChange={setStatus} radius="lg" className="w-40">
          <SelectItem key="">Tất cả</SelectItem>
          <SelectItem key="active">Active</SelectItem>
          <SelectItem key="inactive">Inactive</SelectItem>
          <SelectItem key="out_of_stock">Out of stock</SelectItem>
        </Select>
        <Select size="sm" label="Danh mục" selectedKeys={cat} onSelectionChange={setCat} radius="lg" className="w-44">
          <SelectItem key="">Tất cả</SelectItem>
          {cats.map((c) => <SelectItem key={c._id}>{c.name}</SelectItem>)}
        </Select>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-default-50 border-b border-default-100">
              <tr>
                {["Ảnh", "Tên", "Danh mục", "Giá", "Tồn", "Trạng thái", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-default-400">Không có sản phẩm nào</td></tr>
              ) : rows.map((r) => (
                <tr key={r._id} className="hover:bg-default-50">
                  <td className="px-4 py-3">
                    {r.images?.[0]
                      ? <img src={r.images[0]} alt="" className="w-12 h-12 object-cover rounded-xl" />
                      : <div className="w-12 h-12 bg-default-100 rounded-xl" />
                    }
                  </td>
                  <td className="px-4 py-3 font-semibold text-default-900">{r.name}</td>
                  <td className="px-4 py-3 text-default-500">{r.category_name || "-"}</td>
                  <td className="px-4 py-3 font-bold text-primary">{fmt(r.base_price)}</td>
                  <td className="px-4 py-3">{r.stock_total}</td>
                  <td className="px-4 py-3">
                    <Chip size="sm" color={STATUS_COLOR[r.status] || "default"} variant="flat">{r.status}</Chip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button as={Link} to={`/shop/admin/products/${r._id}/edit`} size="sm" variant="bordered" radius="lg" startContent={<Pencil size={13} />}>Sửa</Button>
                      <Button as={Link} to={`/shop/admin/products/${r._id}/variants`} size="sm" variant="bordered" radius="lg" startContent={<Layers size={13} />}>Biến thể</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {total > LIMIT && (
        <div className="flex justify-center">
          <Pagination total={Math.ceil(total / LIMIT)} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}
    </div>
  );
}
