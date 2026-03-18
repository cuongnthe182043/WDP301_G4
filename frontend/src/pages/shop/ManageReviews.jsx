import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Pagination, Chip, Select, SelectItem, Avatar, Textarea,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import { MessageSquare, Star, Pencil, AlertCircle } from "lucide-react";
import { shopReviewApi } from "../../services/shopManagementService";
import { useToast } from "../../components/common/ToastProvider";
import apiClient from "../../services/apiClient";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

function StarRating({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= value ? "text-warning fill-warning" : "text-default-200"} />
      ))}
    </div>
  );
}

const STATUS_COLOR = { visible: "success", hidden: "warning", pending: "danger", deleted: "default" };

export default function ManageReviews() {
  const { t } = useTranslation();
  const toast = useToast();

  const STATUS_LABEL = {
    visible: t("admin.review_status_visible"),
    hidden:  t("admin.review_status_hidden"),
    pending: t("admin.review_status_pending"),
    deleted: t("admin.review_status_deleted"),
  };

  const [reviews, setReviews]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatus]   = useState("");
  const [ratingFilter, setRating]   = useState("");
  const [productFilter, setProduct] = useState("");
  const [products, setProducts]     = useState([]);
  const LIMIT = 15;

  // Reply modal
  const [replyTarget, setReplyTarget] = useState(null); // { id, existing }
  const [replyText,   setReplyText]   = useState("");
  const [saving,      setSaving]      = useState(false);

  // Load shop products for filter dropdown
  useEffect(() => {
    apiClient.get("/shop/admin/products", { params: { limit: 100 } })
      .then((r) => setProducts(r.data?.data?.items || r.data?.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (statusFilter)  params.status     = statusFilter;
      if (ratingFilter)  params.rating     = ratingFilter;
      if (productFilter) params.product_id = productFilter;
      const res = await shopReviewApi.getAll(params);
      setReviews(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTotalPages(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch (e) { toast.error(e?.message || t("admin.refund_load_error")); }
    finally { setLoading(false); }
  }, [page, statusFilter, ratingFilter, productFilter]);

  useEffect(() => { load(page); }, [page, statusFilter, ratingFilter, productFilter]);

  const openReply = (r) => {
    setReplyTarget({ id: r._id, existing: r.reply || "" });
    setReplyText(r.reply || "");
  };

  const handleReply = async () => {
    if (!replyText.trim()) return toast.error(t("admin.review_reply_required"));
    setSaving(true);
    try {
      await shopReviewApi.reply(replyTarget.id, replyText);
      toast.success(replyTarget.existing ? t("admin.review_reply_updated") : t("admin.review_reply_success"));
      setReplyTarget(null);
      setReplyText("");
      load(page);
    } catch (e) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("admin.review_manage_title")}</h1>
          <p className="text-sm text-default-400">{t("admin.review_total", { count: total })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Product filter */}
          <Select size="sm" placeholder={t("admin.review_all_products")} className="w-52" radius="lg"
            selectedKeys={productFilter ? new Set([productFilter]) : new Set()}
            onSelectionChange={(k) => { setProduct(Array.from(k)[0] || ""); setPage(1); }}>
            {products.map((p) => (
              <SelectItem key={p._id}>{p.name}</SelectItem>
            ))}
          </Select>
          <Select size="sm" placeholder={t("common.status")} className="w-36" radius="lg"
            selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
            onSelectionChange={(k) => { setStatus(Array.from(k)[0] || ""); setPage(1); }}>
            <SelectItem key="visible">{t("admin.review_status_visible")}</SelectItem>
            <SelectItem key="hidden">{t("admin.review_status_hidden")}</SelectItem>
            <SelectItem key="pending">{t("admin.review_status_pending")}</SelectItem>
          </Select>
          <Select size="sm" placeholder={t("admin.review_stars_label")} className="w-32" radius="lg"
            selectedKeys={ratingFilter ? new Set([ratingFilter]) : new Set()}
            onSelectionChange={(k) => { setRating(Array.from(k)[0] || ""); setPage(1); }}>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={String(n)}>{n} ★</SelectItem>)}
          </Select>
        </div>
      </div>

      {/* Review list */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Star size={40} className="text-default-300" />
              <p className="text-default-400">{t("admin.review_no_reviews")}</p>
            </div>
          ) : (
            <div className="divide-y divide-default-100">
              {reviews.map((r) => (
                <div key={r._id} className="p-4 space-y-3">
                  {/* Row: avatar + user + stars + status + actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar src={r.user_id?.avatar_url} size="sm" radius="full"
                        name={r.user_id?.username?.[0]?.toUpperCase()} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{r.user_id?.username || t("admin.review_anonymous")}</span>
                          <StarRating value={r.rating} />
                          <Chip size="sm" color={STATUS_COLOR[r.status] || "default"} variant="flat">
                            {STATUS_LABEL[r.status] || r.status}
                          </Chip>
                          {r.status === "pending" && (
                            <Chip size="sm" color="danger" variant="dot" startContent={<AlertCircle size={10} />}>
                              {t("admin.review_pending_chip")}
                            </Chip>
                          )}
                          <span className="text-xs text-default-400">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-default-700 mt-1">
                          {r.comment || <span className="text-default-400 italic">{t("admin.review_no_comment")}</span>}
                        </p>
                        {r.flagged_reason && (
                          <p className="text-xs text-danger mt-1">⚠ {r.flagged_reason}</p>
                        )}
                        {r.product_id && (
                          <p className="text-xs text-default-400 mt-1">{t("admin.review_product_label")} {r.product_id?.name}</p>
                        )}

                        {/* Images */}
                        {r.images?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {r.images.map((img, i) => (
                              <img key={i} src={img} alt="" className="w-12 h-12 rounded-lg object-cover border border-default-200" />
                            ))}
                          </div>
                        )}

                        {/* Shop reply */}
                        {r.reply && (
                          <div className="mt-2 bg-primary/5 border border-primary/20 rounded-xl p-3">
                            <p className="text-xs font-bold text-primary mb-1">{t("admin.review_reply_label")}</p>
                            <p className="text-sm text-default-700">{r.reply}</p>
                            {r.reply_at && <p className="text-xs text-default-400 mt-1">{formatDate(r.reply_at)}</p>}
                          </div>
                        )}

                        {/* Thread (customer back-replies) */}
                        {(r.thread || []).filter(th => th.from === "customer").map((th, i) => (
                          <div key={i} className="mt-2 bg-default-50 border border-default-200 rounded-xl p-3">
                            <p className="text-xs font-bold text-default-500 mb-1">{t("admin.review_buyer_reply")}</p>
                            <p className="text-sm text-default-700">{th.text}</p>
                            <p className="text-xs text-default-400 mt-1">{formatDate(th.at)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons — shop can only reply, not hide */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        isIconOnly size="sm" variant="light"
                        title={r.reply ? t("admin.review_edit_reply_btn") : t("admin.review_reply_btn")}
                        onPress={() => openReply(r)}
                      >
                        {r.reply ? <Pencil size={14} /> : <MessageSquare size={14} />}
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
      <Modal isOpen={!!replyTarget} onOpenChange={(o) => !o && setReplyTarget(null)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{replyTarget?.existing ? t("admin.review_edit_reply_title") : t("admin.review_reply_title")}</ModalHeader>
              <ModalBody>
                <Textarea
                  label={t("admin.review_reply_label_input")}
                  placeholder={t("admin.review_reply_placeholder")}
                  value={replyText}
                  onValueChange={setReplyText}
                  radius="lg"
                  minRows={4}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
                <Button color="primary" isLoading={saving} onPress={handleReply}>
                  {replyTarget?.existing ? t("common.update") : t("admin.review_reply_btn")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
