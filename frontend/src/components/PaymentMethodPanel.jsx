import React from "react";
import { Chip } from "@heroui/react";
import { Info, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * PaymentMethodPanel
 * Shows contextual detail for the selected payment method.
 * Used in checkout flows that need a sub-detail panel below the radio selector.
 *
 * Props:
 *   method — currently selected method string ("COD" | "PAYPAL" | "VNPAY")
 */
export default function PaymentMethodPanel({ method }) {
  const { t } = useTranslation();

  if (method === "PAYPAL") {
    return (
      <div className="border border-default-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-blue-600" />
          <span className="font-bold">PayPal</span>
          <Chip size="sm" variant="flat" color="primary">Sandbox</Chip>
        </div>
        <p className="text-sm text-default-500">
          {t("checkout.paypal_desc")}
        </p>
        <div className="flex items-start gap-1 text-xs text-default-400">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            {t("checkout.paypal_info")}
          </span>
        </div>
      </div>
    );
  }

  if (method === "VNPAY") {
    return (
      <div className="border border-default-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-blue-600" />
          <span className="font-bold">VNPAY</span>
          <Chip size="sm" variant="flat" color="warning">Sandbox</Chip>
        </div>
        <p className="text-sm text-default-500">
          {t("checkout.vnpay_desc")}
        </p>
        <div className="flex items-start gap-1 text-xs text-default-400">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            {t("checkout.vnpay_info")}
          </span>
        </div>
      </div>
    );
  }

  // COD or fallback
  return null;
}
