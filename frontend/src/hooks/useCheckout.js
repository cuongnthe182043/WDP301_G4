// hooks/useCheckout.js
//
// Centralises all checkout state and logic for Checkout.jsx.
// Handles both flows:
//   - Cart flow:     loc.state.selected_item_ids = [cartItemId, ...]
//   - Buy Now flow:  loc.state.buy_now_items = [{ productId, variantId, quantity }]

import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addressService }  from "../services/addressService";
import { checkoutService } from "../services/checkoutService";
import { useToast }        from "../components/common/ToastProvider";

export function useCheckout() {
  const toast = useToast();
  const nav   = useNavigate();
  const loc   = useLocation();

  // ── Detect mode ────────────────────────────────────────────────────────────
  const buyNowItems = loc.state?.buy_now_items  || null;
  const selectedIds = loc.state?.selected_item_ids || [];
  const isBuyNow    = Array.isArray(buyNowItems) && buyNowItems.length > 0;

  // ── State ──────────────────────────────────────────────────────────────────
  const [addresses,             setAddresses]            = useState([]);
  const [addressId,             setAddressId]            = useState("");
  const [voucherCode,           setVoucherCode]          = useState(loc.state?.voucher_code || "");
  const [shippingVoucherCode,   setShippingVoucherCode]  = useState("");
  const [creditsToUse,          setCreditsToUse]         = useState({});
  const [note,                  setNote]                 = useState("");
  const [method,                setMethod]               = useState("COD");
  const [preview,               setPreview]              = useState(null);
  const [loadingPay,            setLoadingPay]           = useState(false);
  const [loadingPreview,        setLoadingPreview]       = useState(false);
  const [paypalKey,             setPaypalKey]            = useState(0);
  const [loadingVNPay,          setLoadingVNPay]         = useState(false);

  const setShopCredits = (shopId, amount) =>
    setCreditsToUse(prev => ({ ...prev, [shopId]: amount }));

  // ── Items payload ─────────────────────────────────────────────────────────
  const itemsPayload = isBuyNow
    ? { buy_now_items: buyNowItems }
    : { selected_item_ids: selectedIds };

  // ── Address helpers ────────────────────────────────────────────────────────
  const loadAddresses = useCallback(async () => {
    try {
      const list = await addressService.list();
      const arr  = Array.isArray(list) ? list : [];
      setAddresses(arr);
      setAddressId(prev => {
        if (prev) return prev;
        const d = arr.find(x => x.is_default) || arr[0];
        return d?._id || "";
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Không tải được địa chỉ");
    }
  }, []);

  // ── Preview ────────────────────────────────────────────────────────────────
  const runPreview = useCallback(async () => {
    if (!addressId) return;
    if (!isBuyNow && !selectedIds.length) return;
    try {
      setLoadingPreview(true);
      const p = await checkoutService.preview({
        ...itemsPayload,
        address_id:            addressId,
        voucher_code:          voucherCode || undefined,
        shipping_voucher_code: shippingVoucherCode || undefined,
        credits_to_use:        Object.keys(creditsToUse).length ? creditsToUse : undefined,
      });
      setPreview(p);
      setPaypalKey(k => k + 1);
    } catch (e) {
      setPreview(null);
      toast.error(e?.response?.data?.message || e.message || "Không tính được tạm tính");
    } finally {
      setLoadingPreview(false);
    }
  }, [addressId, voucherCode, shippingVoucherCode, creditsToUse, isBuyNow, selectedIds, buyNowItems]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => { loadAddresses(); }, [loadAddresses]);
  useEffect(() => { if (addressId) runPreview(); }, [addressId, voucherCode, shippingVoucherCode, creditsToUse]);

  // ── Build common payload ──────────────────────────────────────────────────
  const buildPayload = (extraMethod) => ({
    ...itemsPayload,
    address_id:            addressId,
    note,
    voucher_code:          voucherCode || undefined,
    shipping_voucher_code: shippingVoucherCode || undefined,
    credits_to_use:        Object.keys(creditsToUse).length ? creditsToUse : undefined,
    ...(extraMethod ? { payment_method: extraMethod } : {}),
  });

  // ── Place COD order ────────────────────────────────────────────────────────
  const onPlaceCOD = async () => {
    if (!addressId) return toast.error("Vui lòng chọn địa chỉ nhận hàng");
    if (!preview)   return toast.error("Chưa có tạm tính. Vui lòng thử lại.");
    setLoadingPay(true);
    try {
      await checkoutService.confirm(buildPayload("COD"));
      toast.success("Đặt hàng thành công!");
      nav("/orders");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Đặt hàng thất bại");
    } finally {
      setLoadingPay(false);
    }
  };

  // ── Place VNPAY order ─────────────────────────────────────────────────────
  const onPlaceVNPAY = async () => {
    if (!addressId) return toast.error("Vui lòng chọn địa chỉ nhận hàng");
    if (!preview)   return toast.error("Chưa có tạm tính. Vui lòng thử lại.");
    setLoadingVNPay(true);
    try {
      const { order_id } = await checkoutService.confirm(buildPayload("VNPAY"));
      const { payUrl } = await checkoutService.createVNPayUrl(order_id);
      window.location.href = payUrl;
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Không thể tạo thanh toán VNPAY");
      setLoadingVNPay(false);
    }
  };

  // ── PayPal payload ────────────────────────────────────────────────────────
  const paypalPayload = buildPayload();

  return {
    isBuyNow, selectedIds, buyNowItems,
    addresses, addressId, setAddressId, loadAddresses,
    voucherCode,         setVoucherCode,
    shippingVoucherCode, setShippingVoucherCode,
    creditsToUse, setShopCredits,
    note, setNote,
    method, setMethod,
    preview, loadingPreview, runPreview,
    loadingPay, onPlaceCOD,
    loadingVNPay, onPlaceVNPAY,
    paypalPayload, paypalKey,
  };
}
