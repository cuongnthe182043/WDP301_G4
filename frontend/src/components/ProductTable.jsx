import React, { useEffect, useState } from "react";
import { Input, Button, Pagination } from "@heroui/react";
import { Search, Pencil, Trash2, Layers } from "lucide-react";

export default function ProductTable({ svc, onEdit, onVariants }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const load = async (p = 1) => {
    const r = await svc.list({ q, page: p, limit });
    setRows(r.items); setTotal(r.total); setPage(r.page);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Tìm theo tên"
          size="sm"
          value={q}
          onValueChange={setQ}
          startContent={<Search size={15} />}
        />
        <Button size="sm" variant="bordered" onPress={() => load(1)}>Lọc</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default-100 text-default-500 text-left">
              <th className="pb-2 pr-3">Tên</th>
              <th className="pb-2 pr-3">Giá</th>
              <th className="pb-2 pr-3">Tồn</th>
              <th className="pb-2 pr-3">Danh mục</th>
              <th className="pb-2 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default-100">
            {rows.map(p => (
              <tr key={p._id} className="hover:bg-default-50">
                <td className="py-2 pr-3">{p.name}</td>
                <td className="py-2 pr-3">{Number(p.price || 0).toLocaleString("vi-VN")} ₫</td>
                <td className="py-2 pr-3">{p.stock_total || 0}</td>
                <td className="py-2 pr-3">{p.category_name || "-"}</td>
                <td className="py-2 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="light" startContent={<Layers size={13} />} onPress={() => onVariants(p)}>
                      Phiên bản
                    </Button>
                    <button className="p-1 rounded-lg text-primary hover:bg-primary-50" onClick={() => onEdit(p)}>
                      <Pencil size={15} />
                    </button>
                    <button
                      className="p-1 rounded-lg text-danger hover:bg-danger-50"
                      onClick={() => svc.remove(p._id).then(() => load(page))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <Pagination
          total={Math.max(1, Math.ceil(total / limit))}
          page={page}
          onChange={(v) => { setPage(v); load(v); }}
        />
      </div>
    </div>
  );
}
