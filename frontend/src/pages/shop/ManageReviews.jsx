import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Pagination, Chip, Select, SelectItem, Avatar, Textarea,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import { Eye, EyeOff, MessageSquare, Star } from "lucide-react";
import { shopReviewApi } from "../../services/shopManagementService";
import { useToast } from "../../components/common/ToastProvider";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "-";

function StarRating({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= value ? "text-warning fill-warning" : "text-default-200"} />
      ))}
    </div>
  );
}

export default function ManageReviews() {
  const toast = useToast();
  const [reviews, setReviews]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatus]   = useState("");
  const [ratingFilter, setRating]   = useState("");
  const LIMIT = 15;

  const [replyId, setReplyId]     = useState(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (ratingFilter) params.rating = ratingFilter;
      const res = await shopReviewApi.getAll(params);
      setReviews(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTotalPages(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch (e) { toast.error(e?.message || "Lỗi tải dữ liệu"); }
    finally { setLoading(false); }
  }, [page, statusFilter, ratingFilter]);

  useEffect(() => { load(page); }, [page, statusFilter, ratingFilter]);

  const handleReply = async () => {
    if (!replyText.trim()) return toast.error("Nhập nội dung phản hồi");
    setSaving(true);
    try {
      await shopReviewApi.reply(replyId, replyText);
      toast.success("Đã gửi phản hồi");
      setReplyId(null); setReplyText("");
      load(page);
    } catch (e) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  const handleToggleHide = async (id) => {
    try {
      const res = await shopReviewApi.toggleHide(id);
      toast.success(res.data?.status === "hidden" ? "Đã ẩn đánh giá" : "Đã hiện đánh giá");
      load(page);
    } catch (e) { toast.error(e?.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">Quản lý đánh giá</h1>
          <p className="text-sm text-default-400">Tổng {total} đánh giá</p>
        </div>
        <div className="flex gap-2">
          <Select size="sm" placeholder="Trạng thái" className="w-36" radius="lg"
            selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
            onSelectionChange={(k) => { setStatus(Array.from(k)[0] || ""); setPage(1); }}>
            <SelectItem key="visible">Hiện</SelectItem>
            <SelectItem key="hidden">Đã ẩn</SelectItem>
            <SelectItem key="pending">Chờ duyệt</SelectItem>
          </Select>
          <Select size="sm" placeholder="Số sao" className="w-32" radius="lg"
            selectedKeys={ratingFilter ? new Set([ratingFilter]) : new Set()}
            onSelectionChange={(k) => { setRating(Array.from(k)[0] || ""); setPage(1); }}>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={String(n)}>{n} sao</SelectItem>)}
          </Select>
        </div>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Star size={40} className="text-default-300" />
              <p className="text-default-400">Không có đánh giá nào</p>
            </div>
          ) : (
            <div className="divide-y divide-default-100">
              {reviews.map((r) => (
                <div key={r._id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar src={r.user_id?.avatar_url} size="sm" radius="full" fallback={r.user_id?.username?.[0]} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{r.user_id?.username || "Ẩn danh"}</span>
                          <StarRating value={r.rating} />
                          <Chip size="sm" color={r.status === "hidden" ? "warning" : r.status === "visible" ? "success" : "default"} variant="flat">
                            {r.status}
                          </Chip>
                          <span className="text-xs text-default-400">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-default-700 mt-1">{r.comment || <span className="text-default-400 italic">Không có nhận xét</span>}</p>
                        {r.product_id && (
                          <p className="text-xs text-default-400 mt-1">Sản phẩm: {r.product_id?.name}</p>
                        )}
                        {/* Shop reply */}
                        {r.reply && (
                          <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg p-2">
                            <p className="text-xs font-semibold text-primary mb-1">Phản hồi của shop:</p>
                            <p className="text-sm">{r.reply}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!r.reply && (
                        <Button isIconOnly size="sm" variant="light" title="Phản hồi"
                          onPress={() => { setReplyId(r._id); setReplyText(""); }}>
                          <MessageSquare size={14} />
                        </Button>
                      )}
                      <Button isIconOnly size="sm" variant="light" title={r.status === "hidden" ? "Hiện" : "Ẩn"}
                        onPress={() => handleToggleHide(r._id)}>
                        {r.status === "hidden" ? <Eye size={14} /> : <EyeOff size={14} />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}

      {/* Reply Modal */}
      <Modal isOpen={!!replyId} onOpenChange={(o) => !o && setReplyId(null)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Phản hồi đánh giá</ModalHeader>
              <ModalBody>
                <Textarea label="Nội dung phản hồi" placeholder="Nhập phản hồi của bạn..."
                  value={replyText} onValueChange={setReplyText} radius="lg" minRows={4} />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Hủy</Button>
                <Button color="primary" isLoading={saving} onPress={handleReply}>Gửi phản hồi</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
