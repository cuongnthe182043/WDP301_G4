import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { productService } from "../../services/productService";
import { Card, CardBody, Input, Chip, Button, Spinner, Pagination } from "@heroui/react";
import { AlertTriangle, Search, Pencil, RefreshCw, Package } from "lucide-react";

export default function LowStockPage() {
  const nav = useNavigate();

  const [rows,       setRows]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [threshold,  setThreshold]  = useState(5);
  const [input,      setInput]      = useState("5");
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async (pg = page, th = threshold) => {
    setLoading(true);
    try {
      const data = await productService.lowStock(th, pg, 20);
      setRows(data?.items || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, threshold]);

  useEffect(() => { load(1, threshold); }, [threshold]);

  const applyThreshold = () => {
    const n = Math.max(0, parseInt(input) || 0);
    setThreshold(n);
    setPage(1);
  };

  const handlePageChange = (pg) => {
    setPage(pg);
    load(pg, threshold);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900 flex items-center gap-2">
            <AlertTriangle size={20} className="text-warning" />
            Cảnh báo hàng sắp hết
          </h1>
          <p className="text-sm text-default-400 mt-0.5">
            {total > 0
              ? `${total} biến thể có tồn kho ≤ ${threshold}`
              : "Không có biến thể nào cần bổ sung"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-default-500 whitespace-nowrap">Ngưỡng tồn kho:</span>
            <Input
              size="sm"
              type="number"
              min="0"
              value={input}
              onValueChange={setInput}
              onKeyDown={(e) => e.key === "Enter" && applyThreshold()}
              className="w-20"
              radius="lg"
            />
            <Button size="sm" variant="bordered" radius="lg" onPress={applyThreshold}>
              <Search size={14} />
            </Button>
          </div>
          <Button
            size="sm" variant="bordered" radius="lg"
            startContent={loading ? <Spinner size="sm" /> : <RefreshCw size={14} />}
            onPress={() => load(page, threshold)}
            isDisabled={loading}
          >
            Làm mới
          </Button>
        </div>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" color="warning" /></div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-default-300">
              <Package size={48} />
              <p className="text-sm font-medium">Tất cả sản phẩm đều đủ hàng</p>
              <p className="text-xs text-default-400">Không có biến thể nào có tồn kho ≤ {threshold}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Sản phẩm", "SKU", "Thuộc tính", "Tồn kho", "Ngưỡng", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {rows.map((r) => {
                  const product  = r.product;
                  const img      = r.images?.[0] || product?.images?.[0];
                  const name     = product?.name || "Sản phẩm";
                  const attrs    = Object.entries(r.variant_attributes || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ");
                  const isOut    = r.stock === 0;
                  const isCrit   = r.stock <= Math.floor(r.low_stock_threshold / 2);

                  return (
                    <tr key={r._id} className="hover:bg-default-50 transition-colors">
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {img ? (
                            <img
                              src={img}
                              alt={name}
                              className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-default-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-default-100 flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-default-300" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-default-900 truncate max-w-[180px]">{name}</p>
                            {product?.slug && (
                              <p className="text-xs text-default-400 truncate max-w-[180px]">{product.slug}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-default-500">
                          {r.sku || <span className="text-default-300 italic">—</span>}
                        </span>
                      </td>

                      {/* Variant attributes */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-default-600">
                          {attrs || <span className="text-default-300 italic">Mặc định</span>}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3">
                        <Chip
                          size="sm"
                          color={isOut ? "danger" : isCrit ? "danger" : "warning"}
                          variant="flat"
                          className="font-bold"
                        >
                          {isOut ? "Hết hàng" : r.stock}
                        </Chip>
                      </td>

                      {/* Threshold */}
                      <td className="px-4 py-3 text-xs text-default-400">
                        ≤ {r.low_stock_threshold}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        {product?._id && (
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            radius="lg"
                            startContent={<Pencil size={13} />}
                            onPress={() => nav(`/shop/admin/products/${product._id}/variants`)}
                          >
                            Cập nhật
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            total={totalPages}
            page={page}
            onChange={handlePageChange}
            color="warning"
            radius="lg"
          />
        </div>
      )}
    </div>
  );
}
