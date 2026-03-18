import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Chip
} from "@heroui/react";
import { User, MapPin, Star, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "./common/ToastProvider";
import { addressService } from "../services/addressService";

const prettyJoin = (parts = []) =>
  parts
    .map((x) => String(x || "").trim())
    .filter((x) => x && x !== "-" && x !== "—")
    .join(", ");

export default function AddressDialogPicker({
  open,
  onClose,
  addresses = [],
  selectedId,
  onSelect,
  onAddNew,
  onEdit,
  onSetDefault,
  onRefresh,
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [localSel, setLocalSel] = useState(selectedId || "");
  const [confirmId, setConfirmId] = useState("");

  useEffect(() => {
    if (open) setLocalSel(selectedId || "");
  }, [open, selectedId]);

  const choose = () => {
    if (!localSel) return;
    onSelect?.(localSel);
    onClose?.();
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await (addressService.remove
        ? addressService.remove(confirmId)
        : addressService.delete(confirmId));
      toast.success(t("profile.address_deleted"));
      setConfirmId("");
      await onRefresh?.();
      if (localSel === confirmId) {
        const first = (addresses || []).find((x) => x._id !== confirmId);
        setLocalSel(first ? first._id : "");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || t("profile.address_delete_failed"));
    }
  };

  return (
    <>
      <Modal isOpen={open} onClose={onClose} size="lg" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{t("profile.select_delivery_address")}</ModalHeader>
          <ModalBody
            className="space-y-2 pb-2"
            style={{ background: "linear-gradient(180deg, #f6fbff 0%, #ffffff 100%)" }}
          >
            {!addresses || addresses.length === 0 ? (
              <p className="text-sm text-default-500">
                {t("profile.no_address_prompt")}
              </p>
            ) : (
              <div className="space-y-3">
                {addresses.map((a) => {
                  const selected = localSel === a._id;
                  return (
                    <div
                      key={a._id}
                      onClick={() => setLocalSel(a._id)}
                      className={[
                        "cursor-pointer rounded-xl border p-3 transition-all",
                        selected
                          ? "border-primary bg-primary-50"
                          : "border-default-200 bg-white hover:-translate-y-px hover:shadow-md",
                      ].join(" ")}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Custom radio indicator */}
                          <span className={[
                            "flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                            selected ? "border-primary" : "border-default-300",
                          ].join(" ")}>
                            {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </span>
                          <User size={15} className="text-default-400 flex-shrink-0" />
                          <span className="font-semibold text-sm truncate">{a.name}</span>
                          <Chip size="sm" variant="flat">{a.phone}</Chip>
                          {a.is_default && (
                            <Chip size="sm" color="warning" startContent={<Star size={12} />}>
                              {t("profile.default_address")}
                            </Chip>
                          )}
                        </div>

                        {/* Actions */}
                        <div
                          className="flex items-center gap-1 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="light"
                            startContent={<Pencil size={13} />}
                            onPress={() => onEdit?.(a)}
                          >
                            {t("common.edit")}
                          </Button>
                          {!a.is_default && (
                            <Button
                              size="sm"
                              variant="light"
                              startContent={<Star size={13} />}
                              onPress={async () => { await onSetDefault?.(a._id); }}
                            >
                              {t("profile.set_default")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            startContent={<Trash2 size={13} />}
                            onPress={() => setConfirmId(a._id)}
                          >
                            {t("common.delete")}
                          </Button>
                        </div>
                      </div>

                      {/* Address line */}
                      <div className="flex items-center gap-2 mt-1.5 pl-6 text-sm text-default-500">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span>{prettyJoin([a.street, a.ward, a.district, a.city])}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ModalBody>
          <ModalFooter className="justify-between">
            <Button variant="light" startContent={<Plus size={15} />} onPress={() => onAddNew?.()}>
              {t("profile.add_address_btn")}
            </Button>
            <div className="flex gap-2">
              <Button variant="light" onPress={onClose}>{t("common.close")}</Button>
              <Button color="primary" isDisabled={!localSel} onPress={choose}>
                {t("profile.use_this_address")}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirm delete */}
      <Modal isOpen={!!confirmId} onClose={() => setConfirmId("")} size="sm">
        <ModalContent>
          <ModalHeader>{t("profile.delete_address_title")}</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              {t("profile.delete_address_confirm")}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setConfirmId("")}>{t("common.cancel")}</Button>
            <Button color="danger" onPress={doDelete}>{t("common.delete")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
