import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { productAdminService as svc } from "../../services/productAdminService";
import {
  Card, CardBody, Button, Input, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import { Search, Pencil, Trash2, Plus, Layers, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";

const STATUS_COLOR = {
  active:       "success",
  pending:      "warning",
  inactive:     "default",
  out_of_stock: "danger",
};

const STATUS_LABEL = {
  active:       "Đang bán",
  pending:      "Chờ duyệt",
  inactive:     "Ẩn / Từ chối",
  out_of_stock: "Hết hàng",
};

const STATUS_OPTS = [
  { key: "all",          label: "Tất cả" },
  { key: "active",       label: "Đang bán" },
  { key: "pending",      label: "Chờ duyệt" },
  { key: "inactive",     label: "Ẩn / Từ chối" },
  { key: "out_of_stock", label: "Hết hàng" },
];

export default function ManageProducts() {
  const navigate   = useNavigate();
  const importRef  = useRef(null);

  const [loading,       setLoading]       = useState(true);
  const [products,      setProducts]      = useState([]);
  const [total,         setTotal]         = useState(0);
  const [query,         setQuery]         = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [page,          setPage]          = useState(1);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  // import state
  const [importing,     setImporting]     = useState(false);
  const [importResult,  setImportResult]  = useState(null); // { inserted, errors, items }
  const [showImport,    setShowImport]    = useState(false);

  const LIMIT = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (query.trim())           params.q      = query.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await svc.list(params);
      setProducts(data?.items || []);
      setTotal(data?.total   || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, query, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchProducts(); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleDelete = async () => {
    try {
      await svc.remove(deleteTarget._id);
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Excel import ─────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const blob = await svc.downloadTemplate();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "product_import_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setImportResult({ error: "Chỉ chấp nhận file .xlsx hoặc .xls" });
      setShowImport(true);
      return;
    }

    setImporting(true);
    setShowImport(true);
    setImportResult(null);
    try {
      const result = await svc.importExcel(file);
      setImportResult(result);
      fetchProducts();
    } catch (err) {
      setImportResult({ error: err?.response?.data?.message || err.message || "Import thất bại" });
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">Quản lý sản phẩm</h1>
          <p className="text-sm text-default-400">
            {total} sản phẩm · Xem và quản lý toàn bộ sản phẩm trong kho
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            size="sm" radius="lg" className="w-40"
            selectedKeys={new Set([statusFilter])}
            onSelectionChange={(k) => { setStatusFilter(Array.from(k)[0] || "all"); setPage(1); }}
            aria-label="Lọc trạng thái"
          >
            {STATUS_OPTS.map((o) => <SelectItem key={o.key}>{o.label}</SelectItem>)}
          </Select>
          <Input
            size="sm" placeholder="Tìm kiếm sản phẩm..." value={query}
            onValueChange={(v) => { setQuery(v); setPage(1); }}
            radius="lg" className="w-56"
            startContent={<Search size={14} className="text-default-400" />}
            isClearable onClear={() => { setQuery(""); setPage(1); }}
          />
          {/* Import Excel */}
          <Button
            size="sm" variant="bordered" radius="lg"
            startContent={<Download size={14} />}
            onPress={handleDownloadTemplate}
            title="Tải template Excel"
          >
            Template
          </Button>
          <Button
            as="label"
            size="sm" color="secondary" variant="flat" radius="lg"
            startContent={importing ? <Spinner size="sm" /> : <Upload size={14} />}
            className="cursor-pointer"
            isDisabled={importing}
          >
            {importing ? "Đang nhập..." : "Nhập Excel"}
            <input ref={importRef} hidden accept=".xlsx,.xls" type="file" onChange={handleImportFile} />
          </Button>
          <Button
            color="primary" size="sm" radius="lg"
            startContent={<Plus size={14} />}
            onPress={() => navigate("/shop/admin/products/new")}
          >
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-default-400">
              Không tìm thấy sản phẩm phù hợp
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Ảnh", "Tên sản phẩm", "Giá", "Tồn kho", "Trạng thái", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-default-50 transition-colors">
                    <td className="px-4 py-3">
                      <img
                        src={p.images?.[0] || "/no-image.jpg"} alt={p.name}
                        className="w-14 h-14 object-cover rounded-xl"
                      />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-semibold text-default-900 truncate">{p.name}</p>
                      <p className="text-xs text-default-400 truncate">{p.category_name || "—"}</p>
                      {p.rejection_reason && (
                        <p className="text-xs text-danger mt-0.5 truncate">
                          Lý do từ chối: {p.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">
                      {(p.base_price || 0).toLocaleString("vi-VN")}₫
                    </td>
                    <td className="px-4 py-3">{p.stock_total ?? 0}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={STATUS_COLOR[p.status] || "default"} variant="flat">
                        {STATUS_LABEL[p.status] || p.status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Layers size={13} />}
                          onPress={() => navigate(`/shop/admin/products/${p._id}/variants`)}
                        >
                          Biến thể
                        </Button>
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Pencil size={13} />}
                          onPress={() => navigate(`/shop/admin/products/${p._id}`)}
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm" color="danger" variant="bordered" radius="lg"
                          startContent={<Trash2 size={13} />}
                          onPress={() => setDeleteTarget(p)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page <= 1} onPress={() => setPage(p => p - 1)}>
            ← Trước
          </Button>
          <span className="text-sm text-default-500 self-center">Trang {page}/{totalPages}</span>
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page >= totalPages} onPress={() => setPage(p => p + 1)}>
            Sau →
          </Button>
        </div>
      )}

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Xác nhận xóa sản phẩm</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500">
                  Bạn có chắc chắn muốn xóa sản phẩm{" "}
                  "<strong className="text-default-900">{deleteTarget?.name}</strong>"?
                  Tất cả biến thể cũng sẽ bị xóa.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Hủy</Button>
                <Button color="danger" onPress={async () => { await handleDelete(); onClose(); }}>Xóa</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Import result modal */}
      <Modal isOpen={showImport} onOpenChange={(o) => !o && setShowImport(false)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-secondary" />
                Kết quả nhập Excel
              </ModalHeader>
              <ModalBody>
                {importing ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <Spinner size="lg" />
                    <p className="text-sm text-default-500">Đang xử lý file...</p>
                  </div>
                ) : importResult?.error ? (
                  <div className="flex items-start gap-3 p-4 bg-danger-50 border border-danger-200 rounded-xl">
                    <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-danger">Lỗi import</p>
                      <p className="text-xs text-danger-600 mt-0.5">{importResult.error}</p>
                    </div>
                  </div>
                ) : importResult ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-success-50 border border-success-200 rounded-xl">
                      <CheckCircle size={18} className="text-success-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-success-700">Import thành công</p>
                        <p className="text-xs text-success-600 mt-0.5">
                          Đã tạo <strong>{importResult.inserted}</strong> sản phẩm mới (trạng thái: Chờ duyệt)
                        </p>
                      </div>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-warning-700">
                          {importResult.errors.length} dòng bị bỏ qua:
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {importResult.errors.map((e, i) => (
                            <p key={i} className="text-xs text-warning-600 bg-warning-50 px-3 py-1.5 rounded-lg">
                              {e}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" radius="lg" onPress={onClose} isDisabled={importing}>
                  {importing ? "Đang xử lý..." : "Đóng"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
