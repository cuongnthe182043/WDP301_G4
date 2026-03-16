import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Pagination, Chip, Select, SelectItem, Avatar, Tabs, Tab,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner, Divider, Input,
} from "@heroui/react";
import { CheckCircle, Trash2, AlertTriangle, Ban, ShieldOff, Star, Eye, EyeOff } from "lucide-react";
import apiClient from "../../services/apiClient";
import { useToast } from "../../components/common/ToastProvider";

// ─── API helpers ─────────────────────────────────────────────────────────────
const adminApi = {
  reviews:      (p) => apiClient.get("/admin/moderation/reviews", { params: p }).then(r => r.data),
  approve:      (id) => apiClient.patch(`/admin/moderation/reviews/${id}/approve`).then(r => r.data),
  toggleHide:   (id) => apiClient.patch(`/admin/moderation/reviews/${id}/hide`).then(r => r.data),
  delete:       (id) => apiClient.patch(`/admin/moderation/reviews/${id}/delete`).then(r => r.data),
  users:        (p) => apiClient.get("/admin/moderation/users", { params: p }).then(r => r.data),
  warn:         (id, reason) => apiClient.post(`/admin/moderation/users/${id}/warn`, { reason }).then(r => r.data),
  ban:          (id, days, reason) => apiClient.post(`/admin/moderation/users/${id}/ban`, { days, reason }).then(r => r.data),
  unban:        (id) => apiClient.post(`/admin/moderation/users/${id}/unban`).then(r => r.data),
};

const STATUS_COLOR = { visible: "success", hidden: "warning", pending: "danger", deleted: "default" };
const STATUS_LABEL = { visible: "Hiển thị", hidden: "Đã ẩn", pending: "Chờ duyệt", deleted: "Đã xóa" };
const formatDate   = (d) => d ? new Date(d).toLocaleString("vi-VN") : "—";

function StarRow({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={11} className={i <= value ? "text-warning fill-warning" : "text-default-200"} />
      ))}
    </div>
  );
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────
function ReviewsTab() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [tp, setTp]           = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const LIMIT = 20;

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const res = await adminApi.reviews({ page: pg, limit: LIMIT, status: statusFilter || undefined });
      setReviews(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTp(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch { toast.error("Lỗi tải dữ liệu"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(page); }, [page, statusFilter]);

  const approve = async (id) => {
    try { await adminApi.approve(id); toast.success("Đã duyệt"); load(page); }
    catch (e) { toast.error(e?.message); }
  };
  const toggleHide = async (id, currentStatus) => {
    try {
      const res = await adminApi.toggleHide(id);
      toast.success(res.data?.status === "hidden" ? "Đã ẩn đánh giá" : "Đã hiện đánh giá");
      load(page);
    } catch (e) { toast.error(e?.message); }
  };
  const remove = async (id) => {
    if (!confirm("Xóa đánh giá này?")) return;
    try { await adminApi.delete(id); toast.success("Đã xóa"); load(page); }
    catch (e) { toast.error(e?.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select size="sm" className="w-40" radius="lg"
          selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
          onSelectionChange={(k) => { setStatusFilter(Array.from(k)[0] || ""); setPage(1); }}>
          <SelectItem key="pending">Chờ duyệt</SelectItem>
          <SelectItem key="hidden">Đã ẩn</SelectItem>
          <SelectItem key="visible">Hiển thị</SelectItem>
        </Select>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0">
          {loading ? <div className="flex justify-center py-10"><Spinner /></div>
          : reviews.length === 0 ? <p className="text-center py-10 text-default-400">Không có đánh giá nào</p>
          : (
            <div className="divide-y divide-default-100">
              {reviews.map((r) => (
                <div key={r._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar src={r.user_id?.avatar_url} size="sm" name={r.user_id?.username?.[0]?.toUpperCase()} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{r.user_id?.username || "—"}</span>
                          <StarRow value={r.rating} />
                          <Chip size="sm" color={STATUS_COLOR[r.status]} variant="flat">
                            {STATUS_LABEL[r.status] || r.status}
                          </Chip>
                          <span className="text-xs text-default-400">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-default-700 mt-1">{r.comment || <em className="text-default-400">Không có nội dung</em>}</p>
                        {r.flagged_reason && (
                          <p className="text-xs text-danger mt-1 flex items-center gap-1">
                            <AlertTriangle size={11} /> {r.flagged_reason}
                          </p>
                        )}
                        {r.product_id && <p className="text-xs text-default-400 mt-1">SP: {r.product_id.name}</p>}
                        {r.user_id && (
                          <p className="text-xs text-default-400">
                            Cảnh báo: <span className="font-bold text-warning">{r.user_id.warning_count || 0}</span>
                            {r.user_id.status === "banned" && <Chip size="sm" color="danger" variant="flat" className="ml-1">Bị khóa</Chip>}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {r.status !== "visible" && (
                        <Button size="sm" variant="flat" color="success" startContent={<CheckCircle size={12} />}
                          onPress={() => approve(r._id)}>
                          Duyệt
                        </Button>
                      )}
                      <Button size="sm" variant="flat" color="warning" isIconOnly
                        title={r.status === "hidden" ? "Hiện đánh giá" : "Ẩn đánh giá"}
                        onPress={() => toggleHide(r._id, r.status)}>
                        {r.status === "hidden" ? <Eye size={14} /> : <EyeOff size={14} />}
                      </Button>
                      <Button size="sm" variant="flat" color="danger" isIconOnly onPress={() => remove(r._id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {tp > 1 && <div className="flex justify-center"><Pagination total={tp} page={page} onChange={setPage} color="primary" radius="lg" /></div>}
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const toast = useToast();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [tp, setTp]           = useState(1);

  // Ban modal
  const [banTarget, setBanTarget] = useState(null);
  const [banDays,   setBanDays]   = useState("");
  const [banReason, setBanReason] = useState("");
  const [saving,    setSaving]    = useState(false);
  const LIMIT = 20;

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const res = await adminApi.users({ page: pg, limit: LIMIT });
      setUsers(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTp(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch { toast.error("Lỗi tải dữ liệu"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(page); }, [page]);

  const warn = async (id) => {
    try { await adminApi.warn(id, "Vi phạm nội dung đánh giá"); toast.success("Đã cảnh báo"); load(page); }
    catch (e) { toast.error(e?.message); }
  };

  const submitBan = async () => {
    if (!banTarget) return;
    setSaving(true);
    try {
      await adminApi.ban(banTarget._id, banDays ? Number(banDays) : undefined, banReason || undefined);
      toast.success("Đã khóa tài khoản");
      setBanTarget(null);
      load(page);
    } catch (e) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  const unban = async (id) => {
    try { await adminApi.unban(id); toast.success("Đã mở khóa"); load(page); }
    catch (e) { toast.error(e?.message); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-default-400">Hiển thị người dùng có lịch sử vi phạm ({total} người)</p>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? <div className="flex justify-center py-10"><Spinner /></div>
          : users.length === 0 ? <p className="text-center py-10 text-default-400">Không có vi phạm nào</p>
          : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Người dùng", "Email", "Vi phạm", "Trạng thái", "Khóa đến", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-default-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm">{u.name}</div>
                      <div className="text-xs text-default-400">@{u.username}</div>
                    </td>
                    <td className="px-4 py-3 text-default-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={u.warning_count >= 5 ? "danger" : u.warning_count >= 3 ? "warning" : "default"} variant="flat">
                        {u.warning_count} lần
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={u.status === "banned" ? "danger" : "success"} variant="flat">
                        {u.status === "banned" ? "Bị khóa" : "Hoạt động"}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-xs text-default-400">
                      {u.ban_until ? new Date(u.ban_until).toLocaleDateString("vi-VN") : u.status === "banned" ? "Vĩnh viễn" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {u.status !== "banned" && (
                          <>
                            <Button size="sm" variant="light" color="warning" onPress={() => warn(u._id)}
                              startContent={<AlertTriangle size={12} />}>
                              Cảnh báo
                            </Button>
                            <Button size="sm" variant="flat" color="danger" onPress={() => { setBanTarget(u); setBanDays(""); setBanReason(""); }}
                              startContent={<Ban size={12} />}>
                              Khóa
                            </Button>
                          </>
                        )}
                        {u.status === "banned" && (
                          <Button size="sm" variant="flat" color="success" onPress={() => unban(u._id)}
                            startContent={<ShieldOff size={12} />}>
                            Mở khóa
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

      {tp > 1 && <div className="flex justify-center"><Pagination total={tp} page={page} onChange={setPage} color="primary" radius="lg" /></div>}

      {/* Ban Modal */}
      <Modal isOpen={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Khóa tài khoản: {banTarget?.name}</ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label="Số ngày khóa (để trống = vĩnh viễn)"
                  type="number" min="1"
                  value={banDays}
                  onValueChange={setBanDays}
                  placeholder="Ví dụ: 7"
                  radius="lg"
                />
                <Input
                  label="Lý do"
                  value={banReason}
                  onValueChange={setBanReason}
                  placeholder="Vi phạm chính sách nội dung…"
                  radius="lg"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Hủy</Button>
                <Button color="danger" isLoading={saving} onPress={submitBan}>Xác nhận khóa</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminReviews() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-default-900">Kiểm duyệt đánh giá</h1>
        <p className="text-sm text-default-400">Quản lý nội dung vi phạm và tài khoản người dùng</p>
      </div>

      <Tabs radius="lg" color="primary">
        <Tab key="reviews" title="Đánh giá vi phạm">
          <ReviewsTab />
        </Tab>
        <Tab key="users" title="Người dùng vi phạm">
          <UsersTab />
        </Tab>
      </Tabs>
    </div>
  );
}
