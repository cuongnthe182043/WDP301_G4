import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link as RouterLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import { CheckCircle2, XCircle, Home, Receipt } from "lucide-react";

/**
 * PaymentReturn page
 *
 * URL params:
 *   status=success|fail   — result of the PayPal capture (set by PayPalCheckout)
 *   order_code            — DB order code (optional, shown to user)
 */
export default function PaymentReturn() {
  const nav = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const status = params.get("status") || "fail";
  const orderCode = params.get("order_code") || params.get("orderId") || "";
  const isSuccess = status === "success";

  const [count, setCount] = useState(5);
  useEffect(() => {
    const t = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (count === 0) nav("/");
  }, [count, nav]);

  return (
    <div
      className="min-h-dvh grid place-items-center p-4"
      style={{ background: "linear-gradient(160deg, #f0f7ff 0%, #fff 60%)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="max-w-md w-full"
      >
        <Card radius="2xl" shadow="md" className="border border-default-100">
          <CardBody className="p-10 text-center flex flex-col items-center gap-5">

            {/* Animated icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 18, delay: 0.15 }}
            >
              {isSuccess ? (
                <div className="w-24 h-24 rounded-full bg-success-50 flex items-center justify-center">
                  <CheckCircle2 size={56} className="text-success" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-danger-50 flex items-center justify-center">
                  <XCircle size={56} className="text-danger" />
                </div>
              )}
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-black text-default-900">
                {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
              </h2>
              {!!orderCode && (
                <Chip color={isSuccess ? "success" : "danger"} variant="flat" size="sm">
                  Mã đơn: {orderCode}
                </Chip>
              )}
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm text-default-500 leading-relaxed"
            >
              {isSuccess
                ? "Cảm ơn bạn đã mua hàng tại DFS. Đơn hàng của bạn đang được xử lý."
                : "Có lỗi trong quá trình thanh toán. Bạn có thể thử lại hoặc chọn COD."}
            </motion.p>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex gap-3 mt-2"
            >
              <Button
                as={RouterLink} to="/"
                variant="bordered" radius="xl"
                startContent={<Home size={15} />}
                className="font-semibold"
              >
                Trang chủ ({count}s)
              </Button>
              <Button
                as={RouterLink} to="/orders"
                color="primary" radius="xl"
                startContent={<Receipt size={15} />}
                className="font-semibold shadow-md"
              >
                Xem đơn hàng
              </Button>
            </motion.div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
