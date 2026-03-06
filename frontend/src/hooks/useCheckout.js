// hooks/useCheckout.js
//
// Centralises all checkout state and logic for Checkout.jsx.
// Handles both flows:
//   - Cart flow:     loc.state.selected_item_ids = [cartItemId, ...]
//   - Buy Now flow:  loc.state.buy_now_items = [{ productId, variantId, quantity }]
//
// The correct payload key is forwarded transparently to the backend.

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
  const buyNowItems = loc.state?.buy_now_items  || null;   // [{ productId, variantId, quantity }]
  const selectedIds = loc.state?.selected_item_ids || [];  // [cartItemId, ...]
  const isBuyNow    = Array.isArray(buyNowItems) && buyNowItems.length > 0;

  // ── State ──────────────────────────────────────────────────────────────────
  const [addresses,      setAddresses]     = useState([]);
  const [addressId,      setAddressId]     = useState("");
  const [shipper,        setShipper]       = useState("GHN");
  const [voucherCode,    setVoucherCode]   = useState("");
  const [note,           setNote]          = useState("");
  const [method,         setMethod]        = useState("COD");
  const [preview,        setPreview]       = useState(null);
  const [loadingPay,     setLoadingPay]    = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [paypalKey,      setPaypalKey]     = useState(0);
  const [loadingVNPay,   setLoadingVNPay]  = useState(false);

  // ── Items payload (backend accepts either key) ─────────────────────────────
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
        if (prev) return prev;                       // keep if already set
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
        address_id:        addressId,
        shipping_provider: shipper,
        voucher_code:      voucherCode || undefined,
      });
      setPreview(p);
      setPaypalKey(k => k + 1);
    } catch (e) {
      setPreview(null);
      toast.error(e?.response?.data?.message || e.message || "Không tính được tạm tính");
    } finally {
      setLoadingPreview(false);
    }
  }, [addressId, shipper, voucherCode, isBuyNow, selectedIds, buyNowItems]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => { loadAddresses(); }, [loadAddresses]);
  useEffect(() => { if (addressId) runPreview(); }, [addressId, shipper, voucherCode]);

  // ── Place COD order ────────────────────────────────────────────────────────
  const onPlaceCOD = async () => {
    if (!addressId) return toast.error("Vui lòng chọn địa chỉ nhận hàng");
    if (!preview)   return toast.error("Chưa có tạm tính. Vui lòng thử lại.");
    setLoadingPay(true);
    try {
      await checkoutService.confirm({
        ...itemsPayload,
        address_id:        addressId,
        note,
        shipping_provider: shipper,
        voucher_code:      voucherCode || undefined,
        payment_method:    "COD",
      });
      toast.success("Đặt hàng thành công!");
      nav("/orders");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Đặt hàng thất bại");
    } finally {
      setLoadingPay(false);
    }
  };

  // ── Place VNPAY order ───────────────────────────────────────────────────────
  const onPlaceVNPAY = async () => {
    if (!addressId) return toast.error("Vui lòng chọn địa chỉ nhận hàng");
    if (!preview)   return toast.error("Chưa có tạm tính. Vui lòng thử lại.");
    setLoadingVNPay(true);
    try {
      // Step 1: create the order in DB with payment_method = VNPAY
      const { order_id } = await checkoutService.confirm({
        ...itemsPayload,
        address_id:        addressId,
        note,
        shipping_provider: shipper,
        voucher_code:      voucherCode || undefined,
        payment_method:    "VNPAY",
      });
      // Step 2: get VNPAY payment URL from backend
      const { payUrl } = await checkoutService.createVNPayUrl(order_id);
      // Step 3: redirect user to VNPAY sandbox — backend verifies on return
      window.location.href = payUrl;
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Không thể tạo thanh toán VNPAY");
      setLoadingVNPay(false);
    }
    // intentionally no finally { setLoading(false) } — page navigates away on success
  };

  // ── PayPal payload (amount always read by backend — never sent from client) ─
  const paypalPayload = {
    ...itemsPayload,
    address_id:        addressId,
    note,
    shipping_provider: shipper,
    voucher_code:      voucherCode || undefined,
  };

  return {
    // mode
    isBuyNow,
    selectedIds,
    buyNowItems,
    // address
    addresses,
    addressId,
    setAddressId,
    loadAddresses,
    // options
    shipper,       setShipper,
    voucherCode,   setVoucherCode,
    note,          setNote,
    method,        setMethod,
    // preview
    preview,
    loadingPreview,
    runPreview,
    // order placement
    loadingPay,
    onPlaceCOD,
    loadingVNPay,
    onPlaceVNPAY,
    paypalPayload,
    paypalKey,
  };
}
