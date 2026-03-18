import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Pagination, Chip, Avatar,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import { Search, Eye, User } from "lucide-react";
import { shopCustomerApi } from "../../services/shopManagementService";
import { useToast } from "../../components/common/ToastProvider";
import { useTranslation } from "react-i18next";

const formatVND = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "-";

const STATUS_COLORS = {
  pending: "warning", confirmed: "primary", shipping: "secondary", delivered: "success",
  canceled_by_customer: "danger", canceled_by_shop: "danger",
};

export default function ManageCustomers() {
  const { t } = useTranslation();
  const toast = useToast();
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm]   = useState("");
  const LIMIT = 20;

  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const STATUS_LABELS = {
    pending:              t("order.status_pending"),
    confirmed:            t("order.status_confirmed"),
    shipping:             t("order.status_shipping"),
    delivered:            t("order.status_delivered"),
    canceled_by_customer: t("order.status_cancelled"),
    canceled_by_shop:     t("order.status_cancelled"),
    processing:           t("order.status_confirmed"),
    refund_pending:       t("order.status_refund_pending"),
    refund_completed:     t("order.status_refund_done"),
  };

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (searchTerm) params.q = searchTerm;
      const res = await shopCustomerApi.getAll(params);
      setCustomers(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTotalPages(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch (e) { toast.error(e?.message || t("common.error")); }
    finally { setLoading(false); }
  }, [page, searchTerm]);

  useEffect(() => { load(page); }, [page, searchTerm]);

  const openDetail = async (userId) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await shopCustomerApi.getById(userId);
      setDetail(res.data);
    } catch (e) { toast.error(e?.message); setDetailOpen(false); }
    finally { setDetailLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("shop.manage_customers")}</h1>
          <p className="text-sm text-default-400">{total} {t("shop.total_customers")}</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); setPage(1); }} className="flex gap-2">
          <Input size="sm" placeholder={t("common.search")} value={searchInput} onValueChange={setSearchInput}
            radius="lg" className="w-52" startContent={<Search size={14} />} />
          <Button size="sm" type="submit" variant="bordered" radius="lg">{t("common.search")}</Button>
        </form>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <User size={40} className="text-default-300" />
              <p className="text-default-400">{t("common.no_data")}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {[t("profile.user"), t("order.items"), t("order.total"), t("order.date"), ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-default-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={c.user?.avatar_url}
                          fallback={<User size={14} />}
                          size="sm" radius="full"
                        />
                        <div>
                          <p className="font-medium text-default-900">{c.user?.full_name || c.user?.username || "—"}</p>
                          <p className="text-xs text-default-400">{c.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{c.total_orders}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{formatVND(c.total_spent)}</td>
                    <td className="px-4 py-3 text-default-500">{formatDate(c.last_order_at)}</td>
                    <td className="px-4 py-3">
                      <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(c._id)}><Eye size={14} /></Button>
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
      <Modal isOpen={detailOpen} onOpenChange={(o) => !o && setDetailOpen(false)} radius="xl" size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("common.details")}</ModalHeader>
              <ModalBody className="space-y-4">
                {detailLoading ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : detail ? (
                  <>
                    <div className="flex items-center gap-4 p-4 bg-default-50 rounded-xl">
                      <Avatar src={detail.user?.avatar_url} fallback={<User size={20} />} size="lg" radius="full" />
                      <div>
                        <p className="font-bold text-default-900">{detail.user?.full_name || detail.user?.username}</p>
                        <p className="text-sm text-default-400">{detail.user?.email}</p>
                        {detail.user?.phone && <p className="text-sm text-default-400">{detail.user.phone}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-default-100 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-primary">{detail.stats?.total_orders || 0}</p>
                        <p className="text-xs text-default-400 mt-1">{t("shop.total_orders")}</p>
                      </div>
                      <div className="border border-default-100 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-success">{formatVND(detail.stats?.total_spent)}</p>
                        <p className="text-xs text-default-400 mt-1">{t("shop.total_revenue")}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-default-700 mb-2">{t("shop.history")}</p>
                      {(detail.orders || []).length === 0 ? (
                        <p className="text-center text-default-400 py-4">{t("common.no_data")}</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {detail.orders.map((o) => (
                            <div key={o._id} className="flex justify-between items-center border border-default-100 rounded-xl p-3 text-sm">
                              <div>
                                <p className="font-mono font-bold text-xs">{o.order_code}</p>
                                <p className="text-default-400 text-xs">{formatDate(o.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <Chip size="sm" color={STATUS_COLORS[o.status] || "default"} variant="flat">
                                  {STATUS_LABELS[o.status] || o.status}
                                </Chip>
                                <p className="font-semibold mt-1">{formatVND(o.total_price)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.close")}</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
