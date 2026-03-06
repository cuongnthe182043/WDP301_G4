import React, { useCallback, useRef } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useNavigate } from "react-router-dom";
import { useToast } from "./common/ToastProvider";
import { checkoutService } from "../services/checkoutService";
import apiClient from "../services/apiClient";

/**
 * PayPalCheckout
 *
 * Props:
 *   checkoutPayload  — the full checkout data (same shape as checkoutService.confirm)
 *                      { selected_item_ids, address_id, note, shipping_provider, voucher_code }
 *   onSuccess        — optional callback after successful capture
 *   onError          — optional callback on error
 *
 * Flow:
 *   1. User clicks PayPal button → createOrder is called
 *   2. createOrder calls /checkout/confirm to create a DB order (deduped via dbOrderIdRef)
 *   3. createOrder then calls /payment/create-order to get a PayPal order ID
 *   4. User approves in PayPal popup
 *   5. onApprove calls /payment/capture-order → settles DB order
 *   6. Redirect to /payment/return?status=success
 *
 * IMPORTANT: amount is never calculated on the frontend — it is always read
 * from the DB order by the backend.
 */
export default function PayPalCheckout({ checkoutPayload, onSuccess, onError }) {
  const nav   = useNavigate();
  const toast = useToast();

  // Ref prevents creating duplicate DB orders if user cancels and retries PayPal
  const dbOrderIdRef = useRef(null);

  const createOrder = useCallback(async () => {
    try {
      // Create DB order only once per PayPalCheckout mount
      if (!dbOrderIdRef.current) {
        const result = await checkoutService.confirm({
          ...checkoutPayload,
          payment_method: "PAYPAL",
        });
        dbOrderIdRef.current = result.order_id;
      }

      // Ask backend to create a PayPal order for this DB order
      const res = await apiClient.post("/payment/create-order", {
        orderId: dbOrderIdRef.current,
      });

      return res.data.data.paypalOrderId;
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không tạo được đơn hàng";
      toast.error(msg);
      onError?.(e);
      throw e; // must re-throw so PayPal SDK knows creation failed
    }
  }, [checkoutPayload, toast, onError]);

  const onApprove = useCallback(async (data) => {
    try {
      const res = await apiClient.post("/payment/capture-order", {
        paypalOrderId: data.orderID,
        orderId: dbOrderIdRef.current,
      });

      toast.success("Thanh toán PayPal thành công!");
      onSuccess?.(res.data.data);

      // Redirect to result page
      const code = res.data.data?.order?.order_code || dbOrderIdRef.current;
      nav(`/payment/return?status=success&order_code=${encodeURIComponent(code)}`);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Thanh toán thất bại";
      toast.error(msg);
      onError?.(e);
    }
  }, [nav, toast, onSuccess, onError]);

  const handleError = useCallback((err) => {
    console.error("PAYPAL_SDK_ERROR:", err);
    toast.error("Có lỗi khi kết nối với PayPal. Vui lòng thử lại.");
    onError?.(err);
  }, [toast, onError]);

  const handleCancel = useCallback(() => {
    toast.error("Bạn đã huỷ thanh toán PayPal.");
  }, [toast]);

  return (
    <PayPalScriptProvider
      options={{
        "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
        currency: "USD",
        intent: "capture",
      }}
    >
      <PayPalButtons
        style={{ layout: "vertical", shape: "rect", label: "pay" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={handleError}
        onCancel={handleCancel}
      />
    </PayPalScriptProvider>
  );
}
