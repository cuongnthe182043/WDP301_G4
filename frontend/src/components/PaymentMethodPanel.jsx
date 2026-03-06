import React from "react";
import { Chip } from "@heroui/react";
import { Info, ShieldCheck } from "lucide-react";

/**
 * PaymentMethodPanel
 * Shows contextual detail for the selected payment method.
 * Used in checkout flows that need a sub-detail panel below the radio selector.
 *
 * Props:
 *   method — currently selected method string ("COD" | "PAYPAL" | "VNPAY")
 */
export default function PaymentMethodPanel({ method }) {
  if (method === "PAYPAL") {
    return (
      <div className="border border-default-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-blue-600" />
          <span className="font-bold">PayPal</span>
          <Chip size="sm" variant="flat" color="primary">Sandbox</Chip>
        </div>
        <p className="text-sm text-default-500">
          Nhấn nút PayPal bên dưới để xác nhận thanh toán qua tài khoản PayPal Sandbox của bạn.
        </p>
        <div className="flex items-start gap-1 text-xs text-default-400">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Cửa sổ PayPal sẽ mở ra để bạn đăng nhập và xác nhận. Đây là môi trường thử nghiệm (Sandbox) —
            không có tiền thật được thu.
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
          Nhấn "Thanh toán qua VNPAY" để được chuyển đến cổng thanh toán VNPAY Sandbox.
        </p>
        <div className="flex items-start gap-1 text-xs text-default-400">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Hỗ trợ ATM nội địa, Visa/Mastercard, QR Code. Đây là môi trường Sandbox —
            không có tiền thật được thu. Chữ ký SHA512 được xác thực tự động khi trả về.
          </span>
        </div>
      </div>
    );
  }

  // COD or fallback
  return null;
}
