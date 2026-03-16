import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card, CardBody, Button, Chip, Skeleton, Divider,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Textarea,
} from "@heroui/react";
import { Star, Trash2, Edit3, ArrowLeft, MessageSquare, Image as ImageIcon } from "lucide-react";
import { reviewService } from "../../services/reviewService";
import { useToast } from "../../components/common/ToastProvider";
import PageContainer from "../../components/ui/PageContainer";

function Stars({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= value ? "fill-yellow-400 text-yellow-400" : "text-default-300"}
        />
      ))}
    </div>
  );
}

export default function MyReviews() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editReview, setEditReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await reviewService.getMyReviews();
      setReviews(data.reviews || data || []);
    } catch {
      toast.error("Không thể tải đánh giá");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (rv) => {
    setEditReview(rv);
    setEditRating(rv.rating);
    setEditComment(rv.comment || "");
    setEditOpen(true);
  };

  const handleUpdate = async (onClose) => {
    if (editRating === 0) return;
    setSaving(true);
    try {
      await reviewService.update(editReview._id, {
        rating: editRating,
        comment: editComment.trim(),
      });
      toast.success("Cập nhật đánh giá thành công");
      onClose();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể cập nhật");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await reviewService.delete(deleteId);
      toast.success("Đã xóa đánh giá");
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể xóa");
    }
  };

  if (loading) {
    return (
      <PageContainer wide={false}>
        <Skeleton className="h-8 w-48 rounded-xl mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer wide={false}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button as={Link} to="/orders" isIconOnly variant="bordered" radius="lg" size="sm" aria-label="Quay lại">
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-xl font-black text-default-900">Đánh giá của tôi</h1>
          <p className="text-sm text-default-400">{reviews.length} đánh giá</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 text-default-400 bg-default-50 rounded-2xl">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Bạn chưa có đánh giá nào.</p>
          <p className="text-sm mt-1">Hãy mua sắm và đánh giá sản phẩm nhé!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rv, idx) => {
            const product = rv.product_id && typeof rv.product_id === "object" ? rv.product_id : null;
            return (
              <motion.div
                key={rv._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card radius="xl" shadow="sm" className="border border-default-100">
                  <CardBody className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Product image */}
                      {product?.images?.[0] && (
                        <Link to={`/product/${product.slug || product._id}`} className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-default-100">
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                        </Link>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Product name */}
                        {product?.name && (
                          <Link to={`/product/${product.slug || product._id}`}>
                            <p className="font-semibold text-sm text-default-900 hover:text-primary transition-colors line-clamp-1">
                              {product.name}
                            </p>
                          </Link>
                        )}

                        {/* Stars + date */}
                        <div className="flex items-center gap-2 mt-1">
                          <Stars value={rv.rating} />
                          <span className="text-xs text-default-400">
                            {new Date(rv.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                          {rv.is_anonymous && (
                            <Chip size="sm" variant="flat" color="default">Ẩn danh</Chip>
                          )}
                        </div>

                        {/* Comment */}
                        {rv.comment && (
                          <p className="text-sm text-default-600 mt-2 leading-relaxed">{rv.comment}</p>
                        )}

                        {/* Images */}
                        {rv.images?.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {rv.images.map((img, i) => (
                              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-default-200">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Size feedback */}
                        {rv.size_feedback && rv.size_feedback !== "unknown" && (
                          <Chip size="sm" variant="flat" color="secondary" className="mt-2">
                            {rv.size_feedback === "fit" ? "Vừa vặn" : rv.size_feedback === "tight" ? "Chật" : "Rộng"}
                          </Chip>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button
                          isIconOnly size="sm" variant="light" radius="lg"
                          onPress={() => openEdit(rv)}
                          aria-label="Sửa"
                        >
                          <Edit3 size={14} className="text-default-500" />
                        </Button>
                        <Button
                          isIconOnly size="sm" variant="light" radius="lg" color="danger"
                          onPress={() => setDeleteId(rv._id)}
                          aria-label="Xóa"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onOpenChange={setEditOpen} radius="2xl" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="font-black text-default-900">Sửa đánh giá</ModalHeader>
              <ModalBody>
                <div className="text-center mb-3">
                  <p className="text-sm text-default-600 mb-2">Chất lượng sản phẩm</p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setEditRating(s)}>
                        <Star
                          size={32}
                          className={`transition-colors ${
                            s <= editRating ? "fill-yellow-400 text-yellow-400" : "text-default-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  label="Nhận xét"
                  value={editComment}
                  onValueChange={setEditComment}
                  minRows={3}
                  radius="xl"
                  variant="bordered"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Đóng</Button>
                <Button
                  color="primary" radius="lg"
                  isLoading={saving}
                  isDisabled={editRating === 0}
                  onPress={() => handleUpdate(onClose)}
                >
                  Cập nhật
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }} radius="2xl" backdrop="blur" size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="font-black text-default-900">Xóa đánh giá</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">Bạn có chắc chắn muốn xóa đánh giá này không?</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>Hủy</Button>
                <Button color="danger" radius="lg" onPress={() => { handleDelete(); }}>
                  Xóa
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
