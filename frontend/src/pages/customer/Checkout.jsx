import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const methods = [
    { val: "COD",    label: t("checkout.pay_cod"),    icon: Banknote },
    { val: "PAYPAL", label: t("checkout.pay_paypal"), icon: CreditCard },
    { val: "VNPAY",  label: t("checkout.pay_vnpay"),  icon: CreditCard },
  ];
  return (
    <Card radius="xl" shadow="sm" className={`flex-1 border border-default-100 ${disabled ? "opacity-60" : ""}`}>
      <CardBody className="p-5">
        <h3 className="font-bold text-default-900 mb-3">{t("checkout.payment_method")}</h3>
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
  const { t } = useTranslation();
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
          <h1 className="text-xl font-black text-default-900">{t("checkout.title")}</h1>
          {isBuyNow ? (
            <Button
              variant="bordered" size="sm" radius="lg"
              startContent={<ArrowLeft size={15} />}
              className="text-default-600"
              onPress={() => nav(-1)}
            >
              {t("common.back")}
            </Button>
          ) : (
            <Button
              as={RouterLink} to="/cart"
              variant="bordered" size="sm" radius="lg"
              startContent={<ArrowLeft size={15} />}
              className="text-default-600"
            >
              {t("cart.continue_shopping")}
            </Button>
          )}
        </div>

        {/* ── Address ── */}
        <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="show">
          <Card radius="xl" shadow="sm" className="mb-4 border border-default-100">
            <CardBody className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-default-900 flex items-center gap-2">
                  <Home size={16} className="text-primary" /> {t("checkout.address")}
                </h3>
                <Button size="sm" variant="light" color="primary" radius="lg" onPress={() => setOpenPicker(true)}>
                  {t("checkout.change_address")}
                </Button>
              </div>
              {currentAddr ? (
                <div className="border border-default-200 rounded-xl p-3 bg-default-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User size={14} className="text-default-400" />
                    <span className="font-semibold text-sm">{currentAddr.name}</span>
                    <Chip size="sm" variant="flat">{currentAddr.phone}</Chip>
                    {currentAddr.is_default && (
                      <Chip size="sm" color="warning" startContent={<Star size={11} />}>{t("checkout.default_badge")}</Chip>
                    )}
                  </div>
                  <p className="text-sm text-default-500 mt-1 flex items-start gap-1">
                    <MapPin size={13} className="flex-shrink-0 mt-0.5" />
                    {prettyJoin([currentAddr.street, currentAddr.ward, currentAddr.district, currentAddr.city])}
                  </p>
                </div>
              ) : (
                <div className="border border-dashed border-default-300 rounded-xl p-4 text-center">
                  <p className="text-sm text-default-500">{t("checkout.no_address")}</p>
                  <Button size="sm" color="primary" variant="flat" radius="lg" className="mt-2" onPress={() => setOpenPicker(true)}>
                    {t("checkout.add_address")}
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
              <h3 className="font-bold text-default-900 mb-3">{t("checkout.selected_products")}</h3>
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-sm text-default-400 py-2">
                  <Spinner size="sm" /> {t("checkout.calculating")}
                </div>
              ) : !preview?.items?.length ? (
                <p className="text-sm text-default-400">{t("checkout.select_address_first")}</p>
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
                          <p className="text-xs text-default-400">{t("checkout.qty_short")} {it.qty}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-default-400">{t("checkout.unit_price")}</p>
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
                    <Truck size={14} className="text-primary" /> {t("checkout.shipper")}
                  </h4>
                  <RadioGroup orientation="horizontal" value={shipper} onValueChange={setShipper}>
                    <Radio value="GHN"><span className="text-sm font-medium">GHN</span></Radio>
                    <Radio value="GHTK"><span className="text-sm font-medium">GHTK</span></Radio>
                  </RadioGroup>
                  <p className="text-xs text-default-400 mt-2">
                    {t("checkout.shipping_fee")} <b>{preview ? formatCurrency(preview.shipping_fee) : "—"}</b>
                  </p>
                </div>

                {/* Voucher */}
                <div>
                  <h4 className="font-bold text-sm text-default-800 mb-2">{t("checkout.voucher_code")}</h4>
                  <div className="flex gap-2">
                    <Input
                      size="sm" placeholder={t("checkout.voucher_placeholder")}
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
                      {t("common.apply")}
                    </Button>
                  </div>
                  {preview?.voucher_error && (
                    <p className="text-xs text-danger mt-1.5">{preview.voucher_error}</p>
                  )}
                  {!preview?.voucher_error && preview?.discount > 0 && (
                    <p className="text-xs text-success mt-1.5 font-medium">
                      {t("checkout.voucher_applied_msg")} {formatCurrency(preview.discount)}
                    </p>
                  )}
                </div>

                {/* Note */}
                <div>
                  <h4 className="font-bold text-sm text-default-800 mb-2">{t("checkout.message")}</h4>
                  <textarea
                    rows={3}
                    placeholder={t("checkout.message_placeholder")}
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
                  <Gift size={16} className="text-warning" /> {t("checkout.shop_credits")}
                </h3>
                <div className="space-y-2">
                  {preview.shop_groups.map(g => {
                    if (!g.available_credits) return null;
                    const isUsing = !!creditsToUse[g.shop_id];
                    const deduct  = Math.min(g.available_credits, g.subtotal || 0);
                    return (
                      <div key={g.shop_id} className="flex items-center justify-between p-3 border border-default-200 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold">{g.shop_name || t("checkout.shop_credits")}</p>
                          <p className="text-xs text-default-400">{t("checkout.balance_label")} {formatCurrency(g.available_credits)}</p>
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
                            {isUsing ? t("checkout.credits_using") : t("checkout.credits_use")}
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
                <h3 className="font-black text-default-900 mb-4">{t("checkout.order_summary")}</h3>
                <div className="space-y-2 text-sm">
                  {[
                    [t("checkout.subtotal_label"),      preview ? formatCurrency(preview.subtotal) : "—"],
                    [t("checkout.shipping_fee_label"),  preview ? formatCurrency(preview.shipping_fee) : "—"],
                    [t("checkout.voucher_label"),       preview && preview.discount > 0 ? `- ${formatCurrency(preview.discount)}` : "—"],
                    [t("checkout.credits_label"),       preview && preview.credits_discount > 0 ? `- ${formatCurrency(preview.credits_discount)}` : "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-default-500">{label}</span>
                      <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                  <Divider />
                  <div className="flex justify-between text-base">
                    <span className="font-bold text-default-800">{t("checkout.total_label")}</span>
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
                        {t("checkout.place_cod")}
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
                        {t("checkout.pay_vnpay")}
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
                        {!addressId ? t("checkout.select_address_btn") : t("checkout.calculating")}
                      </Button>
                    )
                  )}
                </div>
                <p className="text-xs text-default-400 mt-2 text-center">
                  {method === "COD"   && t("checkout.cod_desc")}
                  {method === "VNPAY" && t("checkout.vnpay_desc")}
                  {method === "PAYPAL" && t("checkout.paypal_desc")}
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
            if (editAddr) { res = await addressService.update(editAddr._id, payload); toast.success(t("checkout.address_updated")); }
            else          { res = await addressService.create(payload);               toast.success(t("checkout.address_added")); }
            const newId = res?._id || res?.data?._id;
            await loadAddresses();
            if (newId) { setAddressId(newId); setOpenPicker(false); await runPreview(); }
            setOpenAddrForm(false); setEditAddr(null);
          } catch (e) { toast.error(e?.response?.data?.message || e.message || t("checkout.address_save_fail")); }
        }}
      />

      <AddressDialogPicker
        open={openPicker}
        onClose={() => setOpenPicker(false)}
        addresses={addresses}
        selectedId={addressId}
        onSelect={(id) => { setAddressId(id); toast.success(t("checkout.address_selected")); }}
        onAddNew={() => { setOpenPicker(false); setEditAddr(null); setOpenAddrForm(true); }}
        onEdit={(a) => { setOpenPicker(false); setEditAddr(a); setOpenAddrForm(true); }}
        onSetDefault={async (id) => { await addressService.setDefault(id); await loadAddresses(); setAddressId(id); toast.success(t("checkout.address_default")); }}
        onRefresh={async () => { await loadAddresses(); }}
      />
    </motion.div>
  );
}
