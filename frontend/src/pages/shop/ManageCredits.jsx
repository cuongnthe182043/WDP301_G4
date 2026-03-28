import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Chip, Spinner, Avatar, Textarea,
} from "@heroui/react";
import PaginationBar from "../../components/ui/PaginationBar";
import { Gift, History } from "lucide-react";
import { shopCreditApi } from "../../services/shopMarketingService";
import { useToast } from "../../components/common/ToastProvider";
import { formatCurrency } from "../../utils/formatCurrency";
import apiClient from "../../services/apiClient";
import { useTranslation } from "react-i18next";

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "—";

const HIST_COLOR = { gift: "success", earn: "success", spend: "danger", expire: "default", adjust: "warning" };

function CustomerCreditModal({ userId, onClose }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    shopCreditApi.getCustomer(userId)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const HIST_LABEL = {
    gift:   t("shop.credit_gift"),
    earn:   t("shop.credit_earn"),
    spend:  t("shop.credit_spend"),
    expire: t("shop.credit_expire"),
    adjust: t("shop.credit_adjust"),
  };

  return (
    <Modal isOpen={!!userId} onOpenChange={(o) => !o && onClose()} radius="xl" size="md" scrollBehavior="inside">
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader>{t("shop.credit_history")}</ModalHeader>
            <ModalBody className="pb-2">
              {loading ? <div className="flex justify-center py-6"><Spinner /></div>
              : !data
              ? <p className="text-center text-default-400 py-6">{t("common.no_data")}</p>
              : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1 bg-success/10 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-success">{formatCurrency(data.balance || 0)}</p>
                      <p className="text-xs text-default-400">{t("shop.current_balance")}</p>
                    </div>
                    <div className="flex-1 bg-primary/10 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-primary">{formatCurrency(data.total_earned || 0)}</p>
                      <p className="text-xs text-default-400">{t("shop.total_earned")}</p>
                    </div>
                    <div className="flex-1 bg-warning/10 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-warning">{formatCurrency(data.total_spent || 0)}</p>
                      <p className="text-xs text-default-400">{t("shop.total_spent")}</p>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {(data.history || []).slice().reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-default-50">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Chip size="sm" color={HIST_COLOR[h.type]} variant="flat">{HIST_LABEL[h.type]}</Chip>
                            <span className="text-xs text-default-500">{h.reason}</span>
                          </div>
                          <p className="text-xs text-default-400 mt-0.5">{formatDate(h.at)}</p>
                        </div>
                        <span className={`font-bold text-sm ${h.amount > 0 ? "text-success" : "text-danger"}`}>
                          {h.amount > 0 ? "+" : ""}{formatCurrency(h.amount)}
                        </span>
                      </div>
                    ))}
                    {!(data.history || []).length && <p className="text-xs text-center text-default-400 py-3">{t("shop.no_transactions")}</p>}
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onModalClose}>{t("common.close")}</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function GiveCreditsModal({ isOpen, onClose, onDone }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({
    recipient_type: "all_buyers",
    custom_user_ids: [],
    amount: "",
    reason: "",
    channels: ["in_app"],
    expires_at: "",
  });
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving,  setSaving]    = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isOpen) { setForm({ recipient_type:"all_buyers", custom_user_ids:[], amount:"", reason:"", channels:["in_app"], expires_at:"" }); return; }
    setLoading(true);
    apiClient.get("/shop/customers", { params: { limit: 100 } })
      .then(r => setCustomers(r.data?.data?.items || r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) return toast.error(t("shop.credits_amount"));
    if (form.recipient_type === "custom" && !form.custom_user_ids.length) return toast.error(t("shop.select_customers"));
    setSaving(true);
    try {
      const res = await shopCreditApi.give({
        ...form,
        amount: Number(form.amount),
        expires_at: form.expires_at || undefined,
      });
      toast.success(res.message || t("shop.give_credits"));
      onDone?.();
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
            <ModalHeader className="flex items-center gap-2"><Gift size={18} /> {t("shop.give_credits_modal")}</ModalHeader>
            <ModalBody className="space-y-3 pb-2">
              <Input label={`${t("shop.credits_amount")} (₫)`} type="number" min="1000"
                value={form.amount} onValueChange={(v) => set("amount", v)} radius="lg"
                description={t("shop.credits_amount_desc")} />
              <Textarea label={t("common.reason")} value={form.reason} onValueChange={(v) => set("reason", v)} radius="lg" minRows={2} />
              <Input label={t("shop.expiry_date")} type="date"
                value={form.expires_at} onValueChange={(v) => set("expires_at", v)} radius="lg" />

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
                  {loading ? <Spinner size="sm" /> : (
                    <div className="max-h-48 overflow-y-auto border border-default-200 rounded-xl p-2 space-y-1">
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

              <div className="flex gap-4">
                {[{ key: "in_app", label: t("shop.channel_in_app") }, { key: "email", label: "Email" }].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox"
                      checked={form.channels.includes(key)}
                      onChange={(e) => {
                        const ch = e.target.checked
                          ? [...form.channels, key]
                          : form.channels.filter(c => c !== key);
                        set("channels", ch);
                      }} className="accent-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onModalClose}>{t("common.cancel")}</Button>
              <Button color="primary" isLoading={saving} onPress={handleSubmit}>
                {t("shop.send_credits")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default function ManageCredits() {
  const { t } = useTranslation();
  const [credits,    setCredits]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [tp,         setTp]         = useState(1);
  const [detailUser, setDetailUser] = useState(null);
  const [showGive,   setShowGive]   = useState(false);
  const [limit, setLimit] = useState(20);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const res = await shopCreditApi.list({ page: pg, limit });
      setCredits(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setTp(Math.ceil((res.data?.total || 0) / limit));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, limit]);

  useEffect(() => { load(page); }, [page]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("shop.credits")}</h1>
          <p className="text-sm text-default-400">{t("shop.credits_customers_desc", { n: total })}</p>
        </div>
        <Button size="sm" color="primary" radius="lg" startContent={<Gift size={14} />}
          onPress={() => setShowGive(true)}>
          {t("shop.give_credits")}
        </Button>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? <div className="flex justify-center py-10"><Spinner /></div>
          : credits.length === 0
          ? <div className="py-12 text-center text-default-400"><Gift size={36} className="mx-auto mb-2 opacity-30" />{t("shop.no_credits")}</div>
          : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {[t("common.customer"), t("common.balance"), t("shop.total_earned"), t("shop.total_spent"), ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {credits.map((c) => (
                  <tr key={c._id} className="hover:bg-default-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={c.user_id?.avatar_url} size="sm" name={c.user_id?.username?.[0]} />
                        <div>
                          <p className="font-semibold text-sm">{c.user_id?.name || c.user_id?.username}</p>
                          <p className="text-xs text-default-400">{c.user_id?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-success-600">{formatCurrency(c.balance)}</td>
                    <td className="px-4 py-3 text-default-500">{formatCurrency(c.total_earned)}</td>
                    <td className="px-4 py-3 text-default-500">{formatCurrency(c.total_spent)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="light" isIconOnly
                        title={t("shop.credit_history")}
                        onPress={() => setDetailUser(String(c.user_id?._id || c.user_id))}>
                        <History size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      <GiveCreditsModal isOpen={showGive} onClose={() => setShowGive(false)} onDone={() => load(1)} />
      <CustomerCreditModal userId={detailUser} onClose={() => setDetailUser(null)} />
    </div>
  );
}
