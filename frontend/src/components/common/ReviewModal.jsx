import React, { useState, useRef, useEffect } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Textarea, Chip,
} from "@heroui/react";
import { Star, Camera, X, Eye, EyeOff } from "lucide-react";
import { reviewService } from "../../services/reviewService";
import { useToast } from "./ToastProvider";

const SIZE_OPTIONS = [
  { value: "fit", label: "Vừa vặn" },
  { value: "tight", label: "Chật" },
  { value: "loose", label: "Rộng" },
];

function StarRating({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={size}
            className={`transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-default-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS = {
  1: "Rất tệ",
  2: "Tệ",
  3: "Bình thường",
  4: "Tốt",
  5: "Tuyệt vời",
};

/**
 * ReviewModal — create or edit a product review.
 *
 * Props:
 *  - existingReview: if provided, the modal opens in edit mode and pre-fills the form.
 *    Expected shape: { _id, rating, comment, images, is_anonymous, size_feedback }
 */
export default function ReviewModal({ isOpen, onOpenChange, item, orderId, existingReview, onSuccess }) {
  const toast = useToast();
  const fileRef = useRef(null);

  const isEdit = !!existingReview?._id;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sizeFeedback, setSizeFeedback] = useState("unknown");
  const [isAnonymous, setIsAnonymous] = useState(false);
  // New files the user picks (not yet uploaded)
  const [imageFiles, setImageFiles] = useState([]);
  // Preview URLs — mix of blob URLs (new files) and existing Cloudinary URLs
  const [imagePreviews, setImagePreviews] = useState([]);
  // Already-uploaded URLs carried over from the existing review
  const [existingUrls, setExistingUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Pre-fill when modal opens with an existing review
  useEffect(() => {
    if (isOpen && existingReview) {
      setRating(existingReview.rating || 0);
      setComment(existingReview.comment || "");
      setSizeFeedback(existingReview.size_feedback || "unknown");
      setIsAnonymous(existingReview.is_anonymous || false);
      const urls = existingReview.images || [];
      setExistingUrls(urls);
      setImagePreviews(urls);
      setImageFiles([]);
    }
    if (isOpen && !existingReview) {
      reset();
    }
  }, [isOpen, existingReview]);

  const reset = () => {
    setRating(0);
    setComment("");
    setSizeFeedback("unknown");
    setIsAnonymous(false);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingUrls([]);
  };

  const totalImages = existingUrls.length + imageFiles.length;

  const handlePickImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + totalImages > 5) {
      toast.warning("Tối đa 5 ảnh");
      return;
    }
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (idx) => {
    // idx in the combined previews array: first existingUrls, then new files
    if (idx < existingUrls.length) {
      // Remove an existing uploaded URL
      setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
      setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    } else {
      const fileIdx = idx - existingUrls.length;
      setImageFiles((prev) => prev.filter((_, i) => i !== fileIdx));
      setImagePreviews((prev) => {
        URL.revokeObjectURL(prev[idx]);
        return prev.filter((_, i) => i !== idx);
      });
    }
  };

  const handleSubmit = async (onClose) => {
    if (rating === 0) {
      toast.warning("Vui lòng chọn số sao");
      return;
    }

    setSubmitting(true);
    try {
      // Upload any new image files
      let newUploadedUrls = [];
      if (imageFiles.length > 0) {
        setUploading(true);
        const results = await reviewService.uploadImages(imageFiles);
        newUploadedUrls = results.map((r) => r.url || r);
        setUploading(false);
      }

      const allImages = [...existingUrls, ...newUploadedUrls];

      if (isEdit) {
        // Update existing review
        await reviewService.update(existingReview._id, {
          rating,
          comment: comment.trim(),
          images: allImages,
          is_anonymous: isAnonymous,
          size_feedback: sizeFeedback,
        });
        toast.success("Cập nhật đánh giá thành công!");
      } else {
        // Create new review
        await reviewService.submit({
          order_id: orderId,
          product_id: item.product_id,
          rating,
          comment: comment.trim(),
          images: allImages,
          is_anonymous: isAnonymous,
          size_feedback: sizeFeedback,
        });
        toast.success("Đánh giá thành công!");
      }

      reset();
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Không thể gửi đánh giá");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) reset(); onOpenChange(open); }} radius="2xl" backdrop="blur" size="lg">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="font-black text-default-900">
                {isEdit ? "Sửa đánh giá" : "Đánh giá sản phẩm"}
              </span>
            </ModalHeader>

            <ModalBody className="gap-5">
              {/* Product info */}
              <div className="flex items-center gap-3 bg-default-50 rounded-2xl p-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-default-100 flex-shrink-0">
                  {item?.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-default-900 line-clamp-2">{item?.name}</p>
                  {item?.variant_text && (
                    <p className="text-xs text-default-400 mt-0.5">{item.variant_text}</p>
                  )}
                </div>
              </div>

              {/* Star rating */}
              <div className="text-center">
                <p className="text-sm text-default-600 mb-2">Chất lượng sản phẩm</p>
                <div className="flex justify-center">
                  <StarRating value={rating} onChange={setRating} size={36} />
                </div>
                {rating > 0 && (
                  <p className="text-sm font-semibold text-primary mt-1">{RATING_LABELS[rating]}</p>
                )}
              </div>

              {/* Comment */}
              <Textarea
                label="Nhận xét"
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                value={comment}
                onValueChange={setComment}
                minRows={3}
                maxRows={6}
                radius="xl"
                variant="bordered"
              />

              {/* Image upload */}
              <div>
                <p className="text-sm text-default-600 mb-2">Thêm hình ảnh (tối đa 5)</p>
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-default-200">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {totalImages < 5 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-default-300 flex flex-col items-center justify-center text-default-400 hover:border-primary hover:text-primary transition-colors"
                    >
                      <Camera size={20} />
                      <span className="text-xs mt-1">Thêm</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handlePickImages}
                />
              </div>

              {/* Size feedback */}
              <div>
                <p className="text-sm text-default-600 mb-2">Kích cỡ so với mô tả</p>
                <div className="flex gap-2">
                  {SIZE_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      variant={sizeFeedback === opt.value ? "solid" : "bordered"}
                      color={sizeFeedback === opt.value ? "primary" : "default"}
                      className="cursor-pointer"
                      onClick={() => setSizeFeedback(opt.value)}
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Anonymous toggle */}
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className="flex items-center gap-2 text-sm text-default-500 hover:text-default-700 transition-colors"
              >
                {isAnonymous ? <EyeOff size={16} /> : <Eye size={16} />}
                {isAnonymous ? "Đánh giá ẩn danh" : "Hiển thị tên của bạn"}
              </button>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" radius="lg" onPress={onClose} isDisabled={submitting}>
                Đóng
              </Button>
              <Button
                color="primary"
                radius="lg"
                onPress={() => handleSubmit(onClose)}
                isLoading={submitting}
                isDisabled={rating === 0}
              >
                {uploading ? "Đang tải ảnh..." : isEdit ? "Cập nhật" : "Gửi đánh giá"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
