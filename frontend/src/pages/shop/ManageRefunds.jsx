import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Pagination, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner, Textarea, Divider,
} from "@heroui/react";
import { Eye, CheckCircle, XCircle, PackageCheck } from "lucide-react";
import { shopRefundApi } from "../../services/shopManagementService";
import { useToast } from "../../components/common/ToastProvider";
import { formatCurrency } from "../../utils/formatCurrency";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending: "warning", approved: "primary", rejected: "danger", completed: "success",
};
const STATUS_LABELS = {
  pending: "Chờ xử lý", approved: "Đã duyệt", rejected: "Từ chối", completed: "Hoàn tất",
};
const TYPE_COLORS = {
  refund: "secondary", return: "warning", exchange: "primary",
};
const TYPE_LABELS = {
  refund: "Hoàn tiền", return: "Trả hàng", exchange: "Đổi hàng",
};

const formatDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "—";

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManageRefunds() {
  const toast = useToast();

  const [refunds,    setRefunds]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatus]   = useState("");
  const LIMIT = 15;

  // Detail modal
  const [detail,     setDetail]     = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Action modal (approve / reject / complete)
  const [actionModal, setActionModal] = useState(null); // { id, action: "approve"|"reject"|"complete" }
  const [actionNote,  setActionNote]  = useState("");
  const [saving,      setSaving]      = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      const res = await shopRefundApi.getAll(params);
      setRefunds(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTotalPages(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch (e) {
      toast.error(e?.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(page); }, [page, statusFilter]);

  // ── Open detail ──────────────────────────────────────────────────────────
  const openDetail = async (id) => {
    try {
      const res = await shopRefundApi.getById(id);
      setDetail(res.data);
      setDetailOpen(true);
    } catch (e) {
      toast.error(e?.message || "Lỗi tải chi tiết");
    }
  };

  // ── Submit action ────────────────────────────────────────────────────────
  const submitAction = async () => {
    if (!actionModal) return;
    const { id, action } = actionModal;

    if (action === "reject" && !actionNote.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    setSaving(true);
    try {
      if (action === "approve")  await shopRefundApi.approve(id, actionNote);
      if (action === "reject")   await shopRefundApi.reject(id, actionNote);
      if (action === "complete") await shopRefundApi.complete(id, actionNote);

      const labels = { approve: "Đã duyệt", reject: "Đã từ chối", complete: "Đã hoàn tất" };
      toast.success(labels[action]);
      setActionModal(null);
      setActionNote("");
      setDetailOpen(false);
      load(page);
    } catch (e) {
      toast.error(e?.message || "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  const openAction = (id, action) => {
    setActionNote("");
    setActionModal({ id, action });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">Quản lý hoàn/đổi</h1>
          <p className="text-sm text-default-400">Tổng {total} yêu cầu</p>
        </div>
        <Select
          size="sm" placeholder="Tất cả trạng thái" className="w-44" radius="lg"
          selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
          onSelectionChange={(k) => { setStatus(Array.from(k)[0] || ""); setPage(1); }}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k}>{v}</SelectItem>)}
        </Select>
      </div>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : refunds.length === 0 ? (
            <p className="text-center py-10 text-default-400">Không có yêu cầu hoàn/đổi nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Mã đơn", "Loại", "Ngày yêu cầu", "Lý do", "Số tiền", "Trạng thái", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {refunds.map((r) => (
                  <tr key={r._id} className="hover:bg-default-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold">
                      {r.order?.order_code || r.order_id}
                    </td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={TYPE_COLORS[r.type] || "default"} variant="flat">
                        {TYPE_LABELS[r.type] || r.type}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-default-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate text-default-600" title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={STATUS_COLORS[r.status] || "default"} variant="flat">
                        {STATUS_LABELS[r.status] || r.status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(r._id)}>
                          <Eye size={14} />
                        </Button>
                        {r.status === "pending" && (
                          <>
                            <Button isIconOnly size="sm" variant="light" color="success" title="Duyệt"
                              onPress={() => openAction(r._id, "approve")}>
                              <CheckCircle size={14} />
                            </Button>
                            <Button isIconOnly size="sm" variant="light" color="danger" title="Từ chối"
                              onPress={() => openAction(r._id, "reject")}>
                              <XCircle size={14} />
                            </Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button isIconOnly size="sm" variant="light" color="primary" title="Hoàn tất"
                            onPress={() => openAction(r._id, "complete")}>
                            <PackageCheck size={14} />
                          </Button>
                        )}
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
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onOpenChange={(o) => !o && setDetailOpen(false)} radius="xl" size="lg">
        <ModalContent>
          {(onClose) => detail && (
            <>
              <ModalHeader>Chi tiết yêu cầu hoàn/đổi</ModalHeader>
              <ModalBody className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Chip size="sm" color={TYPE_COLORS[detail.type] || "default"} variant="flat">
                    {TYPE_LABELS[detail.type] || detail.type}
                  </Chip>
                  <Chip size="sm" color={STATUS_COLORS[detail.status] || "default"} variant="flat">
                    {STATUS_LABELS[detail.status] || detail.status}
                  </Chip>
                </div>

                {[
                  ["Mã đơn hàng",  detail.order?.order_code || detail.order_id],
                  ["Số tiền hoàn", formatCurrency(detail.amount)],
                  ["Ngày yêu cầu", formatDate(detail.createdAt)],
                  detail.processed_at && ["Ngày xử lý", formatDate(detail.processed_at)],
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center border border-default-100 rounded-xl p-3">
                    <span className="text-sm font-semibold text-default-500">{label}</span>
                    <span className="text-sm">{val}</span>
                  </div>
                ))}

                <div className="border border-default-100 rounded-xl p-3">
                  <p className="text-sm font-semibold text-default-500 mb-1">Lý do khách hàng</p>
                  <p className="text-sm text-default-800">{detail.reason}</p>
                </div>

                {detail.shop_note && (
                  <div className="border border-default-100 rounded-xl p-3 bg-default-50">
                    <p className="text-sm font-semibold text-default-500 mb-1">Ghi chú của shop</p>
                    <p className="text-sm text-default-800">{detail.shop_note}</p>
                  </div>
                )}

                {detail.images?.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <p className="text-sm font-semibold text-default-500 mb-2">Hình ảnh đính kèm</p>
                      <div className="flex flex-wrap gap-2">
                        {detail.images.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`evidence-${i}`} className="w-20 h-20 object-cover rounded-xl border border-default-200" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                {detail.status === "pending" && (
                  <>
                    <Button color="success" variant="flat" onPress={() => { openAction(detail._id, "approve"); onClose(); }}>
                      Duyệt
                    </Button>
                    <Button color="danger" variant="flat" onPress={() => { openAction(detail._id, "reject"); onClose(); }}>
                      Từ chối
                    </Button>
                  </>
                )}
                {detail.status === "approved" && (
                  <Button color="primary" variant="flat" onPress={() => { openAction(detail._id, "complete"); onClose(); }}>
                    Xác nhận hoàn tất
                  </Button>
                )}
                <Button variant="light" onPress={onClose}>Đóng</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal isOpen={!!actionModal} onOpenChange={(o) => !o && setActionModal(null)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => {
            const action = actionModal?.action;
            const titles = { approve: "Duyệt yêu cầu hoàn/đổi", reject: "Từ chối yêu cầu", complete: "Xác nhận hoàn tất" };
            const colors = { approve: "success", reject: "danger", complete: "primary" };
            const labels = { approve: "Xác nhận duyệt", reject: "Xác nhận từ chối", complete: "Hoàn tất" };
            const hints  = {
              approve:  "Khách hàng sẽ được thông báo và hướng dẫn gửi lại hàng (nếu cần). Ghi chú tùy chọn:",
              reject:   "Lý do từ chối sẽ được gửi tới khách hàng (bắt buộc):",
              complete: "Xác nhận đã nhận hàng trả về và xử lý hoàn tiền/đổi hàng. Ghi chú tùy chọn:",
            };
            return (
              <>
                <ModalHeader>{titles[action]}</ModalHeader>
                <ModalBody>
                  <p className="text-sm text-default-500 mb-3">{hints[action]}</p>
                  <Textarea
                    placeholder={action === "reject" ? "Nhập lý do từ chối…" : "Ghi chú (không bắt buộc)…"}
                    value={actionNote}
                    onValueChange={setActionNote}
                    radius="lg"
                    minRows={3}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" radius="lg" onPress={onClose}>Hủy</Button>
                  <Button
                    color={colors[action]} radius="lg"
                    isLoading={saving}
                    isDisabled={action === "reject" && !actionNote.trim()}
                    onPress={submitAction}
                  >
                    {labels[action]}
                  </Button>
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>
    </div>
  );
}
