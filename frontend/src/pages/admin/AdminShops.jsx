import React, { useEffect, useState, useCallback } from "react";
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

const STATUS_CONFIG = {
  pending:   { label: "Chờ duyệt",     color: "warning" },
  approved:  { label: "Hoạt động",     color: "success" },
  suspended: { label: "Tạm khóa",      color: "danger" },
};

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
  const { toast } = useToast();

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
      toast.error("Không thể tải danh sách shops");
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
      toast.error("Không thể tải thống kê");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleApprove = async (shop) => {
    try {
      await adminApproveShop(shop._id);
      toast.success(`Đã duyệt shop "${shop.shop_name}"`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      if (actionModal.action === "suspend") {
        await adminSuspendShop(actionModal.shop._id, reason);
        toast.success("Đã tạm khóa shop");
      } else if (actionModal.action === "reject") {
        await adminRejectShop(actionModal.shop._id, reason);
        toast.success("Đã từ chối shop");
      }
      setActionModal(null);
      setReason("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Thao tác thất bại");
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
        <h1 className="text-xl font-black text-gray-900">Quản lý Shop</h1>
        <Button
          variant="bordered"
          radius="lg"
          size="sm"
          startContent={<RefreshCw size={14} />}
          onPress={load}
        >
          Làm mới
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Store}    label="Tổng shops"   value={total}          color="blue" />
        <StatCard icon={Package}  label="Chờ duyệt"    value={counts.pending} color="amber" />
        <StatCard icon={CheckCircle} label="Hoạt động" value={counts.approved} color="green" />
        <StatCard icon={XCircle}  label="Tạm khóa"     value={counts.suspended} color="red" />
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Tìm theo tên shop..."
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
          aria-label="Lọc trạng thái"
          placeholder="Tất cả trạng thái"
        >
          <SelectItem key="">Tất cả</SelectItem>
          <SelectItem key="pending">Chờ duyệt</SelectItem>
          <SelectItem key="approved">Hoạt động</SelectItem>
          <SelectItem key="suspended">Tạm khóa</SelectItem>
        </Select>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Table
          aria-label="Danh sách shops"
          radius="xl"
          shadow="sm"
          classNames={{ th: "bg-gray-50 text-gray-600 font-semibold text-xs uppercase" }}
        >
          <TableHeader>
            <TableColumn>Shop</TableColumn>
            <TableColumn>Chủ sở hữu</TableColumn>
            <TableColumn>Liên hệ</TableColumn>
            <TableColumn>Trạng thái</TableColumn>
            <TableColumn>Ngày đăng ký</TableColumn>
            <TableColumn>Hành động</TableColumn>
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
                <p className="text-sm">Không có shop nào</p>
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
                      <Tooltip content="Xem thống kê">
                        <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => openStats(shop)}>
                          <Eye size={15} className="text-blue-500" />
                        </Button>
                      </Tooltip>
                      {shop.status === "pending" && (
                        <>
                          <Tooltip content="Duyệt shop">
                            <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => handleApprove(shop)}>
                              <CheckCircle size={15} className="text-emerald-500" />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Từ chối">
                            <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => { setActionModal({ shop, action: "reject" }); setReason(""); }}>
                              <XCircle size={15} className="text-red-500" />
                            </Button>
                          </Tooltip>
                        </>
                      )}
                      {shop.status === "approved" && (
                        <Tooltip content="Tạm khóa">
                          <Button isIconOnly size="sm" variant="light" radius="lg" onPress={() => { setActionModal({ shop, action: "suspend" }); setReason(""); }}>
                            <PauseCircle size={15} className="text-amber-500" />
                          </Button>
                        </Tooltip>
                      )}
                      {shop.status === "suspended" && (
                        <Tooltip content="Duyệt lại">
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
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>Trước</Button>
          <Button size="sm" variant="bordered" radius="lg" isDisabled={page * 20 >= total} onPress={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      )}

      {/* Stats Modal */}
      <Modal isOpen={!!statsModal} onClose={() => setStatsModal(null)} radius="xl" size="lg">
        <ModalContent>
          <ModalHeader className="font-black text-gray-900">
            Thống kê: {statsModal?.shop_name}
          </ModalHeader>
          <ModalBody className="pb-6">
            {statsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : statsData ? (
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Package}    label="Sản phẩm"    value={statsData.total_products}  color="blue" />
                <StatCard icon={Store}      label="Đơn hàng"    value={statsData.total_orders}    color="amber" />
                <StatCard icon={DollarSign} label="Doanh thu"   value={formatCurrency(statsData.total_revenue)} color="green" />
                <StatCard icon={Users}      label="Theo dõi"    value={statsData.followers || 0}  color="blue" />
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4">Không có dữ liệu</p>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Action Modal (suspend / reject) */}
      <Modal isOpen={!!actionModal} onClose={() => setActionModal(null)} radius="xl">
        <ModalContent>
          <ModalHeader className="font-black text-gray-900">
            {actionModal?.action === "suspend" ? "Tạm khóa shop" : "Từ chối đăng ký"}
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-3">
              Bạn đang {actionModal?.action === "suspend" ? "tạm khóa" : "từ chối"} shop <strong>{actionModal?.shop?.shop_name}</strong>.
            </p>
            <Textarea
              label="Lý do (tùy chọn)"
              placeholder="Nhập lý do..."
              value={reason}
              onValueChange={setReason}
              variant="bordered"
              radius="lg"
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" radius="lg" onPress={() => setActionModal(null)}>Hủy</Button>
            <Button
              color={actionModal?.action === "suspend" ? "warning" : "danger"}
              radius="lg"
              isLoading={actionLoading}
              onPress={handleAction}
            >
              {actionModal?.action === "suspend" ? "Tạm khóa" : "Từ chối"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
