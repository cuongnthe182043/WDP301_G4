import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Spinner, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Select, SelectItem,
} from "@heroui/react";
import {
  Wallet, DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle,
  CheckCircle2, XCircle, Clock, Store, Search, RefreshCw, Settings,
  ChevronRight, AlertTriangle, Percent, CreditCard, BarChart3,
  Send, Ban,
} from "lucide-react";
import apiClient from "../../services/apiClient";
import { toast } from "sonner";
import PaginationBar from "../../components/ui/PaginationBar";

/* ── API ───────────────────────────────────────────────────────────────────── */
const api = {
  stats:          ()          => apiClient.get("/admin/finance/stats").then(r => r.data.data),
  transactions:   (p)         => apiClient.get("/admin/finance/transactions", { params: p }).then(r => r.data.data),
  fees:           (p)         => apiClient.get("/admin/finance/fees", { params: p }).then(r => r.data.data),
  withdrawals:    ()          => apiClient.get("/admin/finance/withdrawals").then(r => r.data.data),
  shops:          ()          => apiClient.get("/admin/finance/shops").then(r => r.data.data),
  getFeeRate:     ()          => apiClient.get("/admin/finance/fee-rate").then(r => r.data.data),
  updateFeeRate:  (fee_rate)  => apiClient.patch("/admin/finance/fee-rate", { fee_rate }).then(r => r.data.data),
  approveWithdraw:(id, note)  => apiClient.post(`/admin/finance/withdrawals/${id}/approve`, { note }).then(r => r.data.data),
  rejectWithdraw: (id, reason)=> apiClient.post(`/admin/finance/withdrawals/${id}/reject`, { reason }).then(r => r.data.data),
  deposit:        (d)         => apiClient.post("/admin/finance/deposit", d).then(r => r.data.data),
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const fmt = (n) => (n || 0).toLocaleString("vi-VN");
const fmtMoney = (n) => `${fmt(n)}₫`;
const fmtDate = (d) => d ? new Date(d).toLocaleString("vi-VN", { hour12: false }) : "—";

const TXN_TYPE_ICON = {
  payment:  { icon: ArrowDownCircle, color: "text-emerald-500" },
  refund:   { icon: ArrowUpCircle,   color: "text-orange-500" },
  withdraw: { icon: Send,            color: "text-rose-500" },
  deposit:  { icon: CreditCard,      color: "text-blue-500" },
  transfer: { icon: ChevronRight,    color: "text-violet-500" },
};

const TXN_STATUS_COLOR = {
  success:   "success",
  pending:   "warning",
  failed:    "danger",
  cancelled: "default",
};

/* ── Stat Card ─────────────────────────────────────────────────────────────── */
const STAT_PALETTE = {
  blue:    { gradient: "from-blue-500/20 to-blue-600/5",     icon: "text-blue-400",    border: "border-blue-500/20",    glow: "shadow-blue-500/10" },
  emerald: { gradient: "from-emerald-500/20 to-emerald-600/5", icon: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
  amber:   { gradient: "from-amber-500/20 to-amber-600/5",   icon: "text-amber-400",   border: "border-amber-500/20",   glow: "shadow-amber-500/10" },
  rose:    { gradient: "from-rose-500/20 to-rose-600/5",     icon: "text-rose-400",    border: "border-rose-500/20",    glow: "shadow-rose-500/10" },
  indigo:  { gradient: "from-indigo-500/20 to-indigo-600/5", icon: "text-indigo-400",  border: "border-indigo-500/20",  glow: "shadow-indigo-500/10" },
  violet:  { gradient: "from-violet-500/20 to-violet-600/5", icon: "text-violet-400",  border: "border-violet-500/20",  glow: "shadow-violet-500/10" },
};

function StatCard({ icon: Icon, label, value, sub, accent = "blue" }) {
  const p = STAT_PALETTE[accent] || STAT_PALETTE.blue;
  return (
    <div className={`relative overflow-hidden rounded-xl border ${p.border} bg-white dark:bg-[#131620] shadow-lg ${p.glow} p-5 hover:shadow-xl transition-all duration-300`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-60 pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] mb-2">{label}</p>
          <p className="text-2xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs text-zinc-400 dark:text-[#6b7280] mt-1.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-white/50 dark:bg-[#1a1e2e]/80 ${p.icon}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

/* ── Tab buttons ───────────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active
          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
          : "bg-white dark:bg-[#1a1e2e] text-zinc-600 dark:text-[#9ea3b5] border border-zinc-200 dark:border-[#2e3347] hover:bg-zinc-50 dark:hover:bg-[#222738]"
      }`}
    >
      <Icon size={15} />
      {label}
      {count > 0 && (
        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
          active ? "bg-white/20 text-white" : "bg-rose-500 text-white"
        }`}>{count}</span>
      )}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
export default function Reconciliation() {
  const { t } = useTranslation();

  const [tab,       setTab]       = useState("overview");
  const [loading,   setLoading]   = useState(true);
  const [stats,     setStats]     = useState(null);

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState([]);
  const [wdLoading,   setWdLoading]   = useState(false);
  const [actionModal, setActionModal] = useState(null); // { txn, action: "approve"|"reject" }
  const [actionNote,  setActionNote]  = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  // Transactions
  const [txns,      setTxns]      = useState([]);
  const [txnTotal,  setTxnTotal]  = useState(0);
  const [txnPage,   setTxnPage]   = useState(1);
  const [txnFilter, setTxnFilter] = useState({ type: "", status: "", wallet_type: "" });
  const [txnLoading, setTxnLoading] = useState(false);

  // Fees
  const [fees,      setFees]      = useState([]);
  const [feeTotal,  setFeeTotal]  = useState(0);
  const [feePage,   setFeePage]   = useState(1);
  const [feeLoading, setFeeLoading] = useState(false);

  // Fee rate config
  const [feeRateModal, setFeeRateModal] = useState(false);
  const [newFeeRate,   setNewFeeRate]   = useState("");
  const [feeRateSaving, setFeeRateSaving] = useState(false);

  // Deposit
  const [depositModal,  setDepositModal]  = useState(false);
  const [depositForm,   setDepositForm]   = useState({ shop_id: "", amount: "", note: "" });
  const [depositSaving, setDepositSaving] = useState(false);
  const [shopList,      setShopList]      = useState([]);

  // Shop wallets
  const [shopWallets,   setShopWallets]   = useState([]);
  const [swLoading,     setSwLoading]     = useState(false);
  const [swSearch,      setSwSearch]      = useState("");

  const [limit, setLimit] = useState(15);

  /* ── Loaders ── */
  const loadStats = useCallback(async () => {
    setLoading(true);
    try { setStats(await api.stats()); }
    catch { toast.error(t("common.error")); }
    finally { setLoading(false); }
  }, [t]);

  const loadWithdrawals = useCallback(async () => {
    setWdLoading(true);
    try { setWithdrawals(await api.withdrawals()); }
    catch { toast.error(t("common.error")); }
    finally { setWdLoading(false); }
  }, [t]);

  const loadTxns = useCallback(async (page = 1) => {
    setTxnLoading(true);
    try {
      const data = await api.transactions({ page, limit: limit, ...txnFilter });
      setTxns(data.transactions);
      setTxnTotal(data.total);
      setTxnPage(page);
    } catch { toast.error(t("common.error")); }
    finally { setTxnLoading(false); }
  }, [txnFilter, limit, t]);

  const loadFees = useCallback(async (page = 1) => {
    setFeeLoading(true);
    try {
      const data = await api.fees({ page, limit: limit });
      setFees(data.fees);
      setFeeTotal(data.total);
      setFeePage(page);
    } catch { toast.error(t("common.error")); }
    finally { setFeeLoading(false); }
  }, [limit, t]);

  const loadShopWallets = useCallback(async () => {
    setSwLoading(true);
    try { setShopWallets(await api.shops()); }
    catch { toast.error(t("common.error")); }
    finally { setSwLoading(false); }
  }, [t]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (tab === "withdrawals") loadWithdrawals();
    else if (tab === "transactions") loadTxns(1);
    else if (tab === "fees") loadFees(1);
    else if (tab === "shops") loadShopWallets();
  }, [tab]);

  useEffect(() => { if (tab === "transactions") loadTxns(1); }, [txnFilter]);

  /* ── Actions ── */
  const handleWithdrawAction = async () => {
    if (!actionModal) return;
    const { txn, action } = actionModal;
    if (action === "reject" && !actionNote.trim()) {
      toast.error(t("finance.reason_required"));
      return;
    }
    setActionSaving(true);
    try {
      if (action === "approve") await api.approveWithdraw(txn._id, actionNote);
      else                      await api.rejectWithdraw(txn._id, actionNote);
      toast.success(action === "approve" ? t("finance.withdraw_approved") : t("finance.withdraw_rejected"));
      setActionModal(null);
      setActionNote("");
      loadWithdrawals();
      loadStats();
    } catch (e) { toast.error(e?.response?.data?.message || t("common.error")); }
    finally { setActionSaving(false); }
  };

  const handleFeeRateUpdate = async () => {
    const rate = parseFloat(newFeeRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error(t("finance.invalid_fee_rate"));
      return;
    }
    setFeeRateSaving(true);
    try {
      await api.updateFeeRate(rate / 100);
      toast.success(t("finance.fee_rate_updated"));
      setFeeRateModal(false);
      loadStats();
    } catch (e) { toast.error(e?.response?.data?.message || t("common.error")); }
    finally { setFeeRateSaving(false); }
  };

  const handleDeposit = async () => {
    if (!depositForm.shop_id || !depositForm.amount || Number(depositForm.amount) <= 0) {
      toast.error(t("finance.deposit_invalid"));
      return;
    }
    setDepositSaving(true);
    try {
      await api.deposit({ shop_id: depositForm.shop_id, amount: Number(depositForm.amount), note: depositForm.note });
      toast.success(t("finance.deposit_success"));
      setDepositModal(false);
      setDepositForm({ shop_id: "", amount: "", note: "" });
      loadStats();
      if (tab === "shops") loadShopWallets();
    } catch (e) { toast.error(e?.response?.data?.message || t("common.error")); }
    finally { setDepositSaving(false); }
  };

  const openDeposit = async () => {
    if (!shopList.length) {
      try { setShopList(await api.shops()); } catch {}
    }
    setDepositModal(true);
  };

  const filteredShopWallets = useMemo(() => {
    if (!swSearch.trim()) return shopWallets;
    const q = swSearch.toLowerCase();
    return shopWallets.filter(s => (s.shop_name || "").toLowerCase().includes(q));
  }, [shopWallets, swSearch]);

  /* ── Render ── */
  if (loading && !stats) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Wallet size={22} className="text-blue-500" />
            {t("finance.title")}
          </h1>
          <p className="text-sm text-zinc-400 dark:text-[#6b7280] mt-0.5">{t("finance.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setNewFeeRate(String((stats?.current_fee_rate || 0.05) * 100)); setFeeRateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e] text-zinc-700 dark:text-[#d1d5db] hover:bg-zinc-50 dark:hover:bg-[#222738] transition-all"
          >
            <Percent size={15} /> {t("finance.fee_rate")}: {((stats?.current_fee_rate || 0.05) * 100).toFixed(1)}%
          </button>
          <button
            onClick={openDeposit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #059669, #10B981)" }}
          >
            <CreditCard size={15} /> {t("finance.deposit")}
          </button>
          <button
            onClick={() => { loadStats(); if (tab === "withdrawals") loadWithdrawals(); }}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e] text-zinc-500 dark:text-[#9ea3b5] hover:bg-zinc-50 dark:hover:bg-[#222738] transition-all"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Wallet}         label={t("finance.system_balance")}      value={fmtMoney(stats.system_balance)}      accent="blue" />
          <StatCard icon={DollarSign}     label={t("finance.total_fees")}          value={fmtMoney(stats.total_fees_collected)} sub={`${fmt(stats.total_orders_settled)} ${t("finance.orders_settled")}`} accent="emerald" />
          <StatCard icon={Clock}          label={t("finance.pending_withdrawals")} value={fmtMoney(stats.pending_withdrawals)} sub={`${stats.pending_withdraw_count} ${t("finance.requests")}`} accent="amber" />
          <StatCard icon={CheckCircle2}   label={t("finance.completed_withdrawals")} value={fmtMoney(stats.completed_withdrawals)} accent="indigo" />
          <StatCard icon={Store}          label={t("finance.shop_balances")}       value={fmtMoney(stats.shop_total_available)} sub={`${stats.shop_count} ${t("finance.shops")}`} accent="violet" />
          <StatCard icon={TrendingUp}     label={t("finance.shop_pending")}        value={fmtMoney(stats.shop_total_pending)}  accent="rose" />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        <TabBtn active={tab === "overview"}     onClick={() => setTab("overview")}     icon={BarChart3}       label={t("finance.tab_overview")} />
        <TabBtn active={tab === "withdrawals"}  onClick={() => setTab("withdrawals")}  icon={Send}            label={t("finance.tab_withdrawals")} count={stats?.pending_withdraw_count || 0} />
        <TabBtn active={tab === "transactions"} onClick={() => setTab("transactions")} icon={ArrowDownCircle} label={t("finance.tab_transactions")} />
        <TabBtn active={tab === "fees"}         onClick={() => setTab("fees")}         icon={Percent}         label={t("finance.tab_fees")} />
        <TabBtn active={tab === "shops"}        onClick={() => setTab("shops")}        icon={Store}           label={t("finance.tab_shops")} />
      </div>

      {/* ══ Tab Content ══ */}

      {/* ── Overview: Monthly fee chart ── */}
      {tab === "overview" && stats && (
        <div className="rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#131620] shadow-lg p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] mb-4">{t("finance.monthly_revenue")}</h2>
          {stats.monthly_fees?.length > 0 ? (
            <div className="space-y-2">
              {stats.monthly_fees.map((m, i) => {
                const maxFee = Math.max(...stats.monthly_fees.map(x => x.fee_total));
                const pct = maxFee > 0 ? (m.fee_total / maxFee) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-500 dark:text-[#9ea3b5] w-16 text-right">{m._id.month}/{m._id.year}</span>
                    <div className="flex-1 h-7 bg-zinc-100 dark:bg-[#1a1e2e] rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%`, background: "linear-gradient(90deg, #2563EB, #4F46E5)" }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-600 dark:text-[#d1d5db]">
                        {fmtMoney(m.fee_total)}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-[#6b7280] w-24 text-right">{fmt(m.count)} {t("finance.orders_short")}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-400 dark:text-zinc-600 text-center py-8">{t("common.no_data")}</p>
          )}
        </div>
      )}

      {/* ── Pending Withdrawals ── */}
      {tab === "withdrawals" && (
        <div className="rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#131620] shadow-lg overflow-hidden">
          {wdLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
              <CheckCircle2 size={40} className="mx-auto mb-2 opacity-40" />
              <p>{t("finance.no_pending_withdrawals")}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-[#2e3347] bg-zinc-50/80 dark:bg-[#1a1e2e]/40">
                  {[t("finance.col_shop"), t("finance.col_amount"), t("finance.col_bank"), t("finance.col_date"), t("finance.col_note"), ""].map((h, i) => (
                    <th key={i} className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#222738]">
                {withdrawals.map(wd => (
                  <tr key={wd._id} className="group hover:bg-blue-50/40 dark:hover:bg-[#1a1e2e]/60 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-zinc-800 dark:text-[#d1d5db]">{wd.shop_name || "—"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-black text-rose-600 dark:text-rose-400 tabular-nums">{fmtMoney(wd.amount)}</span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 dark:text-[#9ea3b5] text-xs">
                      {wd.bank_account ? (
                        <span>{wd.bank_account.bank_name} — {wd.bank_account.account_number}</span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 dark:text-[#9ea3b5] text-xs tabular-nums">{fmtDate(wd.createdAt)}</td>
                    <td className="px-5 py-3 text-zinc-400 dark:text-zinc-600 text-xs max-w-[160px] truncate">{wd.note || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setActionNote(""); setActionModal({ txn: wd, action: "approve" }); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                        >
                          {t("finance.approve")}
                        </button>
                        <button
                          onClick={() => { setActionNote(""); setActionModal({ txn: wd, action: "reject" }); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors"
                        >
                          {t("finance.reject")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Transactions ── */}
      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select
              value={txnFilter.type}
              onChange={e => setTxnFilter(f => ({ ...f, type: e.target.value }))}
              className="h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-700 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="">{t("finance.all_types")}</option>
              {["payment", "refund", "withdraw", "deposit", "transfer"].map(v => (
                <option key={v} value={v}>{t(`finance.type_${v}`)}</option>
              ))}
            </select>
            <select
              value={txnFilter.status}
              onChange={e => setTxnFilter(f => ({ ...f, status: e.target.value }))}
              className="h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-700 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="">{t("finance.all_statuses")}</option>
              {["success", "pending", "failed", "cancelled"].map(v => (
                <option key={v} value={v}>{t(`finance.status_${v}`)}</option>
              ))}
            </select>
            <select
              value={txnFilter.wallet_type}
              onChange={e => setTxnFilter(f => ({ ...f, wallet_type: e.target.value }))}
              className="h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-700 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="">{t("finance.all_wallets")}</option>
              <option value="shop">{t("finance.wallet_shop")}</option>
              <option value="customer">{t("finance.wallet_customer")}</option>
              <option value="system">{t("finance.wallet_system")}</option>
            </select>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#131620] shadow-lg overflow-hidden">
            {txnLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : txns.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">{t("common.no_data")}</div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-[#2e3347] bg-zinc-50/80 dark:bg-[#1a1e2e]/40">
                      {[t("finance.col_type"), t("finance.col_amount"), t("finance.col_direction"), t("finance.col_wallet"), t("finance.col_status"), t("finance.col_date"), t("finance.col_note")].map((h, i) => (
                        <th key={i} className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-[#222738]">
                    {txns.map(tx => {
                      const typeInfo = TXN_TYPE_ICON[tx.type] || TXN_TYPE_ICON.payment;
                      const TIcon = typeInfo.icon;
                      return (
                        <tr key={tx._id} className="hover:bg-blue-50/40 dark:hover:bg-[#1a1e2e]/60 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${typeInfo.color}`}>
                              <TIcon size={13} /> {t(`finance.type_${tx.type}`)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums text-zinc-800 dark:text-[#d1d5db]">{fmtMoney(tx.amount)}</td>
                          <td className="px-4 py-3">
                            <Chip size="sm" variant="flat" color={tx.direction === "in" ? "success" : "danger"}>
                              {tx.direction === "in" ? "IN" : "OUT"}
                            </Chip>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-zinc-500 dark:text-[#9ea3b5]">
                              {tx.wallet_type === "shop" ? (tx.shop_name || "Shop") : tx.wallet_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Chip size="sm" variant="flat" color={TXN_STATUS_COLOR[tx.status] || "default"}>
                              {t(`finance.status_${tx.status}`)}
                            </Chip>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-400 dark:text-[#6b7280] tabular-nums">{fmtDate(tx.createdAt)}</td>
                          <td className="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-600 max-w-[180px] truncate">{tx.note || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <PaginationBar total={txnTotal} page={txnPage} limit={limit} onPageChange={(p) => loadTxns(p)} onLimitChange={(v) => { setLimit(v); loadTxns(1); }} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Platform Fees ── */}
      {tab === "fees" && (
        <div className="rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#131620] shadow-lg overflow-hidden">
          {feeLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : fees.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">{t("common.no_data")}</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-[#2e3347] bg-zinc-50/80 dark:bg-[#1a1e2e]/40">
                    {[t("finance.col_order"), t("finance.col_order_total"), t("finance.col_fee_rate"), t("finance.col_fee_amount"), t("finance.col_shop_receive"), t("finance.col_date")].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-[#222738]">
                  {fees.map(f => (
                    <tr key={f._id} className="hover:bg-blue-50/40 dark:hover:bg-[#1a1e2e]/60 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{f.order_code}</span>
                      </td>
                      <td className="px-5 py-3 font-bold tabular-nums text-zinc-800 dark:text-[#d1d5db]">{fmtMoney(f.order_total)}</td>
                      <td className="px-5 py-3">
                        <Chip size="sm" variant="flat" color="warning">{(f.fee_rate * 100).toFixed(1)}%</Chip>
                      </td>
                      <td className="px-5 py-3 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(f.fee_amount)}</td>
                      <td className="px-5 py-3 font-bold tabular-nums text-zinc-600 dark:text-[#9ea3b5]">{fmtMoney(f.shop_receive)}</td>
                      <td className="px-5 py-3 text-xs text-zinc-400 dark:text-[#6b7280] tabular-nums">{fmtDate(f.settled_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationBar total={feeTotal} page={feePage} limit={limit} onPageChange={(p) => loadFees(p)} onLimitChange={(v) => { setLimit(v); loadFees(1); }} />
            </>
          )}
        </div>
      )}

      {/* ── Shop Wallets ── */}
      {tab === "shops" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              value={swSearch}
              onChange={e => setSwSearch(e.target.value)}
              placeholder={t("common.search") + "..."}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-[#2e3347] bg-white dark:bg-[#131620] shadow-lg overflow-hidden">
            {swLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : filteredShopWallets.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">{t("common.no_data")}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-[#2e3347] bg-zinc-50/80 dark:bg-[#1a1e2e]/40">
                    {[t("finance.col_shop"), t("finance.col_available"), t("finance.col_pending"), t("finance.col_total"), ""].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-[#222738]">
                  {filteredShopWallets.map(s => (
                    <tr key={s.wallet_id} className="hover:bg-blue-50/40 dark:hover:bg-[#1a1e2e]/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {s.shop_logo ? (
                            <img src={s.shop_logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                              <Store size={14} className="text-blue-500" />
                            </div>
                          )}
                          <span className="font-semibold text-zinc-800 dark:text-[#d1d5db]">{s.shop_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(s.balance_available)}</td>
                      <td className="px-5 py-3 font-bold tabular-nums text-amber-600 dark:text-amber-400">{fmtMoney(s.balance_pending)}</td>
                      <td className="px-5 py-3 font-bold tabular-nums text-zinc-800 dark:text-white">{fmtMoney(s.balance_available + s.balance_pending)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => { setDepositForm({ shop_id: s.shop_id, amount: "", note: "" }); setShopList(shopWallets); setDepositModal(true); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        >
                          {t("finance.deposit")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Withdraw Action Modal ── */}
      <Modal isOpen={!!actionModal} onOpenChange={o => !o && setActionModal(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-zinc-900 dark:text-white">
                {actionModal?.action === "approve" ? t("finance.approve_title") : t("finance.reject_title")}
              </ModalHeader>
              <ModalBody>
                {actionModal && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-[#1a1e2e] border border-zinc-100 dark:border-[#2e3347]">
                      <span className="text-sm text-zinc-500 dark:text-[#9ea3b5]">{actionModal.txn.shop_name || "Shop"}</span>
                      <span className="text-lg font-black text-zinc-800 dark:text-white tabular-nums">{fmtMoney(actionModal.txn.amount)}</span>
                    </div>
                    {actionModal.txn.bank_account && (
                      <div className="text-xs text-zinc-500 dark:text-[#9ea3b5] p-3 rounded-xl bg-zinc-50 dark:bg-[#1a1e2e] border border-zinc-100 dark:border-[#2e3347]">
                        <p className="font-semibold mb-1">{t("finance.bank_info")}:</p>
                        <p>{actionModal.txn.bank_account.bank_name} — {actionModal.txn.bank_account.account_number}</p>
                        <p>{actionModal.txn.bank_account.owner_name}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] mb-1.5 block">
                        {actionModal.action === "reject" ? t("finance.reject_reason") : t("common.note")}
                        {actionModal.action === "reject" && <span className="text-rose-500 ml-0.5">*</span>}
                      </label>
                      <textarea
                        value={actionNote}
                        onChange={e => setActionNote(e.target.value)}
                        placeholder={actionModal.action === "reject" ? t("finance.reject_reason_placeholder") : t("common.optional")}
                        rows={3}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none"
                      />
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleWithdrawAction}
                  disabled={actionSaving}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-[0.97] ${
                    actionModal?.action === "approve" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
                  }`}
                >
                  {actionSaving && <Spinner size="sm" color="white" />}
                  {actionModal?.action === "approve" ? t("finance.approve") : t("finance.reject")}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Fee Rate Modal ── */}
      <Modal isOpen={feeRateModal} onOpenChange={o => !o && setFeeRateModal(false)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-zinc-900 dark:text-white">{t("finance.update_fee_rate")}</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">{t("finance.fee_rate_warning")}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] mb-1.5 block">
                      {t("finance.fee_rate_label")} (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newFeeRate}
                      onChange={e => setNewFeeRate(e.target.value)}
                      className="w-full h-10 px-3.5 text-sm rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleFeeRateUpdate}
                  disabled={feeRateSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:shadow-lg active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
                >
                  {feeRateSaving && <Spinner size="sm" color="white" />}
                  {t("common.save")}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Deposit Modal ── */}
      <Modal isOpen={depositModal} onOpenChange={o => !o && setDepositModal(false)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-zinc-900 dark:text-white">{t("finance.deposit_title")}</ModalHeader>
              <ModalBody className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] mb-1.5 block">
                    {t("finance.select_shop")} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={depositForm.shop_id}
                    onChange={e => setDepositForm(f => ({ ...f, shop_id: e.target.value }))}
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  >
                    <option value="">{t("finance.select_shop_placeholder")}</option>
                    {shopList.map(s => (
                      <option key={s.shop_id} value={s.shop_id}>{s.shop_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] mb-1.5 block">
                    {t("finance.amount")} (₫) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={depositForm.amount}
                    onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="100,000"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#6b7280] mb-1.5 block">
                    {t("common.note")}
                  </label>
                  <textarea
                    value={depositForm.note}
                    onChange={e => setDepositForm(f => ({ ...f, note: e.target.value }))}
                    placeholder={t("finance.deposit_note_placeholder")}
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-[#2e3347] bg-zinc-50 dark:bg-[#1a1e2e]/60 text-zinc-800 dark:text-[#d1d5db] placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none"
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={depositSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:shadow-lg active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #059669, #10B981)" }}
                >
                  {depositSaving && <Spinner size="sm" color="white" />}
                  {t("finance.deposit")}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
