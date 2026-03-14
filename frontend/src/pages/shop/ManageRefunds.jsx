import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Pagination, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner, Textarea,
} from "@heroui/react";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { shopRefundApi } from "../../services/shopManagementService";
import { useToast } from "../../components/common/ToastProvider";

const STATUS_COLORS = {
  requested: "warning", approved: "success", rejected: "danger", refunded: "primary",
};
const STATUS_LABELS = {
  requested: "Chờ xử lý", approved: "Đã duyệt", rejected: "Từ chối", refunded: "Đã hoàn tiền",
};
const formatVND = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
const formatDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "-";

export default function ManageRefunds() {
  const toast = useToast();
  const [refunds, setRefunds]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatus]   = useState("");
  const LIMIT = 15;

  const [detail, setDetail]       = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectId, setRejectId]     = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      const res = await shopRefundApi.getAll(params);
      setRefunds(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTotalPages(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch (e) { toast.error(e?.message || "Lỗi tải dữ liệu"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(page); }, [page, statusFilter]);

  const openDetail = async (id) => {
    try {
      const res = await shopRefundApi.getById(id);
      setDetail(res.data);
      setDetailOpen(true);
    } catch (e) { toast.error(e?.message); }
  };

  const handleApprove = async (id) => {
    setSaving(true);
    try {
      await shopRefundApi.approve(id);
      toast.success("Đã duyệt yêu cầu hoàn tiền");
      setDetailOpen(false);
      load(page);
    } catch (e) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await shopRefundApi.reject(rejectId, rejectNote);
      toast.success("Đã từ chối yêu cầu");
      setRejectId(null); setRejectNote("");
      setDetailOpen(false);
      load(page);
    } catch (e) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">Quản lý hoàn/đổi</h1>
          <p className="text-sm text-default-400">Tổng {total} yêu cầu</p>
        </div>
        <Select size="sm" placeholder="Tất cả trạng thái" className="w-44" radius="lg"
          selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
          onSelectionChange={(k) => { setStatus(Array.from(k)[0] || ""); setPage(1); }}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k}>{v}</SelectItem>)}
        </Select>
      </div>

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
                  {["Mã đơn", "Ngày yêu cầu", "Lý do", "Số tiền", "Trạng thái", ""].map((h) => (
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
                    <td className="px-4 py-3 text-default-500">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-3 font-semibold">{formatVND(r.amount)}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={STATUS_COLORS[r.status] || "default"} variant="flat">
                        {STATUS_LABELS[r.status] || r.status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(r._id)}><Eye size={14} /></Button>
                        {r.status === "requested" && (
                          <>
                            <Button isIconOnly size="sm" variant="light" color="success" title="Duyệt"
                              isDisabled={saving} onPress={() => handleApprove(r._id)}>
                              <CheckCircle size={14} />
                            </Button>
                            <Button isIconOnly size="sm" variant="light" color="danger" title="Từ chối"
                              onPress={() => { setRejectId(r._id); setRejectNote(""); }}>
                              <XCircle size={14} />
                            </Button>
                          </>
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

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onOpenChange={(o) => !o && setDetailOpen(false)} radius="xl" size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Chi tiết yêu cầu hoàn/đổi</ModalHeader>
              <ModalBody className="space-y-3">
                {detail && (
                  <>
                    {[
                      ["Mã đơn hàng", detail.order?.order_code || detail.order_id],
                      ["Lý do", detail.reason],
                      ["Số tiền hoàn", formatVND(detail.amount)],
                      ["Trạng thái", <Chip key="s" size="sm" color={STATUS_COLORS[detail.status]} variant="flat">{STATUS_LABELS[detail.status] || detail.status}</Chip>],
                      ["Ngày yêu cầu", formatDate(detail.createdAt)],
                      detail.processed_at && ["Ngày xử lý", formatDate(detail.processed_at)],
                    ].filter(Boolean).map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center border border-default-100 rounded-xl p-3">
                        <span className="text-sm font-semibold text-default-500">{label}</span>
                        <span className="text-sm">{val}</span>
                      </div>
                    ))}
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                {detail?.status === "requested" && (
                  <>
                    <Button color="success" isLoading={saving} onPress={() => handleApprove(detail._id)}>Duyệt</Button>
                    <Button color="danger" variant="flat" onPress={() => { setRejectId(detail._id); setRejectNote(""); setDetailOpen(false); }}>Từ chối</Button>
                  </>
                )}
                <Button variant="light" onPress={onClose}>Đóng</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal isOpen={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Từ chối yêu cầu hoàn/đổi</ModalHeader>
              <ModalBody>
                <Textarea label="Lý do từ chối" placeholder="Nhập lý do..."
                  value={rejectNote} onValueChange={setRejectNote} radius="lg" minRows={3} />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Hủy</Button>
                <Button color="danger" isLoading={saving} onPress={handleReject}>Xác nhận từ chối</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
