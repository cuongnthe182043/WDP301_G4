import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Textarea, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Chip, Pagination, Spinner, Avatar,
} from "@heroui/react";
import { Plus, Megaphone, Mail, Bell, Users, ChevronRight, Check } from "lucide-react";
import { campaignApi, voucherDistributeApi } from "../../services/shopMarketingService";
import { voucherApi } from "../../services/voucherService";
import apiClient from "../../services/apiClient";
import { useToast } from "../../components/common/ToastProvider";
import { useTranslation } from "react-i18next";

const formatDate = (d) => d ? new Date(d).toLocaleString() : "—";

const TYPE_COLOR  = { announcement: "primary", voucher_send: "success", credits_gift: "warning" };
const STATUS_COLOR = { pending: "default", sending: "warning", sent: "success", failed: "danger" };

function CampaignRow({ c }) {
  const { t } = useTranslation();
  const TYPE_LABEL = {
    announcement: t("shop.campaign_announcement"),
    voucher_send:  t("shop.campaign_voucher_send"),
    credits_gift:  t("shop.campaign_credits_gift"),
  };
  return (
    <tr className="hover:bg-default-50 border-b border-default-100">
      <td className="px-4 py-3">
        <p className="font-semibold text-sm text-default-900 line-clamp-1">{c.title}</p>
        <p className="text-xs text-default-400 line-clamp-1 mt-0.5">{c.message}</p>
      </td>
      <td className="px-4 py-3">
        <Chip size="sm" color={TYPE_COLOR[c.campaign_type]} variant="flat">{TYPE_LABEL[c.campaign_type]}</Chip>
      </td>
      <td className="px-4 py-3 text-sm text-default-600">
        <div className="flex items-center gap-1">
          <Users size={12} /> {c.recipient_count}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-default-500">
          <span className="text-success font-semibold">{c.sent_count}</span> /{" "}
          {c.recipient_count}
          {c.failed_count > 0 && (
            <span className="text-danger ml-1">({c.failed_count} {t("shop.sent_errors")})</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Chip size="sm" color={STATUS_COLOR[c.status]} variant="flat">{c.status}</Chip>
      </td>
      <td className="px-4 py-3 text-xs text-default-400">{formatDate(c.sent_at || c.createdAt)}</td>
    </tr>
  );
}

function CreateModal({ isOpen, onClose, onCreated }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [step,    setStep]    = useState(1);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({
    campaign_type:  "announcement",
    title:          "",
    message:        "",
    recipient_type: "all_buyers",
    custom_user_ids: [],
    channels:       ["in_app"],
    voucher_id:     "",
    credits_amount: "",
  });
  const [vouchers,    setVouchers]    = useState([]);
  const [customers,   setCustomers]   = useState([]);
  const [loadingCust, setLoadingCust] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isOpen) { setStep(1); setForm({ campaign_type:"announcement", title:"", message:"", recipient_type:"all_buyers", custom_user_ids:[], channels:["in_app"], voucher_id:"", credits_amount:"" }); return; }
    voucherApi.getAll(1, 50, "", "active").then(r => setVouchers(r.data?.items || [])).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (form.recipient_type !== "custom") return;
    setLoadingCust(true);
    apiClient.get("/shop/customers", { params: { limit: 100 } })
      .then(r => setCustomers(r.data?.data?.items || r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoadingCust(false));
  }, [form.recipient_type]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.message.trim()) return toast.error(t("common.required_fields"));
    if (form.campaign_type === "voucher_send" && !form.voucher_id) return toast.error(t("shop.select_voucher"));
    if (form.campaign_type === "credits_gift" && !form.credits_amount) return toast.error(t("shop.credits_gift_amount"));
    if (form.recipient_type === "custom" && !form.custom_user_ids.length) return toast.error(t("shop.select_customers"));

    setSaving(true);
    try {
      if (form.campaign_type === "voucher_send") {
        await voucherDistributeApi.distribute(form.voucher_id, {
          recipient_type:  form.recipient_type,
          custom_user_ids: form.custom_user_ids,
          channels:        form.channels,
          message:         form.message,
        });
      } else {
        await campaignApi.create({
          ...form,
          credits_amount: form.campaign_type === "credits_gift" ? Number(form.credits_amount) : undefined,
        });
      }
      toast.success(t("shop.campaigns_sent"));
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && onClose()} radius="xl" size="lg" scrollBehavior="inside">
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader>{t("shop.create_campaign_modal")}</ModalHeader>
            <ModalBody className="space-y-4 pb-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-default-700">{t("shop.campaign_type_label")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "announcement", icon: Megaphone,     label: t("shop.campaign_announcement"), desc: t("shop.campaign_announcement_desc") },
                    { key: "voucher_send", icon: ChevronRight,  label: t("shop.campaign_voucher_send"), desc: t("shop.campaign_voucher_desc") },
                    { key: "credits_gift", icon: Check,         label: t("shop.campaign_credits_gift"), desc: t("shop.campaign_credits_desc") },
                  ].map(({ key, icon: Icon, label, desc }) => (
                    <button key={key}
                      onClick={() => set("campaign_type", key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${form.campaign_type === key ? "border-primary bg-primary/5" : "border-default-200 hover:border-default-300"}`}>
                      <Icon size={16} className={form.campaign_type === key ? "text-primary" : "text-default-400"} />
                      <p className="font-semibold text-xs mt-1">{label}</p>
                      <p className="text-xs text-default-400">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.campaign_type === "voucher_send" && (
                <Select label={t("shop.select_voucher")} selectedKeys={form.voucher_id ? new Set([form.voucher_id]) : new Set()}
                  onSelectionChange={(k) => set("voucher_id", Array.from(k)[0] || "")} radius="lg">
                  {vouchers.map(v => (
                    <SelectItem key={v._id}>
                      {v.code} — {v.discount_type === "percent" ? `${v.discount_value}%` : `${v.discount_value.toLocaleString()}₫`}
                    </SelectItem>
                  ))}
                </Select>
              )}

              {form.campaign_type === "credits_gift" && (
                <Input label={`${t("shop.credits_gift_amount")} (₫)`} type="number" min="1000"
                  value={form.credits_amount} onValueChange={(v) => set("credits_amount", v)} radius="lg" />
              )}

              <Input label={t("common.title")} placeholder="VD: Khuyến mãi hôm nay!"
                value={form.title} onValueChange={(v) => set("title", v)} radius="lg" />
              <Textarea label={t("common.description")} placeholder="..."
                value={form.message} onValueChange={(v) => set("message", v)} radius="lg" minRows={3} />

              <Select label={t("common.recipients")}
                selectedKeys={new Set([form.recipient_type])}
                onSelectionChange={(k) => set("recipient_type", Array.from(k)[0])} radius="lg">
                <SelectItem key="all_buyers">{t("shop.recipients_all_buyers")}</SelectItem>
                <SelectItem key="recent_30d">{t("shop.recipients_recent_30d")}</SelectItem>
                <SelectItem key="custom">{t("shop.recipients_custom")}</SelectItem>
              </Select>

              {form.recipient_type === "custom" && (
                <div>
                  <p className="text-sm font-medium text-default-700 mb-2">{t("shop.select_customers")}</p>
                  {loadingCust ? <Spinner size="sm" /> : (
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-default-200 rounded-xl p-2">
                      {customers.map(c => (
                        <label key={c._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-default-50 cursor-pointer">
                          <input type="checkbox"
                            checked={form.custom_user_ids.includes(c._id)}
                            onChange={(e) => {
                              const ids = e.target.checked
                                ? [...form.custom_user_ids, c._id]
                                : form.custom_user_ids.filter(id => id !== c._id);
                              set("custom_user_ids", ids);
                            }} className="accent-primary" />
                          <Avatar src={c.user_id?.avatar_url} size="sm" name={c.user_id?.username?.[0]} />
                          <div>
                            <p className="text-xs font-semibold">{c.user_id?.name || c.user_id?.username}</p>
                            <p className="text-xs text-default-400">{c.user_id?.email}</p>
                          </div>
                        </label>
                      ))}
                      {!customers.length && <p className="text-xs text-center text-default-400 py-3">{t("shop.no_customers")}</p>}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-default-700 mb-2">{t("common.channels")}</p>
                <div className="flex gap-3">
                  {[
                    { key: "in_app", icon: Bell, label: t("shop.channel_in_app") },
                    { key: "email",  icon: Mail, label: "Email" },
                  ].map(({ key, icon: Icon, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={form.channels.includes(key)}
                        onChange={(e) => {
                          const ch = e.target.checked
                            ? [...form.channels, key]
                            : form.channels.filter(c => c !== key);
                          set("channels", ch);
                        }} className="accent-primary" />
                      <Icon size={14} className="text-default-500" />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onModalClose}>{t("common.cancel")}</Button>
              <Button color="primary" isLoading={saving} onPress={handleSubmit}>
                {t("shop.send_now")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default function ManageCampaigns() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [tp,        setTp]        = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (typeFilter) params.type = typeFilter;
      const res = await campaignApi.list(params);
      setCampaigns(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTp(Math.ceil((res.data?.total || 0) / LIMIT));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, typeFilter]);

  useEffect(() => { load(page); }, [page, typeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("shop.campaigns")}</h1>
          <p className="text-sm text-default-400">{t("shop.campaigns_desc")}</p>
        </div>
        <div className="flex gap-2">
          <Select size="sm" placeholder={t("common.type")} className="w-40" radius="lg"
            selectedKeys={typeFilter ? new Set([typeFilter]) : new Set()}
            onSelectionChange={(k) => { setTypeFilter(Array.from(k)[0] || ""); setPage(1); }}>
            <SelectItem key="announcement">{t("shop.campaign_announcement")}</SelectItem>
            <SelectItem key="voucher_send">{t("shop.campaign_voucher_send")}</SelectItem>
            <SelectItem key="credits_gift">{t("shop.campaign_credits_gift")}</SelectItem>
          </Select>
          <Button size="sm" color="primary" radius="lg" startContent={<Plus size={14} />}
            onPress={() => setShowCreate(true)}>
            {t("shop.create_campaign")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("shop.total_campaigns"), value: total },
          { label: t("shop.campaigns_sent"), value: campaigns.filter(c => c.status === "sent").length },
          { label: t("shop.customers_received"), value: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0) },
          { label: t("common.errors"), value: campaigns.reduce((s, c) => s + (c.failed_count || 0), 0) },
        ].map(({ label, value }) => (
          <Card key={label} radius="xl" shadow="sm">
            <CardBody className="py-3 px-4">
              <p className="text-2xl font-black text-default-900">{value}</p>
              <p className="text-xs text-default-400">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? <div className="flex justify-center py-10"><Spinner /></div>
          : campaigns.length === 0
          ? <div className="py-12 text-center text-default-400"><Megaphone size={36} className="mx-auto mb-2 opacity-30" />{t("shop.no_campaigns")}</div>
          : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {[t("shop.campaigns"), t("common.type"), t("common.target"), t("common.sent"), t("common.status"), t("common.time")].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => <CampaignRow key={c._id} c={c} />)}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {tp > 1 && <div className="flex justify-center"><Pagination total={tp} page={page} onChange={setPage} color="primary" radius="lg" /></div>}

      <CreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={() => load(1)} />
    </div>
  );
}
