import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Button, Chip, Spinner, Input } from "@heroui/react";
import { Tag, Copy, Check, Search } from "lucide-react";
import { publicVoucherApi } from "../../services/voucherService";
import { formatCurrency } from "../../utils/formatCurrency";
import { useNavigate } from "react-router-dom";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

function VoucherCard({ v }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const timeLeft = (validTo) => {
    const diff = new Date(validTo) - Date.now();
    if (diff <= 0) return t("voucher.expired_label");
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return t("voucher.days_left", { count: days });
    return t("voucher.hours_left", { count: hours });
  };

  const copy = () => {
    navigator.clipboard?.writeText(v.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const usePct    = v.max_uses > 0 ? Math.round((v.used_count / v.max_uses) * 100) : 0;
  const remaining = v.max_uses - v.used_count;
  const isUrgent  = remaining <= 10 || new Date(v.valid_to) - Date.now() < 3 * 86400000;

  return (
    <Card radius="xl" shadow="sm" className="overflow-hidden">
      <div className={`h-1.5 ${isUrgent ? "bg-warning" : "bg-primary"}`} />
      <CardBody className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Tag size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-lg font-black text-default-900 tracking-wider">{v.code}</p>
              <p className="text-xs text-default-400">{t("voucher.expires_label")} {formatDate(v.valid_to)}</p>
            </div>
          </div>
          <Chip size="sm" color={isUrgent ? "warning" : "primary"} variant="flat">
            {timeLeft(v.valid_to)}
          </Chip>
        </div>

        {/* Discount value */}
        <div className="bg-success/10 rounded-xl px-3 py-2 text-center">
          <p className="text-xl font-black text-success-600">
            {v.discount_type === "percent"
              ? t("voucher.percent_off", { value: v.discount_value })
              : t("voucher.amount_off", { value: formatCurrency(v.discount_value) })}
          </p>
          {v.min_order_value > 0 && (
            <p className="text-xs text-default-500 mt-0.5">
              {t("voucher.min_order_label")} {formatCurrency(v.min_order_value)}
            </p>
          )}
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex justify-between text-xs text-default-400 mb-1">
            <span>{t("voucher.used_count", { used: v.used_count, max: v.max_uses })}</span>
            <span className={remaining <= 10 ? "text-danger font-semibold" : ""}>
              {t("voucher.remaining_count", { count: remaining })}
            </span>
          </div>
          <div className="w-full bg-default-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${usePct >= 75 ? "bg-danger" : "bg-primary"}`}
              style={{ width: `${usePct}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm" variant="flat" color={copied ? "success" : "default"}
            startContent={copied ? <Check size={13} /> : <Copy size={13} />}
            className="flex-1" onPress={copy}
          >
            {copied ? t("voucher.copied") : t("voucher.copy_code")}
          </Button>
          <Button
            size="sm" color="primary" className="flex-1"
            onPress={() => navigate("/checkout", { state: { voucher_code: v.code } })}
          >
            {t("common.use_now")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default function VouchersPage() {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);
  const LIMIT = 12;

  const load = async (pg = 1, append = false) => {
    setLoading(true);
    try {
      const res = await publicVoucherApi.listPublic({ page: pg, limit: LIMIT });
      const items = res.data?.items || [];
      setVouchers((prev) => append ? [...prev, ...items] : items);
      setHasMore((res.data?.total || 0) > pg * LIMIT);
    } catch { /* silent fail */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const displayed = search
    ? vouchers.filter((v) =>
        v.code.toLowerCase().includes(search.toLowerCase()) ||
        (v.discount_type === "percent" ? `${v.discount_value}%` : formatCurrency(v.discount_value))
          .includes(search)
      )
    : vouchers;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-default-900">{t("voucher.discount_page_title")}</h1>
        <p className="text-default-400 text-sm mt-1">{t("voucher.copy_apply_hint")}</p>
      </div>

      <Input
        size="sm" radius="lg" placeholder={t("voucher.search_placeholder")}
        value={search} onValueChange={setSearch}
        startContent={<Search size={14} className="text-default-400" />}
        className="max-w-xs"
      />

      {loading && !vouchers.length ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-default-400">
          <Tag size={40} />
          <p>{search ? t("voucher.no_vouchers_match") : t("voucher.none_available")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((v) => <VoucherCard key={v._id} v={v} />)}
          </div>
          {hasMore && !search && (
            <div className="flex justify-center pt-2">
              <Button variant="flat" radius="lg" isLoading={loading}
                onPress={() => { const next = page + 1; setPage(next); load(next, true); }}>
                {t("voucher.load_more")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
