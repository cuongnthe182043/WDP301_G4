import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card, CardBody, Button, Divider, Input, Radio, RadioGroup, Chip, Spinner,
} from "@heroui/react";
import { ArrowLeft, User, MapPin, Star, Truck, Home, CreditCard, Banknote, Gift } from "lucide-react";
import { addressService }  from "../../services/addressService";
import { formatCurrency }  from "../../utils/formatCurrency";
import { useToast }        from "../../components/common/ToastProvider";
import AddressDialog       from "../../components/AddressDialog";
import AddressDialogPicker from "../../components/AddressDialogPicker";
import PayPalCheckout      from "../../components/PayPalCheckout";
import { useCheckout }     from "../../hooks/useCheckout";

function PaymentMethodPanel({ value, onChange, disabled }) {
  const methods = [
    { val: "COD",    label: "Thanh toán khi nhận hàng (COD)", icon: Banknote },
    { val: "PAYPAL", label: "PayPal (Sandbox)",               icon: CreditCard },
    { val: "VNPAY",  label: "VNPAY (Sandbox)",                icon: CreditCard },
  ];
  return (
    <Card radius="xl" shadow="sm" className={`flex-1 border border-default-100 ${disabled ? "opacity-60" : ""}`}>
      <CardBody className="p-5">
        <h3 className="font-bold text-default-900 mb-3">Phương thức thanh toán</h3>
        <RadioGroup value={value} onValueChange={onChange} isDisabled={disabled}>
          {methods.map(({ val, label, icon: Icon }) => (
            <Radio key={val} value={val}>
              <div className="flex items-center gap-2 text-sm">
                <Icon size={15} className="text-default-400 flex-shrink-0" />
                {label}
              </div>
            </Radio>
          ))}
        </RadioGroup>
      </CardBody>
    </Card>
  );
}

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35 } }),
};

const prettyJoin = (parts = []) =>
  parts.map(x => String(x || "").trim()).filter(x => x && x !== "-" && x !== "—").join(", ");

export default function Checkout() {
  const toast = useToast();
  const nav   = useNavigate();

  const {
    isBuyNow,
    addresses, addressId, setAddressId, loadAddresses,
    shipper,       setShipper,
    voucherCode,   setVoucherCode,
    creditsToUse,  setShopCredits,
    note,          setNote,
    method,        setMethod,
    preview,       loadingPreview, runPreview,
    loadingPay,    onPlaceCOD,
    loadingVNPay,  onPlaceVNPAY,
    paypalPayload, paypalKey,
  } = useCheckout();

  const [openPicker,   setOpenPicker]   = useState(false);
  const [openAddrForm, setOpenAddrForm] = useState(false);
  const [editAddr,     setEditAddr]     = useState(null);

  const currentAddr = addresses.find(a => a._id === addressId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh py-8"
      style={{ background: "linear-gradient(160deg, #f0f7ff 0%, #fff 50%)" }}
    >
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <h1 className="text-xl font-black text-default-900">Thanh toán</h1>
          {isBuyNow ? (
            <Button
              variant="bordered" size="sm" radius="lg"
              startContent={<ArrowLeft size={15} />}
              className="text-default-600"
              onPress={() => nav(-1)}
            >
              Quay lại
            </Button>
          ) : (
            <Button
              as={RouterLink} to="/cart"
              variant="bordered" size="sm" radius="lg"
              startContent={<ArrowLeft size={15} />}
              className="text-default-600"
            >
              Quay lại giỏ hàng
            </Button>
          )}
        </div>

        {/* ── Address ── */}
        <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="show">
          <Card radius="xl" shadow="sm" className="mb-4 border border-default-100">
            <CardBody className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-default-900 flex items-center gap-2">
                  <Home size={16} className="text-primary" /> Địa chỉ nhận hàng
                </h3>
                <Button size="sm" variant="light" color="primary" radius="lg" onPress={() => setOpenPicker(true)}>
                  Thay đổi
                </Button>
              </div>
              {currentAddr ? (
                <div className="border border-default-200 rounded-xl p-3 bg-default-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User size={14} className="text-default-400" />
                    <span className="font-semibold text-sm">{currentAddr.name}</span>
                    <Chip size="sm" variant="flat">{currentAddr.phone}</Chip>
                    {currentAddr.is_default && (
                      <Chip size="sm" color="warning" startContent={<Star size={11} />}>Mặc định</Chip>
                    )}
                  </div>
                  <p className="text-sm text-default-500 mt-1 flex items-start gap-1">
                    <MapPin size={13} className="flex-shrink-0 mt-0.5" />
                    {prettyJoin([currentAddr.street, currentAddr.ward, currentAddr.district, currentAddr.city])}
                  </p>
                </div>
              ) : (
                <div className="border border-dashed border-default-300 rounded-xl p-4 text-center">
                  <p className="text-sm text-default-500">Chưa có địa chỉ.</p>
                  <Button size="sm" color="primary" variant="flat" radius="lg" className="mt-2" onPress={() => setOpenPicker(true)}>
                    Thêm địa chỉ
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* ── Products preview ── */}
        <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="show">
          <Card radius="xl" shadow="sm" className="mb-4 border border-default-100">
            <CardBody className="p-5">
              <h3 className="font-bold text-default-900 mb-3">Sản phẩm đã chọn</h3>
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-sm text-default-400 py-2">
                  <Spinner size="sm" /> Đang tính tạm tính…
                </div>
              ) : !preview?.items?.length ? (
                <p className="text-sm text-default-400">Hãy chọn địa chỉ để tải tạm tính.</p>
              ) : (
                <div className="space-y-3">
                  {preview.items.map((it) => (
                    <div key={`${it.product_id}-${it.variant_id}`} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-default-100 flex-shrink-0">
                          {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-default-900">{it.name}</p>
                          {it.variant_text && <p className="text-xs text-default-400">{it.variant_text}</p>}
                          <p className="text-xs text-default-400">SL: {it.qty}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-default-400">Đơn giá</p>
                        <p className="font-semibold text-sm">{formatCurrency(it.price)}</p>
                        <p className="font-black text-primary text-sm">{formatCurrency(it.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* ── Shipper + Voucher + Note ── */}
        <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="show">
          <Card radius="xl" shadow="sm" className="mb-4 border border-default-100">
            <CardBody className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Shipper */}
                <div>
                  <h4 className="font-bold text-sm text-default-800 mb-2 flex items-center gap-1">
                    <Truck size={14} className="text-primary" /> Đơn vị vận chuyển
                  </h4>
                  <RadioGroup orientation="horizontal" value={shipper} onValueChange={setShipper}>
                    <Radio value="GHN"><span className="text-sm font-medium">GHN</span></Radio>
                    <Radio value="GHTK"><span className="text-sm font-medium">GHTK</span></Radio>
                  </RadioGroup>
                  <p className="text-xs text-default-400 mt-2">
                    Phí ship: <b>{preview ? formatCurrency(preview.shipping_fee) : "—"}</b>
                  </p>
                </div>

                {/* Voucher */}
                <div>
                  <h4 className="font-bold text-sm text-default-800 mb-2">Mã giảm giá</h4>
                  <div className="flex gap-2">
                    <Input
                      size="sm" placeholder="Nhập mã voucher (VD: SALE20)"
                      value={voucherCode} onValueChange={setVoucherCode}
                      radius="lg" className="flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") runPreview(); }}
                      isInvalid={!!preview?.voucher_error}
                      color={preview?.voucher_error ? "danger" : preview?.discount > 0 ? "success" : "default"}
                      endContent={
                        voucherCode ? (
                          <button
                            className="text-default-400 hover:text-default-600 text-xs shrink-0"
                            onClick={() => { setVoucherCode(""); }}
                          >✕</button>
                        ) : null
                      }
                    />
                    <Button size="sm" variant="bordered" radius="lg" isLoading={loadingPreview} onPress={runPreview}>
                      Áp dụng
                    </Button>
                  </div>
                  {preview?.voucher_error && (
                    <p className="text-xs text-danger mt-1.5">{preview.voucher_error}</p>
                  )}
                  {!preview?.voucher_error && preview?.discount > 0 && (
                    <p className="text-xs text-success mt-1.5 font-medium">
                      ✓ Áp dụng thành công — Giảm {formatCurrency(preview.discount)}
                    </p>
                  )}
                </div>

                {/* Note */}
                <div>
                  <h4 className="font-bold text-sm text-default-800 mb-2">Lời nhắn</h4>
                  <textarea
                    rows={3}
                    placeholder="Giao giờ hành chính, gọi trước khi giao…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full text-sm border border-default-300 rounded-xl px-3 py-2 outline-none focus:border-primary resize-none transition-colors"
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* ── Shop Credits ── */}
        {preview?.shop_groups?.some(g => (g.available_credits || 0) > 0) && (
          <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="show">
            <Card radius="xl" shadow="sm" className="mb-4 border border-default-100">
              <CardBody className="p-5">
                <h3 className="font-bold text-default-900 mb-3 flex items-center gap-2">
                  <Gift size={16} className="text-warning" /> Tín dụng cửa hàng
                </h3>
                <div className="space-y-2">
                  {preview.shop_groups.map(g => {
                    if (!g.available_credits) return null;
                    const isUsing = !!creditsToUse[g.shop_id];
                    const deduct  = Math.min(g.available_credits, g.subtotal || 0);
                    return (
                      <div key={g.shop_id} className="flex items-center justify-between p-3 border border-default-200 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold">{g.shop_name || "Cửa hàng"}</p>
                          <p className="text-xs text-default-400">Số dư: {formatCurrency(g.available_credits)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUsing && deduct > 0 && (
                            <span className="text-xs text-success font-medium">-{formatCurrency(deduct)}</span>
                          )}
                          <Button
                            size="sm"
                            variant={isUsing ? "solid" : "bordered"}
                            color={isUsing ? "warning" : "default"}
                            radius="lg"
                            onPress={() => setShopCredits(g.shop_id, isUsing ? 0 : g.available_credits)}
                          >
                            {isUsing ? "Đang dùng" : "Dùng"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* ── Payment + Summary ── */}
        <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="show">
          <div className="flex flex-col lg:flex-row gap-4">
            <PaymentMethodPanel value={method} onChange={setMethod} disabled={!preview} />

            <Card radius="xl" shadow="sm" className="lg:w-96 border border-default-100">
              <CardBody className="p-5">
                <h3 className="font-black text-default-900 mb-4">Tóm tắt đơn hàng</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ["Tạm tính",       preview ? formatCurrency(preview.subtotal) : "—"],
                    ["Phí vận chuyển", preview ? formatCurrency(preview.shipping_fee) : "—"],
                    ["Voucher",        preview && preview.discount > 0 ? `- ${formatCurrency(preview.discount)}` : "—"],
                    ["Tín dụng",       preview && preview.credits_discount > 0 ? `- ${formatCurrency(preview.credits_discount)}` : "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-default-500">{label}</span>
                      <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                  <Divider />
                  <div className="flex justify-between text-base">
                    <span className="font-bold text-default-800">Tổng cộng</span>
                    <span className="font-black text-primary text-lg">
                      {preview ? formatCurrency(preview.total) : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  {method === "COD" && (
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        color="primary" fullWidth size="lg" radius="xl"
                        isLoading={loadingPay}
                        isDisabled={loadingPay || loadingPreview || !preview || !addressId}
                        onPress={onPlaceCOD}
                        className="font-black shadow-md"
                      >
                        Đặt hàng (COD)
                      </Button>
                    </motion.div>
                  )}

                  {method === "VNPAY" && (
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        color="primary" fullWidth size="lg" radius="xl"
                        isLoading={loadingVNPay}
                        isDisabled={loadingVNPay || loadingPreview || !preview || !addressId}
                        onPress={onPlaceVNPAY}
                        className="font-black shadow-md"
                      >
                        Thanh toán qua VNPAY
                      </Button>
                    </motion.div>
                  )}

                  {method === "PAYPAL" && (
                    preview && addressId ? (
                      <div key={paypalKey}>
                        <PayPalCheckout
                          checkoutPayload={paypalPayload}
                          onSuccess={() => {}}
                          onError={() => {}}
                        />
                      </div>
                    ) : (
                      <Button fullWidth size="lg" radius="xl" isDisabled className="font-black">
                        {!addressId ? "Chọn địa chỉ trước" : "Đang tính tạm tính…"}
                      </Button>
                    )
                  )}
                </div>
                <p className="text-xs text-default-400 mt-2 text-center">
                  {method === "COD"   && "Thanh toán khi nhận hàng tại nhà."}
                  {method === "VNPAY" && "Chuyển hướng đến cổng thanh toán VNPAY Sandbox."}
                  {method === "PAYPAL" && "Thanh toán an toàn qua PayPal Sandbox."}
                </p>
              </CardBody>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Dialogs */}
      <AddressDialog
        open={openAddrForm}
        initial={editAddr}
        onClose={() => setOpenAddrForm(false)}
        onSubmit={async (payload) => {
          try {
            let res;
            if (editAddr) { res = await addressService.update(editAddr._id, payload); toast.success("Đã cập nhật địa chỉ"); }
            else          { res = await addressService.create(payload);               toast.success("Đã thêm địa chỉ"); }
            const newId = res?._id || res?.data?._id;
            await loadAddresses();
            if (newId) { setAddressId(newId); setOpenPicker(false); await runPreview(); }
            setOpenAddrForm(false); setEditAddr(null);
          } catch (e) { toast.error(e?.response?.data?.message || e.message || "Lưu địa chỉ thất bại"); }
        }}
      />

      <AddressDialogPicker
        open={openPicker}
        onClose={() => setOpenPicker(false)}
        addresses={addresses}
        selectedId={addressId}
        onSelect={(id) => { setAddressId(id); toast.success("Đã chọn địa chỉ"); }}
        onAddNew={() => { setOpenPicker(false); setEditAddr(null); setOpenAddrForm(true); }}
        onEdit={(a) => { setOpenPicker(false); setEditAddr(a); setOpenAddrForm(true); }}
        onSetDefault={async (id) => { await addressService.setDefault(id); await loadAddresses(); setAddressId(id); toast.success("Đã đặt làm mặc định"); }}
        onRefresh={async () => { await loadAddresses(); }}
      />
    </motion.div>
  );
}
