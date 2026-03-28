import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card, CardBody, Button, Divider, Input, Chip, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody,
} from "@heroui/react";
import {
  ArrowLeft, User, MapPin, Star, Truck, Home, CreditCard, Banknote,
  Gift, Tag, Package, ShieldCheck, Ticket, Percent, ChevronRight,
  Clock, Check, X,
} from "lucide-react";
import { addressService }    from "../../services/addressService";
import { publicVoucherApi }  from "../../services/voucherService";
import { formatCurrency }    from "../../utils/formatCurrency";
import { useToast }          from "../../components/common/ToastProvider";
import AddressDialog         from "../../components/AddressDialog";
import AddressDialogPicker   from "../../components/AddressDialogPicker";
import PayPalCheckout        from "../../components/PayPalCheckout";
import { useCheckout }       from "../../hooks/useCheckout";

/* ════════════════════════════════════════════════════════════════════════════ */
/*  Payment Method Selector                                                    */
/* ════════════════════════════════════════════════════════════════════════════ */
function PaymentMethodPanel({ value, onChange, disabled }) {
  const { t } = useTranslation();
  const methods = [
    { val: "COD",    label: t("checkout.pay_cod"),    icon: Banknote,   desc: t("checkout.cod_desc"),    color: "#22c55e" },
    { val: "VNPAY",  label: t("checkout.pay_vnpay"),  icon: CreditCard, desc: t("checkout.vnpay_desc"),  color: "#3b82f6" },
    { val: "PAYPAL", label: t("checkout.pay_paypal"), icon: CreditCard, desc: t("checkout.paypal_desc"), color: "#6366f1" },
  ];
  return (
    <div className={`space-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {methods.map(({ val, label, icon: Icon, desc, color }) => {
        const active = value === val;
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-200 text-left"
            style={{
              borderColor: active ? color : "transparent",
              background: active ? `${color}08` : "var(--heroui-default-50, #f8fafc)",
            }}
          >
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, color }}>
              <Icon size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-default-900">{label}</p>
              <p className="text-xs text-default-400 truncate">{desc}</p>
            </div>
            <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ borderColor: active ? color : "#d1d5db" }}>
              {active && <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  Voucher Picker Modal — shows ALL vouchers grouped by category              */
/* ════════════════════════════════════════════════════════════════════════════ */
const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const TYPE_COLORS = { product: "#8b5cf6", shipping: "#0ea5e9" };

function VoucherCard({ v, isSelected, onSelect, t }) {
  const vType = v.voucher_type || "product";
  const color = TYPE_COLORS[vType];
  const remaining = v.max_uses - v.used_count;
  const usePct = v.max_uses > 0 ? Math.round((v.used_count / v.max_uses) * 100) : 0;
  const isUrgent = remaining <= 10 || new Date(v.valid_to) - Date.now() < 3 * 86400000;

  return (
    <button
      onClick={() => onSelect(v.code, vType)}
      className="w-full text-left rounded-2xl border-2 p-3.5 transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: isSelected ? color : "transparent",
        background: isSelected ? `${color}08` : "var(--heroui-default-50, #f8fafc)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}12` }}>
          {vType === "shipping"
            ? <Truck size={20} style={{ color }} />
            : <Tag size={20} style={{ color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-black text-sm tracking-wider text-default-900">{v.code}</span>
            {isSelected && (
              <Chip size="sm" color="success" variant="flat" startContent={<Check size={10} />} className="text-[10px] h-5">
                {t("checkout.selected")}
              </Chip>
            )}
            {isUrgent && !isSelected && (
              <Chip size="sm" color="warning" variant="flat" className="text-[10px] h-5">
                {t("checkout.almost_gone")}
              </Chip>
            )}
          </div>
          <p className="text-sm font-bold" style={{ color }}>
            {v.discount_type === "percent"
              ? `${t("checkout.discount_off")} ${v.discount_value}%`
              : `${t("checkout.discount_off")} ${formatCurrency(v.discount_value)}`}
            {v.max_discount > 0 && v.discount_type === "percent" && (
              <span className="text-xs font-normal text-default-400 ml-1">
                ({t("checkout.max_discount")} {formatCurrency(v.max_discount)})
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-default-400">
            {v.min_order_value > 0 && (
              <span>{t("checkout.min_order")}: {formatCurrency(v.min_order_value)}</span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock size={10} /> {t("checkout.expires")}: {formatDate(v.valid_to)}
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-default-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(usePct, 100)}%`, background: usePct >= 75 ? "#ef4444" : color }} />
            </div>
            <p className="text-[10px] text-default-400 mt-0.5">
              {t("checkout.voucher_remaining", { count: remaining })}
            </p>
          </div>
        </div>
        <ChevronRight size={16} className="text-default-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function VoucherPickerModal({ open, onClose, productCode, shippingCode, onSelectProduct, onSelectShipping }) {
  const { t } = useTranslation();
  const [allVouchers, setAllVouchers] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [tab, setTab]                 = useState("all"); // "all" | "product" | "shipping"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publicVoucherApi.listPublic({ limit: 100 });
      setAllVouchers(res?.data?.items || []);
    } catch { setAllVouchers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const productVouchers  = allVouchers.filter(v => (v.voucher_type || "product") === "product");
  const shippingVouchers = allVouchers.filter(v => (v.voucher_type || "product") === "shipping");

  const handleSelect = (code, vType) => {
    if (vType === "shipping") onSelectShipping(code);
    else onSelectProduct(code);
    onClose();
  };

  const tabs = [
    { key: "all",      label: t("checkout.tab_all"),      count: allVouchers.length },
    { key: "product",  label: t("checkout.tab_product"),  count: productVouchers.length,  color: TYPE_COLORS.product },
    { key: "shipping", label: t("checkout.tab_shipping"), count: shippingVouchers.length, color: TYPE_COLORS.shipping },
  ];

  const showProducts  = tab === "all" || tab === "product";
  const showShipping  = tab === "all" || tab === "shipping";

  return (
    <Modal isOpen={open} onClose={onClose} size="2xl" scrollBehavior="inside" radius="2xl">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 pb-1">
          <Ticket size={18} className="text-orange-500" />
          {t("checkout.pick_voucher_title")}
        </ModalHeader>
        <ModalBody className="pb-5">
          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {tabs.map(tb => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border-2"
                style={{
                  borderColor: tab === tb.key ? (tb.color || "#6366f1") : "transparent",
                  background: tab === tb.key ? `${tb.color || "#6366f1"}10` : "var(--heroui-default-50, #f1f5f9)",
                  color: tab === tb.key ? (tb.color || "#6366f1") : undefined,
                }}
              >
                {tb.label}
                <span className="bg-default-200 text-default-600 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                  {tb.count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : allVouchers.length === 0 ? (
            <div className="text-center py-10">
              <Ticket size={40} className="mx-auto text-default-200 mb-3" />
              <p className="text-sm text-default-400">{t("checkout.no_vouchers_available")}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Product vouchers section */}
              {showProducts && productVouchers.length > 0 && (
                <div>
                  {tab === "all" && (
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${TYPE_COLORS.product}15` }}>
                        <Percent size={11} style={{ color: TYPE_COLORS.product }} />
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-default-500">
                        {t("checkout.product_voucher")}
                      </h4>
                      <Chip size="sm" variant="flat" className="text-[10px] h-4">{productVouchers.length}</Chip>
                    </div>
                  )}
                  <div className="space-y-2">
                    {productVouchers.map(v => (
                      <VoucherCard
                        key={v._id || v.code}
                        v={v}
                        isSelected={productCode === v.code}
                        onSelect={handleSelect}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping vouchers section */}
              {showShipping && shippingVouchers.length > 0 && (
                <div>
                  {tab === "all" && (
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${TYPE_COLORS.shipping}15` }}>
                        <Truck size={11} style={{ color: TYPE_COLORS.shipping }} />
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-default-500">
                        {t("checkout.shipping_voucher")}
                      </h4>
                      <Chip size="sm" variant="flat" className="text-[10px] h-4">{shippingVouchers.length}</Chip>
                    </div>
                  )}
                  <div className="space-y-2">
                    {shippingVouchers.map(v => (
                      <VoucherCard
                        key={v._id || v.code}
                        v={v}
                        isSelected={shippingCode === v.code}
                        onSelect={handleSelect}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state for filtered tab */}
              {tab === "product" && productVouchers.length === 0 && (
                <div className="text-center py-8">
                  <Percent size={32} className="mx-auto text-default-200 mb-2" />
                  <p className="text-sm text-default-400">{t("checkout.no_vouchers_available")}</p>
                </div>
              )}
              {tab === "shipping" && shippingVouchers.length === 0 && (
                <div className="text-center py-8">
                  <Truck size={32} className="mx-auto text-default-200 mb-2" />
                  <p className="text-sm text-default-400">{t("checkout.no_vouchers_available")}</p>
                </div>
              )}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  Voucher Input with Browse Button                                           */
/* ════════════════════════════════════════════════════════════════════════════ */
function VoucherInput({ icon: Icon, iconColor, label, value, onChange, onApply, onBrowse, loading, error, success, successMsg, placeholder }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm text-default-800 flex items-center gap-1.5">
          <Icon size={14} style={{ color: iconColor }} /> {label}
        </h4>
        <button
          onClick={onBrowse}
          className="text-xs font-medium flex items-center gap-1 transition-colors"
          style={{ color: iconColor }}
        >
          <Ticket size={12} /> {t("checkout.browse_voucher")}
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          size="sm" placeholder={placeholder}
          value={value} onValueChange={onChange}
          radius="lg" className="flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") onApply(); }}
          isInvalid={!!error}
          color={error ? "danger" : success ? "success" : "default"}
          endContent={
            value ? (
              <button
                className="text-default-400 hover:text-default-600 text-xs shrink-0"
                onClick={() => onChange("")}
              >
                <X size={14} />
              </button>
            ) : null
          }
        />
        <Button size="sm" variant="flat" color="primary" radius="lg" isLoading={loading} onPress={onApply}>
          {success ? <Check size={14} /> : t("common.apply")}
        </Button>
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
      {!error && success && <p className="text-xs text-success mt-1 font-medium">{successMsg}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  Checkout Page                                                              */
/* ════════════════════════════════════════════════════════════════════════════ */
const ATTR_LABEL_MAP = {
  color: "Màu", size: "Size", material: "Chất liệu", style: "Kiểu",
  weight: "Trọng lượng", length: "Chiều dài", width: "Chiều rộng",
  pattern: "Hoạ tiết", gender: "Giới tính",
};
const attrLabel = (key) => ATTR_LABEL_MAP[key.toLowerCase()] || key;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
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
    voucherCode,         setVoucherCode,
    shippingVoucherCode, setShippingVoucherCode,
    creditsToUse,  setShopCredits,
    note,          setNote,
    method,        setMethod,
    preview,       loadingPreview, runPreview,
    loadingPay,    onPlaceCOD,
    loadingVNPay,  onPlaceVNPAY,
    paypalPayload, paypalKey,
  } = useCheckout();

  const [openPicker,       setOpenPicker]       = useState(false);
  const [openAddrForm,     setOpenAddrForm]     = useState(false);
  const [editAddr,         setEditAddr]         = useState(null);
  const [voucherModal,     setVoucherModal]     = useState(null); // "product" | "shipping" | null

  const currentAddr = addresses.find(a => a._id === addressId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh py-6 md:py-10"
      style={{ background: "linear-gradient(160deg, #eef4ff 0%, #f8fafc 40%, #fff 100%)" }}
    >
      <div className="max-w-5xl mx-auto px-4">

        {/* ── Header ── */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-default-900">{t("checkout.title")}</h1>
                <p className="text-xs text-default-400">{t("checkout.secure_checkout")}</p>
              </div>
            </div>
            <Button
              as={isBuyNow ? undefined : RouterLink}
              to={isBuyNow ? undefined : "/cart"}
              variant="bordered" size="sm" radius="full"
              startContent={<ArrowLeft size={14} />}
              className="text-default-600 border-default-200"
              onPress={isBuyNow ? () => nav(-1) : undefined}
            >
              {t("common.back")}
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ══════════ LEFT COLUMN ══════════ */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── 1. Address ── */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
              <Card radius="2xl" shadow="sm" className="border border-default-100 overflow-visible">
                <CardBody className="p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-default-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Home size={13} className="text-blue-500" />
                      </span>
                      {t("checkout.address")}
                    </h3>
                    <Button size="sm" variant="light" color="primary" radius="full" onPress={() => setOpenPicker(true)}>
                      {t("checkout.change_address")}
                    </Button>
                  </div>
                  {currentAddr ? (
                    <div className="border border-default-200 rounded-2xl p-4 bg-gradient-to-r from-blue-50/40 to-transparent">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User size={14} className="text-default-400" />
                        <span className="font-bold text-sm">{currentAddr.name}</span>
                        <Chip size="sm" variant="flat" className="text-xs">{currentAddr.phone}</Chip>
                        {currentAddr.is_default && (
                          <Chip size="sm" color="warning" variant="flat" startContent={<Star size={10} />} className="text-xs">
                            {t("checkout.default_badge")}
                          </Chip>
                        )}
                      </div>
                      <p className="text-sm text-default-500 mt-1.5 flex items-start gap-1.5">
                        <MapPin size={13} className="flex-shrink-0 mt-0.5 text-default-300" />
                        {prettyJoin([currentAddr.street, currentAddr.ward, currentAddr.district, currentAddr.city])}
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-default-200 rounded-2xl p-6 text-center">
                      <MapPin size={24} className="mx-auto text-default-300 mb-2" />
                      <p className="text-sm text-default-500">{t("checkout.no_address")}</p>
                      <Button size="sm" color="primary" variant="flat" radius="full" className="mt-3" onPress={() => setOpenPicker(true)}>
                        {t("checkout.add_address")}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>

            {/* ── 2. Products ── */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
              <Card radius="2xl" shadow="sm" className="border border-default-100">
                <CardBody className="p-5">
                  <h3 className="font-bold text-default-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Package size={13} className="text-indigo-500" />
                    </span>
                    {t("checkout.selected_products")}
                    {preview?.items?.length > 0 && (
                      <Chip size="sm" variant="flat" className="text-xs">{preview.items.length}</Chip>
                    )}
                  </h3>

                  {loadingPreview ? (
                    <div className="flex items-center gap-2 text-sm text-default-400 py-6 justify-center">
                      <Spinner size="sm" /> {t("checkout.calculating")}
                    </div>
                  ) : !preview?.items?.length ? (
                    <p className="text-sm text-default-400 py-4 text-center">{t("checkout.select_address_first")}</p>
                  ) : (
                    <div className="divide-y divide-default-100">
                      {preview.shop_groups?.map(group => (
                        <div key={group.shop_id} className="py-3 first:pt-0 last:pb-0">
                          {/* Shop header */}
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-default-50">
                            {group.shop_logo ? (
                              <img src={group.shop_logo} alt="" className="w-5 h-5 rounded-md object-cover" />
                            ) : (
                              <span className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center">
                                <Package size={10} className="text-indigo-500" />
                              </span>
                            )}
                            <span className="text-xs font-bold text-default-600 uppercase tracking-wide">
                              {group.shop_name}
                            </span>
                            <Chip size="sm" variant="flat" className="text-[10px] h-4 ml-auto">
                              {group.items.length} {t("checkout.items_count")}
                            </Chip>
                          </div>

                          {/* Items */}
                          <div className="space-y-3">
                            {group.items.map((it) => {
                              const va = it.variant_attributes || {};
                              const attrEntries = Object.entries(va).filter(([, v]) => v);
                              const hasOldPrice = it.compare_at_price && it.compare_at_price > it.price;
                              const hasFlashDiscount = it.discount > 0;
                              const unitPrice = hasFlashDiscount ? (it.price - it.discount) : it.price;

                              return (
                                <div key={`${it.product_id}-${it.variant_id}`}
                                  className="flex gap-3 p-2.5 rounded-xl hover:bg-default-50/80 transition-colors">
                                  {/* Image */}
                                  <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-default-100 flex-shrink-0 border border-default-100">
                                    {it.image_url
                                      ? <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                                      : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-default-300" /></div>
                                    }
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-default-900 leading-tight line-clamp-2">{it.name}</p>

                                    {/* Variant attributes (color, size, etc.) */}
                                    {attrEntries.length > 0 && (
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        {attrEntries.map(([key, val]) => (
                                          <Chip key={key} size="sm" variant="flat" className="text-[10px] h-5 capitalize"
                                            startContent={
                                              key.toLowerCase() === "color" ? (
                                                <span className="w-2.5 h-2.5 rounded-full border border-default-200 flex-shrink-0"
                                                  style={{ background: val.toLowerCase() }} />
                                              ) : null
                                            }
                                          >
                                            {attrLabel(key)}: {val}
                                          </Chip>
                                        ))}
                                      </div>
                                    )}

                                    {/* SKU */}
                                    {it.sku && (
                                      <p className="text-[10px] text-default-300 mt-0.5">{t("checkout.sku_label")}: {it.sku}</p>
                                    )}

                                    {/* Quantity */}
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="text-xs text-default-500 bg-default-100 px-2 py-0.5 rounded-md font-medium">
                                        x{it.qty}
                                      </span>
                                      {hasFlashDiscount && (
                                        <Chip size="sm" color="danger" variant="flat" className="text-[10px] h-4">
                                          {t("checkout.flash_sale")}
                                        </Chip>
                                      )}
                                    </div>
                                  </div>

                                  {/* Price column */}
                                  <div className="flex-shrink-0 text-right min-w-[90px]">
                                    {/* Compare at price (old price) */}
                                    {hasOldPrice && (
                                      <p className="text-[11px] text-default-300 line-through">
                                        {formatCurrency(it.compare_at_price)}
                                      </p>
                                    )}
                                    {/* Unit price */}
                                    <p className="text-xs text-default-500">
                                      {hasFlashDiscount ? (
                                        <>
                                          <span className="line-through mr-1">{formatCurrency(it.price)}</span>
                                          <span className="text-danger font-semibold">{formatCurrency(unitPrice)}</span>
                                        </>
                                      ) : (
                                        formatCurrency(it.price)
                                      )}
                                    </p>
                                    {/* Total */}
                                    <p className="font-bold text-sm text-primary mt-0.5">
                                      {formatCurrency(it.total)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Shop subtotal */}
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-default-50">
                            <span className="text-xs text-default-400">{t("checkout.shop_subtotal")}</span>
                            <span className="text-sm font-bold text-default-700">{formatCurrency(group.subtotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>

            {/* ── 3. Vouchers ── */}
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
              <Card radius="2xl" shadow="sm" className="border border-default-100">
                <CardBody className="p-5">
                  <h3 className="font-bold text-default-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Ticket size={13} className="text-orange-500" />
                    </span>
                    {t("checkout.vouchers_title")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VoucherInput
                      icon={Percent}
                      iconColor="#8b5cf6"
                      label={t("checkout.product_voucher")}
                      value={voucherCode}
                      onChange={setVoucherCode}
                      onApply={runPreview}
                      onBrowse={() => setVoucherModal("product")}
                      loading={loadingPreview}
                      error={preview?.voucher_error}
                      success={!preview?.voucher_error && preview?.discount > 0}
                      successMsg={`${t("checkout.voucher_applied_msg")} ${preview ? formatCurrency(preview.discount) : ""}`}
                      placeholder={t("checkout.product_voucher_placeholder")}
                    />
                    <VoucherInput
                      icon={Truck}
                      iconColor="#0ea5e9"
                      label={t("checkout.shipping_voucher")}
                      value={shippingVoucherCode}
                      onChange={setShippingVoucherCode}
                      onApply={runPreview}
                      onBrowse={() => setVoucherModal("shipping")}
                      loading={loadingPreview}
                      error={preview?.shipping_voucher_error}
                      success={!preview?.shipping_voucher_error && (preview?.shipping_discount || 0) > 0}
                      successMsg={`${t("checkout.voucher_applied_msg")} ${preview ? formatCurrency(preview.shipping_discount) : ""}`}
                      placeholder={t("checkout.shipping_voucher_placeholder")}
                    />
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            {/* ── 4. Shop Credits ── */}
            {preview?.shop_groups?.some(g => (g.available_credits || 0) > 0) && (
              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
                <Card radius="2xl" shadow="sm" className="border border-default-100">
                  <CardBody className="p-5">
                    <h3 className="font-bold text-default-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Gift size={13} className="text-amber-500" />
                      </span>
                      {t("checkout.shop_credits")}
                    </h3>
                    <div className="space-y-2">
                      {preview.shop_groups.map(g => {
                        if (!g.available_credits) return null;
                        const isUsing = !!creditsToUse[g.shop_id];
                        const deduct  = Math.min(g.available_credits, g.subtotal || 0);
                        return (
                          <div key={g.shop_id} className="flex items-center justify-between p-3 border border-default-200 rounded-2xl bg-default-50/50">
                            <div>
                              <p className="text-sm font-semibold">{g.shop_name}</p>
                              <p className="text-xs text-default-400">{t("checkout.balance_label")} {formatCurrency(g.available_credits)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isUsing && deduct > 0 && (
                                <span className="text-xs text-success font-semibold">-{formatCurrency(deduct)}</span>
                              )}
                              <Button
                                size="sm"
                                variant={isUsing ? "solid" : "bordered"}
                                color={isUsing ? "warning" : "default"}
                                radius="full"
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

            {/* ── 5. Note ── */}
            <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
              <Card radius="2xl" shadow="sm" className="border border-default-100">
                <CardBody className="p-5">
                  <h4 className="font-bold text-sm text-default-800 mb-2">{t("checkout.message")}</h4>
                  <textarea
                    rows={2}
                    placeholder={t("checkout.message_placeholder")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full text-sm border border-default-200 rounded-2xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none transition-all bg-default-50/50"
                  />
                </CardBody>
              </Card>
            </motion.div>
          </div>

          {/* ══════════ RIGHT COLUMN — Sticky Summary ══════════ */}
          <div className="lg:col-span-1">
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="lg:sticky lg:top-24 space-y-4">

              {/* Payment Method */}
              <Card radius="2xl" shadow="sm" className="border border-default-100">
                <CardBody className="p-5">
                  <h3 className="font-bold text-default-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
                      <CreditCard size={13} className="text-green-500" />
                    </span>
                    {t("checkout.payment_method")}
                  </h3>
                  <PaymentMethodPanel value={method} onChange={setMethod} disabled={!preview} />
                </CardBody>
              </Card>

              {/* Order Summary */}
              <Card radius="2xl" shadow="md" className="border border-primary/10 bg-gradient-to-b from-white to-primary/[0.02]">
                <CardBody className="p-5">
                  <h3 className="font-black text-default-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag size={13} className="text-primary" />
                    </span>
                    {t("checkout.order_summary")}
                  </h3>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-default-500">{t("checkout.subtotal_label")}</span>
                      <span className="font-semibold">{preview ? formatCurrency(preview.subtotal) : "—"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-default-500 flex items-center gap-1">
                        <Truck size={12} /> {t("checkout.shipping_fee_label")}
                      </span>
                      <div className="text-right">
                        {preview?.shipping_discount > 0 ? (
                          <>
                            <span className="text-default-300 line-through text-xs mr-1">{formatCurrency(preview.shipping_fee_raw)}</span>
                            <span className="font-semibold">{formatCurrency(preview.shipping_fee)}</span>
                          </>
                        ) : (
                          <span className="font-semibold">{preview ? formatCurrency(preview.shipping_fee) : "—"}</span>
                        )}
                      </div>
                    </div>

                    {preview?.discount > 0 && (
                      <div className="flex justify-between text-success">
                        <span className="flex items-center gap-1"><Percent size={12} /> {t("checkout.voucher_label")}</span>
                        <span className="font-semibold">-{formatCurrency(preview.discount)}</span>
                      </div>
                    )}

                    {preview?.shipping_discount > 0 && (
                      <div className="flex justify-between text-sky-500">
                        <span className="flex items-center gap-1"><Truck size={12} /> {t("checkout.shipping_voucher_label")}</span>
                        <span className="font-semibold">-{formatCurrency(preview.shipping_discount)}</span>
                      </div>
                    )}

                    {preview?.credits_discount > 0 && (
                      <div className="flex justify-between text-amber-500">
                        <span className="flex items-center gap-1"><Gift size={12} /> {t("checkout.credits_label")}</span>
                        <span className="font-semibold">-{formatCurrency(preview.credits_discount)}</span>
                      </div>
                    )}

                    <Divider className="my-1" />

                    <div className="flex justify-between items-end">
                      <span className="font-bold text-default-800">{t("checkout.total_label")}</span>
                      <span className="font-black text-primary text-xl">
                        {preview ? formatCurrency(preview.total) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-5">
                    {method === "COD" && (
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Button
                          color="primary" fullWidth size="lg" radius="full"
                          isLoading={loadingPay}
                          isDisabled={loadingPay || loadingPreview || !preview || !addressId}
                          onPress={onPlaceCOD}
                          className="font-black shadow-lg shadow-primary/25 h-12"
                        >
                          {t("checkout.place_cod")}
                        </Button>
                      </motion.div>
                    )}

                    {method === "VNPAY" && (
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Button
                          color="primary" fullWidth size="lg" radius="full"
                          isLoading={loadingVNPay}
                          isDisabled={loadingVNPay || loadingPreview || !preview || !addressId}
                          onPress={onPlaceVNPAY}
                          className="font-black shadow-lg shadow-primary/25 h-12"
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
                        <Button fullWidth size="lg" radius="full" isDisabled className="font-black h-12">
                          {!addressId ? t("checkout.select_address_btn") : t("checkout.calculating")}
                        </Button>
                      )
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-default-400">
                    <ShieldCheck size={12} />
                    <span>{t("checkout.secure_note")}</span>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Voucher Picker Modal ── */}
      <VoucherPickerModal
        open={!!voucherModal}
        onClose={() => setVoucherModal(null)}
        productCode={voucherCode}
        shippingCode={shippingVoucherCode}
        onSelectProduct={(code) => { setVoucherCode(code); setTimeout(runPreview, 100); }}
        onSelectShipping={(code) => { setShippingVoucherCode(code); setTimeout(runPreview, 100); }}
      />

      {/* ── Address Dialogs ── */}
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
