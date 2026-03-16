import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Chip, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea,
} from "@heroui/react";
import { Search, CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import apiClient from "../../services/apiClient";

const STATUS_COLOR = { pending: "warning", active: "success", inactive: "default", out_of_stock: "danger" };
const STATUS_LABEL = { pending: "Chờ duyệt", active: "Đang bán", inactive: "Từ chối", out_of_stock: "Hết hàng" };

const api = {
  list:    (p) => apiClient.get("/admin/products", { params: p }).then(r => r.data.data),
  get:     (id) => apiClient.get(`/admin/products/${id}`).then(r => r.data.data),
  approve: (id) => apiClient.patch(`/admin/products/${id}/approve`).then(r => r.data.data),
  reject:  (id, reason) => apiClient.patch(`/admin/products/${id}/reject`, { reason }).then(r => r.data.data),
};

const LIMIT = 20;

export default function AdminPendingProducts() {
  const [loading,       setLoading]       = useState(true);
  const [products,      setProducts]      = useState([]);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);
  const [query,         setQuery]         = useState("");
  const [detailProd,    setDetailProd]    = useState(null);
  const [rejectTarget,  setRejectTarget]  = useState(null);
  const [rejectReason,  setRejectReason]  = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, status: "pending" };
      if (query.trim()) params.q = query.trim();
      const data = await api.list(params);
      setProducts(data?.items || []);
      setTotal(data?.total   || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try { await api.approve(id); fetch(); }
    catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await api.reject(rejectTarget._id, rejectReason.trim());
      setRejectTarget(null); setRejectReason(""); fetch();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const openDetail = async (p) => {
    try { setDetailProd(await api.get(p._id)); }
    catch { setDetailProd(p); }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900">Sản phẩm chờ duyệt</h1>
            {total > 0 && (
              <Chip size="sm" color="warning" variant="solid" className="text-white">
                {total}
              </Chip>
            )}
          </div>
          <p className="text-sm text-gray-400">Phê duyệt hoặc từ chối sản phẩm mới của người bán</p>
        </div>
        <Input
          size="sm" placeholder="Tìm kiếm sản phẩm..." value={query}
          onValueChange={(v) => setQuery(v)}
          radius="lg" className="w-64"
          startContent={<Search size={14} className="text-gray-400" />}
          isClearable onClear={() => setQuery("")}
        />
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center">
                  <CheckCircle size={28} className="text-success-400" />
                </div>
              </div>
              <p className="text-gray-500 font-medium">Không có sản phẩm nào chờ duyệt</p>
              <p className="text-sm text-gray-400">Tất cả sản phẩm đã được xử lý</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Ảnh", "Sản phẩm", "Shop", "Giá", "Ngày tạo", "Thao tác"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <img
                        src={p.images?.[0] || "/no-image.jpg"} alt={p.name}
                        className="w-14 h-14 object-cover rounded-xl border border-gray-100"
                      />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.category?.name || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{p.shop?.shop_name || "—"}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-600 whitespace-nowrap">
                      {(p.base_price || 0).toLocaleString("vi-VN")}₫
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="bordered" radius="lg" isIconOnly onPress={() => openDetail(p)} title="Xem chi tiết">
                          <Eye size={14} />
                        </Button>
                        <Button
                          size="sm" color="success" variant="flat" radius="lg"
                          startContent={<CheckCircle size={13} />}
                          isLoading={actionLoading}
                          onPress={() => handleApprove(p._id)}
                        >
                          Duyệt
                        </Button>
                        <Button
                          size="sm" color="danger" variant="flat" radius="lg"
                          startContent={<XCircle size={13} />}
                          onPress={() => { setRejectTarget(p); setRejectReason(""); }}
                        >
                          Từ chối
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page <= 1} onPress={() => setPage(p => p - 1)}>← Trước</Button>
          <span className="text-sm text-gray-500 self-center">Trang {page}/{totalPages}</span>
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page >= totalPages} onPress={() => setPage(p => p + 1)}>Sau →</Button>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detailProd} onOpenChange={(o) => !o && setDetailProd(null)} size="2xl" radius="xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => detailProd && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span>{detailProd.name}</span>
                <Chip size="sm" color={STATUS_COLOR[detailProd.status] || "default"} variant="flat">
                  {STATUS_LABEL[detailProd.status] || detailProd.status}
                </Chip>
              </ModalHeader>
              <ModalBody className="space-y-4">
                {detailProd.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {detailProd.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-100" />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Giá bán"     value={`${(detailProd.base_price||0).toLocaleString("vi-VN")}₫`} />
                  <InfoRow label="Tồn kho"     value={detailProd.stock_total ?? 0} />
                  <InfoRow label="Danh mục"    value={detailProd.category?.name || "—"} />
                  <InfoRow label="Thương hiệu" value={detailProd.brand?.name   || "—"} />
                  <InfoRow label="Shop"        value={detailProd.shop?.shop_name || "—"} />
                  <InfoRow label="Xuất xứ"     value={detailProd.detail_info?.origin_country || "—"} />
                </div>
                {detailProd.description && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Mô tả</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailProd.description}</p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="success" variant="flat" radius="lg" startContent={<CheckCircle size={14} />}
                  isLoading={actionLoading} onPress={async () => { await handleApprove(detailProd._id); onClose(); }}>
                  Duyệt
                </Button>
                <Button color="danger" variant="flat" radius="lg" startContent={<XCircle size={14} />}
                  onPress={() => { setDetailProd(null); setRejectTarget(detailProd); setRejectReason(""); }}>
                  Từ chối
                </Button>
                <Button variant="light" onPress={onClose}>Đóng</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Từ chối sản phẩm</ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-500 mb-2">
                  Từ chối sản phẩm <strong className="text-gray-800">"{rejectTarget?.name}"</strong>. Lý do sẽ hiển thị cho người bán.
                </p>
                <Textarea
                  isRequired label="Lý do từ chối" placeholder="VD: Hình ảnh không đạt yêu cầu, thiếu mô tả..."
                  value={rejectReason} onValueChange={setRejectReason}
                  radius="lg" minRows={3}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Hủy</Button>
                <Button
                  color="danger" radius="lg"
                  isDisabled={!rejectReason.trim()}
                  onPress={async () => { await handleReject(); onClose(); }}
                  isLoading={actionLoading}
                >
                  Xác nhận từ chối
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}
