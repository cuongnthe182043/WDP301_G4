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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.error(e?.response?.data?.message || e.message || t("profile.address_load_failed"));
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
        toast.success(t("profile.address_updated"));
      } else {
        await addressService.create(payload);
        toast.success(t("profile.address_added"));
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
      title:       t("profile.delete_address_title"),
      description: `${t("profile.delete_address_confirm_named", { name: a.name })} — ${prettyJoin([a.street, a.city])}?`,
      confirmText: t("common.delete"),
      danger:      true,
    });
    if (!ok) return;
    setActionId(a._id);
    try {
      await addressService.remove(a._id);
      toast.success(t("profile.address_deleted"));
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || t("profile.address_delete_failed"));
    } finally {
      setActionId(null);
    }
  };

  const handleSetDefault = async (a) => {
    setActionId(a._id);
    try {
      await addressService.setDefault(a._id);
      toast.success(t("profile.address_set_default_success", { name: a.name }));
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || t("profile.set_default_failed"));
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
          <h3 className="font-black text-default-900 text-base">{t("profile.delivery_addresses")}</h3>
          <p className="text-xs text-default-400 mt-0.5">
            {t("profile.default_address_hint")}
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
          {t("profile.add_address_btn")}
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
          <p className="font-semibold text-default-600 mb-1">{t("profile.no_addresses")}</p>
          <p className="text-sm text-default-400 mb-4">{t("profile.add_address_cta")}</p>
          <Button
            color="primary"
            size="sm"
            radius="lg"
            variant="flat"
            startContent={<Plus size={14} />}
            onPress={openCreate}
          >
            {t("profile.add_first_address")}
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
                          {t("profile.default_address")}
                        </Chip>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        aria-label={t("common.edit")}
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
                          aria-label={t("profile.set_default")}
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
                        aria-label={t("common.delete")}
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
                      {t("profile.set_as_default")}
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
          {t("profile.no_default_warning")}
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
