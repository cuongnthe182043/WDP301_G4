/**
 * AddressManager
 *
 * Embedded (non-modal) address CRUD panel used in the Profile page.
 * Handles its own data fetching — no props needed.
 *
 * Features:
 *   - List all addresses with name, phone, full address
 *   - Add new (opens AddressDialog modal)
 *   - Edit existing (opens AddressDialog modal pre-filled)
 *   - Delete with confirm
 *   - Set default address
 */
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Chip, Skeleton } from "@heroui/react";
import { MapPin, Plus, Pencil, Trash2, Star, User, Phone, AlertCircle } from "lucide-react";
import { addressService } from "../services/addressService";
import { useToast } from "./common/ToastProvider";
import AddressDialog from "./AddressDialog";
import { useConfirm } from "./common/Confirm";

const prettyJoin = (parts = []) =>
  parts
    .map((x) => String(x || "").trim())
    .filter((x) => x && x !== "-" && x !== "—")
    .join(", ");

export default function AddressManager() {
  const toast   = useToast();
  const confirm = useConfirm();

  const [addresses,    setAddresses]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);   // null = create, object = edit
  const [actionId,     setActionId]     = useState(null);   // id of item currently in an async action

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await addressService.list();
      setAddresses(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Không tải được danh sách địa chỉ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit   = (a) => { setEditTarget(a);    setDialogOpen(true); };

  const handleSubmit = async (payload) => {
    try {
      if (editTarget) {
        await addressService.update(editTarget._id, payload);
        toast.success("Đã cập nhật địa chỉ");
      } else {
        await addressService.create(payload);
        toast.success("Đã thêm địa chỉ mới");
      }
      setDialogOpen(false);
      setEditTarget(null);
      await load();
    } catch (e) {
      throw e; // let AddressDialog show the error
    }
  };

  const handleDelete = async (a) => {
    const ok = await confirm({
      title:       "Xoá địa chỉ",
      description: `Bạn có chắc muốn xoá địa chỉ "${a.name}" — ${prettyJoin([a.street, a.city])}?`,
      confirmText: "Xoá",
      danger:      true,
    });
    if (!ok) return;
    setActionId(a._id);
    try {
      await addressService.remove(a._id);
      toast.success("Đã xoá địa chỉ");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Xoá địa chỉ thất bại");
    } finally {
      setActionId(null);
    }
  };

  const handleSetDefault = async (a) => {
    setActionId(a._id);
    try {
      await addressService.setDefault(a._id);
      toast.success(`"${a.name}" đã được đặt làm địa chỉ mặc định`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Đặt mặc định thất bại");
    } finally {
      setActionId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-black text-default-900 text-base">Địa chỉ nhận hàng</h3>
          <p className="text-xs text-default-400 mt-0.5">
            Địa chỉ mặc định sẽ được tự động chọn khi thanh toán
          </p>
        </div>
        <Button
          color="primary"
          size="sm"
          radius="lg"
          startContent={<Plus size={15} />}
          onPress={openCreate}
          className="font-semibold"
        >
          Thêm địa chỉ
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="rounded-2xl h-24" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-12 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-default-100 flex items-center justify-center mb-3">
            <MapPin size={24} className="text-default-300" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-default-600 mb-1">Chưa có địa chỉ</p>
          <p className="text-sm text-default-400 mb-4">Thêm địa chỉ để thanh toán nhanh hơn.</p>
          <Button
            color="primary"
            size="sm"
            radius="lg"
            variant="flat"
            startContent={<Plus size={14} />}
            onPress={openCreate}
          >
            Thêm địa chỉ đầu tiên
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-3">
            {addresses.map((a) => {
              const busy = actionId === a._id;
              return (
                <motion.div
                  key={a._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.22 }}
                  className={[
                    "border rounded-2xl p-4 transition-shadow",
                    a.is_default
                      ? "border-primary bg-primary-50/40"
                      : "border-default-200 bg-white hover:shadow-sm",
                  ].join(" ")}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User size={14} className="text-default-400 flex-shrink-0" />
                      <span className="font-bold text-sm text-default-900">{a.name}</span>
                      <div className="flex items-center gap-1 text-xs text-default-500">
                        <Phone size={12} className="flex-shrink-0" />
                        {a.phone}
                      </div>
                      {a.is_default && (
                        <Chip
                          size="sm"
                          color="warning"
                          variant="flat"
                          startContent={<Star size={11} />}
                        >
                          Mặc định
                        </Chip>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        aria-label="Sửa"
                        onPress={() => openEdit(a)}
                        isDisabled={busy}
                      >
                        <Pencil size={14} />
                      </Button>
                      {!a.is_default && (
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          aria-label="Đặt mặc định"
                          onPress={() => handleSetDefault(a)}
                          isLoading={busy}
                        >
                          <Star size={14} />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        isIconOnly
                        aria-label="Xoá"
                        onPress={() => handleDelete(a)}
                        isDisabled={busy}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Address line */}
                  <p className="text-sm text-default-500 mt-2 flex items-start gap-1.5">
                    <MapPin size={13} className="flex-shrink-0 mt-0.5 text-default-300" />
                    {prettyJoin([a.street, a.ward, a.district, a.city])}
                  </p>

                  {/* Set default text button (if not default) */}
                  {!a.is_default && (
                    <button
                      disabled={busy}
                      onClick={() => handleSetDefault(a)}
                      className="mt-2 text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                    >
                      Đặt làm mặc định
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Warning if no default */}
      {!loading && addresses.length > 0 && !addresses.some((a) => a.is_default) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-warning bg-warning-50 border border-warning-200 rounded-xl px-3 py-2">
          <AlertCircle size={13} className="flex-shrink-0" />
          Chưa có địa chỉ mặc định. Hãy đặt một địa chỉ làm mặc định để thanh toán nhanh hơn.
        </div>
      )}

      {/* AddressDialog modal (shared with Checkout) */}
      <AddressDialog
        open={dialogOpen}
        initial={editTarget}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
