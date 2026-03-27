import React, { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea } from "@heroui/react";
import { ShieldBan, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import moderationService from "../../services/moderationService";

/**
 * BanNoticePopup
 *
 * Shows a modal when the user is banned. Allows submitting an appeal.
 * Place this in the App.jsx or main layout so it's always active.
 * Supports bilingual display (EN / VI) via i18n.
 */
export default function BanNoticePopup() {
  const { t, i18n } = useTranslation();
  const [banInfo, setBanInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSending, setAppealSending] = useState(false);
  const [appealSent, setAppealSent] = useState(false);

  const locale = i18n.language === "vi" ? "vi-VN" : "en-US";

  useEffect(() => {
    // Check ban status on mount
    moderationService.getBanStatus()
      .then((data) => {
        if (data.is_banned) {
          setBanInfo(data);
          setOpen(true);
        }
      })
      .catch(() => {}); // ignore if not logged in or endpoint unavailable
  }, []);

  if (!banInfo) return null;

  const isPermanent = banInfo.ban_type === "permanent";
  const banEndFormatted = banInfo.ban_end
    ? new Date(banInfo.ban_end).toLocaleDateString(locale)
    : null;

  async function handleAppeal() {
    if (!appealReason.trim()) return;
    setAppealSending(true);
    try {
      await moderationService.submitAppeal({ reason: appealReason });
      setAppealSent(true);
      toast.success(t("moderation_account.appeal_success"));
    } catch (e) {
      toast.error(e.message || t("moderation_account.appeal_error"));
    } finally {
      setAppealSending(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} size="md" isDismissable={false} hideCloseButton={isPermanent}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 text-danger">
          <ShieldBan size={20} />
          {t("moderation_account.account_suspended_title")}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 text-sm text-danger-800">
              {isPermanent ? (
                <p>{t("moderation_account.account_suspended_permanent")}</p>
              ) : (
                <p>
                  {t("moderation_account.account_suspended_temporary", {
                    date: banEndFormatted || "—",
                  })}
                </p>
              )}
              {banInfo.ban_reason && (
                <p className="mt-2">
                  <strong>{t("moderation_account.ban_reason_label")}:</strong> {banInfo.ban_reason}
                </p>
              )}
            </div>

            <div className="text-xs text-default-500 space-y-1">
              <p>{t("moderation_account.ban_restrictions_title")}</p>
              <ul className="list-disc list-inside ml-2">
                <li>{t("moderation_account.ban_restriction_orders")}</li>
                <li>{t("moderation_account.ban_restriction_reviews")}</li>
                <li>{t("moderation_account.ban_restriction_messages")}</li>
                <li>{t("moderation_account.ban_restriction_shop")}</li>
                <li>{t("moderation_account.ban_restriction_cart")}</li>
                <li>{t("moderation_account.ban_restriction_payment")}</li>
              </ul>
            </div>

            {/* Appeal form */}
            {!appealSent ? (
              <div className="mt-4">
                <p className="text-sm font-semibold text-default-700 mb-2">
                  {t("moderation_account.appeal_title")}
                </p>
                <Textarea
                  placeholder={t("moderation_account.appeal_placeholder")}
                  value={appealReason}
                  onValueChange={setAppealReason}
                  minRows={3}
                />
              </div>
            ) : (
              <div className="bg-success-50 border border-success-200 rounded-xl p-3 text-sm text-success-700">
                {t("moderation_account.appeal_success")}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          {!isPermanent && (
            <Button variant="flat" onPress={() => setOpen(false)}>
              {t("common.close")}
            </Button>
          )}
          {!appealSent && (
            <Button
              color="primary"
              startContent={<Send size={14} />}
              isLoading={appealSending}
              isDisabled={!appealReason.trim()}
              onPress={handleAppeal}
            >
              {t("moderation_account.appeal_submit")}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
