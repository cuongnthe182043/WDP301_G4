import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link as RouterLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Chip, Divider } from "@heroui/react";
import {
  CheckCircle2,
  XCircle,
  Home,
  Receipt,
  CreditCard,
  Hash,
  Calendar,
  Banknote,
  AlertCircle,
} from "lucide-react";

/**
 * Parse VNPAY YYYYMMDDHHmmss → locale string.
 * Returns empty string if input is invalid.
 */
function parseVNDate(s) {
  if (!s || s.length < 14) return "";
  try {
    const year   = s.slice(0, 4);
    const month  = s.slice(4, 6);
    const day    = s.slice(6, 8);
    const hour   = s.slice(8, 10);
    const minute = s.slice(10, 12);
    const second = s.slice(12, 14);
    const d = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`);
    return d.toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function formatVND(amount) {
  if (!amount) return "";
  return Number(amount).toLocaleString("vi-VN") + " ₫";
}

/** One labelled row in the details table */
function DetailRow({ icon: Icon, label, value, highlight }) {
  if (!value) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between py-2.5"
    >
      <span className="flex items-center gap-2 text-sm text-default-500">
        <Icon size={14} className="flex-shrink-0" />
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-primary-600 text-base" : "text-default-800"}`}
      >
        {value}
      </span>
    </motion.div>
  );
}

const VNPAY_RESPONSE_CODES = {
  "00": "Giao dịch thành công",
  "07": "Trừ tiền thành công, nghi ngờ gian lận",
  "09": "Thẻ / tài khoản chưa đăng ký dịch vụ InternetBanking",
  "10": "Xác thực thông tin thẻ / tài khoản quá 3 lần",
  "11": "Hết hạn chờ thanh toán",
  "12": "Thẻ / tài khoản bị khoá",
  "13": "Sai mật khẩu OTP",
  "24": "Giao dịch bị hủy",
  "51": "Tài khoản không đủ số dư",
  "65": "Vượt hạn mức giao dịch trong ngày",
  "75": "Ngân hàng thanh toán đang bảo trì",
  "79": "Nhập sai mật khẩu thanh toán quá số lần quy định",
  "99": "Lỗi không xác định",
};

export default function PaymentReturn() {
  const nav = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const status    = params.get("status")     || "fail";
  const orderCode = params.get("order_code") || params.get("orderId") || "";
  const txnNo     = params.get("txn_no")     || "";
  const bank      = params.get("bank")       || "";
  const amount    = params.get("amount")     || "";
  const payDate   = params.get("pay_date")   || "";
  const code      = params.get("code")       || "";
  const reason    = params.get("reason")     || "";

  const isSuccess  = status === "success";
  const payDateStr = parseVNDate(payDate);
  const errorMsg   = code ? (VNPAY_RESPONSE_CODES[code] || `Mã lỗi: ${code}`) : "";

  const [count, setCount] = useState(isSuccess ? 8 : 15);
  useEffect(() => {
    const t = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (count === 0) nav(isSuccess ? "/orders" : "/");
  }, [count, nav, isSuccess]);

  const hasDetails = !!(orderCode || txnNo || amount || bank || payDateStr);

  return (
    <div
      className="min-h-dvh grid place-items-center p-4"
      style={{
        background: isSuccess
          ? "linear-gradient(160deg, #f0fff4 0%, #ecfdf5 40%, #f0f9ff 100%)"
          : "linear-gradient(160deg, #fff1f2 0%, #fef2f2 40%, #fff 100%)",
      }}
    >
      {/* Ambient blob */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          style={{
            position: "absolute",
            width: 500, height: 500,
            top: -100, right: -100,
            borderRadius: "50%",
            background: isSuccess
              ? "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="relative z-10 max-w-md w-full"
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "#fff",
            boxShadow: isSuccess
              ? "0 8px 40px rgba(34,197,94,0.14), 0 2px 12px rgba(0,0,0,0.06)"
              : "0 8px 40px rgba(239,68,68,0.12), 0 2px 12px rgba(0,0,0,0.06)",
            border: `1.5px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {/* Coloured top strip */}
          <div
            style={{
              height: 5,
              background: isSuccess
                ? "linear-gradient(90deg, #22c55e, #4ade80)"
                : "linear-gradient(90deg, #ef4444, #f87171)",
            }}
          />

          <div className="p-8 flex flex-col items-center gap-5 text-center">

            {/* Animated icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 18, delay: 0.12 }}
            >
              {isSuccess ? (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #dcfce7, #bbf7d0)" }}
                >
                  <CheckCircle2 size={54} style={{ color: "#16a34a" }} />
                </div>
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #fee2e2, #fecaca)" }}
                >
                  <XCircle size={54} style={{ color: "#dc2626" }} />
                </div>
              )}
            </motion.div>

            {/* Title & order chip */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="space-y-2"
            >
              <h2
                className="text-2xl font-black"
                style={{ color: isSuccess ? "#15803d" : "#b91c1c" }}
              >
                {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
              </h2>

              {!!orderCode && (
                <Chip
                  color={isSuccess ? "success" : "danger"}
                  variant="flat"
                  size="sm"
                  startContent={<Hash size={11} />}
                >
                  Đơn hàng: {orderCode}
                </Chip>
              )}

              {!isSuccess && errorMsg && (
                <div
                  className="flex items-center gap-1.5 justify-center text-xs mt-1"
                  style={{ color: "#b91c1c" }}
                >
                  <AlertCircle size={12} />
                  {errorMsg}
                </div>
              )}

              {!isSuccess && reason === "invalid_signature" && (
                <p className="text-xs text-danger-500">Chữ ký xác thực không hợp lệ</p>
              )}
              {!isSuccess && reason === "server_error" && (
                <p className="text-xs text-danger-500">Lỗi máy chủ khi xử lý giao dịch</p>
              )}
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="text-sm leading-relaxed"
              style={{ color: "#6b7280" }}
            >
              {isSuccess
                ? "Cảm ơn bạn đã mua hàng tại Daily Fit! Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn."
                : "Giao dịch không thành công. Đơn hàng vẫn được giữ — bạn có thể thử lại hoặc chọn hình thức thanh toán khác."}
            </motion.p>

            {/* Detail table */}
            <AnimatePresence>
              {hasDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: 0.38, duration: 0.32 }}
                  className="w-full rounded-2xl px-4 py-1"
                  style={{
                    background: isSuccess ? "#f0fdf4" : "#fff1f2",
                    border: `1px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  {amount && (
                    <DetailRow icon={Banknote} label="Số tiền" value={formatVND(amount)} highlight />
                  )}
                  {amount && (orderCode || txnNo || bank || payDateStr) && (
                    <Divider className="my-0.5" />
                  )}
                  <DetailRow icon={Hash}       label="Mã đơn hàng"    value={orderCode} />
                  <DetailRow icon={CreditCard} label="Mã giao dịch"   value={txnNo} />
                  <DetailRow icon={Banknote}   label="Ngân hàng"       value={bank} />
                  <DetailRow icon={Calendar}   label="Thời gian"       value={payDateStr} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Countdown */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs"
              style={{ color: "#9ca3af" }}
            >
              Tự động chuyển đến{" "}
              <span className="font-semibold" style={{ color: isSuccess ? "#16a34a" : "#6b7280" }}>
                {isSuccess ? "đơn hàng" : "trang chủ"}
              </span>{" "}
              sau <span className="font-bold">{count}s</span>
            </motion.p>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex gap-3 mt-1 w-full"
            >
              <Button
                as={RouterLink}
                to="/"
                variant="bordered"
                radius="xl"
                startContent={<Home size={15} />}
                className="font-semibold flex-1"
              >
                Trang chủ
              </Button>
              <Button
                as={RouterLink}
                to="/orders"
                color={isSuccess ? "success" : "primary"}
                radius="xl"
                startContent={<Receipt size={15} />}
                className="font-bold flex-1 shadow-md text-white"
              >
                Xem đơn hàng
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
