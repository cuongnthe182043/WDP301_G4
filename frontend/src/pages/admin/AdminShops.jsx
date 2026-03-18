import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Input, Textarea, Avatar, Skeleton, Select, SelectItem, Tooltip,
  Card, CardBody,
} from "@heroui/react";
import {
  CheckCircle, XCircle, PauseCircle, Search, RefreshCw,
  Store, Users, Package, DollarSign, Eye,
} from "lucide-react";
import {
  adminListShops, adminApproveShop, adminSuspendShop, adminRejectShop, adminGetShopStats,
} from "../../services/shopService";
import { useToast } from "../../components/common/ToastProvider";
import { formatCurrency } from "../../utils/formatCurrency";

// STATUS_CONFIG is built inside the component using t()

function StatCard({ icon: Icon, label, value, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <Card radius="xl" shadow="sm">
      <CardBody className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-black text-gray-900">{value ?? "-"}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function AdminShops() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const STATUS_CONFIG = {
    pending:   { label: t("admin.shop_filter_pending"),   color: "warning" },
    approved:  { label: t("admin.shop_filter_approved"),  color: "success" },
    suspended: { label: t("admin.shop_filter_suspended"), color: "danger" },
  };

  const [shops, setShops] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [statsModal, setStatsModal] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { shop, action: 'suspend'|'reject' }
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListShops({ page, limit: 20, status: statusFilter || undefined, q: q || undefined });
      setShops(data.items);
      setTotal(data.total);
    } catch {
      toast.error(t("admin.load_failed"));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, q]);

  useEffect(() => { load(); }, [load]);

  const openStats = async (shop) => {
    setStatsModal(shop);
    setStatsData(null);
    setStatsLoading(true);
    try {
      const data = await adminGetShopStats(shop._id);
      setStatsData(data);
    } catch {
      toast.error(t("admin.load_failed"));
    } finally {
      setStatsLoading(false);
    }
  };

  const handleApprove = async (shop) => {
    try {
      await adminApproveShop(shop._id);
      toast.success(`${t("admin.approve_shop")}: "${shop.shop_name}"`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t("admin.action_failed"));
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      if (actionModal.action === "suspend") {
        await adminSuspendShop(actionModal.shop._id, reason);
        toast.success(t("admin.suspend_shop"));
      } else if (actionModal.action === "reject") {
        await adminRejectShop(actionModal.shop._id, reason);
        toast.success(t("admin.reject_shop"));
      }
      setActionModal(null);
      setReason("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t("admin.action_failed"));
    } finally {
      setActionLoading(false);
    }
  };

  const counts = {
    total: total,
    pending: shops.filter((s) => s.status === "pending").length,
    approved: shops.filter((s) => s.status === "approved").length,
    suspended: shops.filter((s) => s.status === "suspended").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">{t("admin.manage_shops")}</h1>
        <Button
          variant="bordered"
          radius="lg"
          size="sm"
          startContent={<RefreshCw size={14} />}
          onPress={load}
        >
          {t("common.reset")}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Store}    label={t("admin.total_shops")}  value={total}            color="blue" />
        <StatCard icon={Package}  label={t("admin.pending_shops")} value={counts.pending}   color="amber" />
        <StatCard icon={CheckCircle} label={t("admin.active_shops")} value={counts.approved} color="green" />
        <StatCard icon={XCircle}  label={t("admin.shop_filter_suspended")} value={counts.suspended} color="red" />
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={t("common.search") + "…"}
          value={q}
          onValueChange={(v) => { setQ(v); setPage(1); }}
          startContent={<Search size={16} className="text-gray-400" />}
          radius="lg"
          variant="bordered"
          className="flex-1"
        />
        <Select
          selectedKeys={new Set([statusFilter])}
          onSelectionChange={(k) => { setStatusFilter(Array.from(k)[0] || ""); setPage(1); }}
          radius="lg"
          variant="bordered"
          className="w-48"
          aria-label={t("admin.shop_status")}
          placeholder={t("admin.shop_filter_all")}
        >
          <SelectItem key="">{t("common.all")}</SelectItem>
          <SelectItem key="pending">{t("admin.shop_filter_pending")}</SelectItem>
          <SelectItem key="approved">{t("admin.shop_filter_approved")}</SelectItem>
          <SelectItem key="suspended">{t("admin.shop_filter_suspended")}</SelectItem>
        </Select>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Table
          aria-label={t("admin.shops_list")}
          radius="xl"
          shadow="sm"
          classNames={{ th: "bg-gray-50 text-gray-600 font-semibold text-xs uppercase" }}
        >
          <TableHeader>
            <TableColumn>Shop</TableColumn>
            <TableColumn>{t("common.name")}</TableColumn>
            <TableColumn>{t("common.phone")}</TableColumn>
            <TableColumn>{t("common.status")}</TableColumn>
            <TableColumn>{t("order.date")}</TableColumn>
            <TableColumn>{t("common.actions")}</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={loading}
            loadingContent={
              <div className="flex flex-col gap-3 p-4">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            }
            emptyContent={
              <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                <Store size={32} className="text-gray-200" />
                <p className="text-sm">{t("common.no_data")}</p>
              </div>
            }
          >
            {shops.map((shop) => {
              const cfg = STATUS_CONFIG[shop.status] || STATUS_CONFIG.pending;
              return (
                <TableRow key={shop._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar src={shop.shop_logo} name={shop.shop_name?.charAt(0)} size="sm" />
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{shop.shop_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{shop.shop_slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar src={shop.owner?.avatar_url} name={shop.owner?.name?.charAt(0)} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{shop.owner?.name || "-"}</p>
                        <p className="text-xs text-gray-400">{shop.owner?.email || "-"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {shop.phone && <p className="text-gray-700">{shop.phone}</p>}
                      {shop.email && <p className="text-gray-400 text-xs">{shop.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip color={cfg.color} variant="flat" size="sm">{cfg.label}</Chip>
                    {shop.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1 max-w-[160px] truncate">{shop.rejection_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-gray-500">
                      {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString("vi-VN") : "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip content={t("admin.view_stats")}>
                        <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => openStats(shop)}>
                          <Eye size={15} className="text-blue-500" />
                        </Button>
                      </Tooltip>
                      {shop.status === "pending" && (
                        <>
                          <Tooltip content={t("admin.approve_shop")}>
                            <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => handleApprove(shop)}>
                              <CheckCircle size={15} className="text-emerald-500" />
                            </Button>
                          </Tooltip>
                          <Tooltip content={t("admin.reject_shop")}>
                            <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => { setActionModal({ shop, action: "reject" }); setReason(""); }}>
                              <XCircle size={15} className="text-red-500" />
                            </Button>
                          </Tooltip>
                        </>
                      )}
                      {shop.status === "approved" && (
                        <Tooltip content={t("admin.suspend_shop")}>
                          <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => { setActionModal({ shop, action: "suspend" }); setReason(""); }}>
                            <PauseCircle size={15} className="text-amber-500" />
                          </Button>
                        </Tooltip>
                      )}
                      {shop.status === "suspended" && (
                        <Tooltip content={t("admin.approve_shop")}>
                          <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => handleApprove(shop)}>
                            <CheckCircle size={15} className="text-emerald-500" />
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>&lsaquo; {t("common.back")}</Button>
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page * 20 >= total} onPress={() => setPage((p) => p + 1)}>{t("common.show_more")} &rsaquo;</Button>
        </div>
      )}

      {/* Stats Modal */}
      <Modal isOpen={!!statsModal} onClose={() => setStatsModal(null)} radius="xl" size="lg">
        <ModalContent>
          <ModalHeader className="font-black text-gray-900">
            {t("admin.shop_stats")}: {statsModal?.shop_name}
          </ModalHeader>
          <ModalBody className="pb-6">
            {statsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : statsData ? (
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Package}    label={t("admin.stats_products")} value={statsData.total_products}  color="blue" />
                <StatCard icon={Store}      label={t("admin.stats_orders")}   value={statsData.total_orders}    color="amber" />
                <StatCard icon={DollarSign} label={t("admin.stats_revenue")}  value={formatCurrency(statsData.total_revenue)} color="green" />
                <StatCard icon={Users}      label={t("admin.stats_customers")} value={statsData.followers || 0} color="blue" />
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4">{t("common.no_data")}</p>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Action Modal (suspend / reject) */}
      <Modal isOpen={!!actionModal} onClose={() => setActionModal(null)} radius="xl">
        <ModalContent>
          <ModalHeader className="font-black text-gray-900">
            {actionModal?.action === "suspend" ? t("admin.suspend_shop") : t("admin.reject_shop")}
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-3">
              {actionModal?.action === "suspend" ? t("admin.action_suspend") : t("admin.action_reject")}: <strong>{actionModal?.shop?.shop_name}</strong>.
            </p>
            <Textarea
              label={`${t("common.reason")} (${t("common.optional")})`}
              placeholder={t("admin.reason_placeholder")}
              value={reason}
              onValueChange={setReason}
              variant="bordered"
              radius="lg"
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" radius="lg" onPress={() => setActionModal(null)}>{t("common.cancel")}</Button>
            <Button
              color={actionModal?.action === "suspend" ? "warning" : "danger"}
              radius="lg"
              isLoading={actionLoading}
              onPress={handleAction}
            >
              {actionModal?.action === "suspend" ? t("admin.action_suspend") : t("admin.action_reject")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
