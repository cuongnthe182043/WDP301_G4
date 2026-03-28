import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Chip, Spinner, RadioGroup, Radio,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import {
  Wallet, TrendingDown, TrendingUp, ArrowDownRight, ArrowUpRight,
  RefreshCw, Landmark, CheckCircle2, Star, AlertCircle,
} from "lucide-react";
import { shopWalletApi } from "../../services/shopManagementService";
import { bankService } from "../../services/bankService";
import { useToast } from "../../components/common/ToastProvider";
import { useTranslation } from "react-i18next";
import PaginationBar from "../../components/ui/PaginationBar";

const formatVND = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
const formatDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "-";

export default function ShopWallet() {
  const { t } = useTranslation();
  const toast = useToast();
  const [wallet, setWallet]         = useState(null);
  const [transactions, setTxns]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [txnLoading, setTxnLoading] = useState(false);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [limit, setLimit]           = useState(20);

  // Withdraw modal
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount]             = useState("");
  const [note, setNote]                 = useState("");
  const [saving, setSaving]             = useState(false);

  // Bank accounts
  const [banks, setBanks]               = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");

  const TXN_TYPE_LABELS = {
    payment: t("wallet.type_payment"),
    refund: t("wallet.type_refund"),
    transfer: t("wallet.type_transfer"),
    withdraw: t("wallet.type_withdraw"),
    deposit: t("wallet.type_deposit"),
  };

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopWalletApi.getWallet();
      setWallet(res.data?.wallet || null);
    } catch (e) { toast.error(e?.message || t("common.error")); }
    finally { setLoading(false); }
  }, []);

  const loadTxns = useCallback(async (pg) => {
    const target = pg ?? page;
    setTxnLoading(true);
    try {
      const res = await shopWalletApi.getTransactions({ page: target, limit });
      setTxns(res.data?.transactions || []);
      setTotal(res.data?.total || 0);
    } catch (e) { toast.error(e?.message || t("common.error")); }
    finally { setTxnLoading(false); }
  }, [page, limit]);

  useEffect(() => { loadWallet(); }, []);
  useEffect(() => { loadTxns(page); }, [page, limit]);

  const handleRefresh = () => { loadWallet(); loadTxns(page); };

  // Load bank accounts when modal opens
  useEffect(() => {
    if (!withdrawOpen) return;
    (async () => {
      setBanksLoading(true);
      try {
        const list = await bankService.list();
        setBanks(Array.isArray(list) ? list : []);
        // Auto-select default bank
        const def = (Array.isArray(list) ? list : []).find((b) => b.is_default);
        if (def) setSelectedBank(def._id);
      } catch { setBanks([]); }
      finally { setBanksLoading(false); }
    })();
  }, [withdrawOpen]);

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error(t("common.required"));
    if (!selectedBank) return toast.error(t("wallet.select_bank"));
    setSaving(true);
    try {
      await shopWalletApi.withdraw(amt, selectedBank, note);
      toast.success(t("common.success"));
      setWithdrawOpen(false); setAmount(""); setNote(""); setSelectedBank("");
      loadWallet();
      loadTxns(1);
      setPage(1);
    } catch (e) { toast.error(e?.message || t("common.error")); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-default-900">{t("shop.wallet")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="bordered" radius="lg" size="sm" onPress={handleRefresh}
            startContent={<RefreshCw size={14} />}>
            {t("common.refresh")}
          </Button>
          <Button color="primary" radius="lg" onPress={() => setWithdrawOpen(true)}
            startContent={<TrendingDown size={16} />}>
            {t("wallet.withdraw")}
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card radius="xl" shadow="sm" className="bg-gradient-to-br from-primary to-primary-600 text-white">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/80 text-sm font-medium">{t("wallet.available")}</p>
              <Wallet size={20} className="text-white/60" />
            </div>
            <p className="text-3xl font-black">{formatVND(wallet?.balance_available)}</p>
            <p className="text-white/60 text-xs mt-2">{wallet?.currency || "VND"}</p>
          </CardBody>
        </Card>
        <Card radius="xl" shadow="sm">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-default-500 text-sm font-medium">{t("wallet.pending")}</p>
              <TrendingUp size={20} className="text-warning" />
            </div>
            <p className="text-3xl font-black text-default-900">{formatVND(wallet?.balance_pending)}</p>
            <p className="text-default-400 text-xs mt-2">{t("common.pending")}</p>
          </CardBody>
        </Card>
      </div>

      {/* Transaction History */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0">
          <div className="px-4 py-3 border-b border-default-100">
            <p className="font-bold text-default-900">{t("wallet.history")} ({total})</p>
          </div>
          {txnLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Wallet size={40} className="text-default-300" />
              <p className="text-default-400">{t("wallet.no_transactions")}</p>
            </div>
          ) : (
            <div className="divide-y divide-default-100">
              {transactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      tx.direction === "in" ? "bg-success/10" : "bg-danger/10"
                    }`}>
                      {tx.direction === "in"
                        ? <ArrowDownRight size={16} className="text-success" />
                        : <ArrowUpRight size={16} className="text-danger" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-default-900">
                        {TXN_TYPE_LABELS[tx.type] || tx.type}
                      </p>
                      <p className="text-xs text-default-400">{formatDate(tx.createdAt)}</p>
                      {tx.note && <p className="text-xs text-default-400 truncate max-w-[200px]">{tx.note}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.direction === "in" ? "text-success" : "text-danger"}`}>
                      {tx.direction === "in" ? "+" : "-"}{formatVND(tx.amount)}
                    </p>
                    <Chip size="sm" color={tx.status === "success" ? "success" : tx.status === "pending" ? "warning" : "default"} variant="flat">
                      {tx.status}
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* Withdraw Modal */}
      <Modal isOpen={withdrawOpen} onOpenChange={(o) => !o && setWithdrawOpen(false)} radius="xl" size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("wallet.withdraw")}</ModalHeader>
              <ModalBody className="space-y-4">
                {/* Balance info */}
                <div className="bg-default-50 dark:bg-default-100/10 rounded-xl p-3 text-sm">
                  <span className="text-default-500">{t("wallet.available")}: </span>
                  <span className="font-bold text-success">{formatVND(wallet?.balance_available)}</span>
                </div>

                {/* Bank account selection */}
                <div>
                  <p className="text-sm font-semibold text-default-700 mb-2">{t("wallet.withdraw_to")}</p>
                  {banksLoading ? (
                    <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                  ) : banks.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6 bg-default-50 dark:bg-default-100/10 rounded-xl">
                      <AlertCircle size={24} className="text-warning" />
                      <p className="text-sm font-medium text-default-600">{t("wallet.no_bank_account")}</p>
                      <p className="text-xs text-default-400">{t("wallet.add_bank_hint")}</p>
                    </div>
                  ) : (
                    <RadioGroup value={selectedBank} onValueChange={setSelectedBank} className="gap-2">
                      {banks.map((bank) => (
                        <Radio
                          key={bank._id}
                          value={bank._id}
                          classNames={{
                            base: "max-w-full m-0 border border-default-200 dark:border-default-100/20 rounded-xl p-3 cursor-pointer data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 hover:bg-default-50 dark:hover:bg-default-100/5 transition-colors",
                            label: "w-full",
                          }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-10 h-10 rounded-lg bg-default-100 dark:bg-default-200/10 flex items-center justify-center flex-shrink-0">
                              {bank.logo_url
                                ? <img src={bank.logo_url} alt={bank.bank_name} className="w-7 h-7 object-contain rounded" />
                                : <Landmark size={18} className="text-default-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-default-900 truncate">{bank.bank_name}</p>
                              <p className="text-xs text-default-500 font-mono">
                                ••••{bank.account_number?.slice(-4)} · {bank.owner_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {bank.is_default && (
                                <Chip size="sm" color="primary" variant="flat" startContent={<Star size={10} />}>
                                  {t("wallet.bank_default")}
                                </Chip>
                              )}
                              {bank.is_verified && (
                                <CheckCircle2 size={16} className="text-success" />
                              )}
                            </div>
                          </div>
                        </Radio>
                      ))}
                    </RadioGroup>
                  )}
                </div>

                {/* Amount */}
                <Input
                  label={t("wallet.withdraw_amount")}
                  placeholder="0"
                  type="number"
                  min="1"
                  value={amount}
                  onValueChange={setAmount}
                  radius="lg"
                  startContent={<span className="text-default-400 text-sm">₫</span>}
                />

                {/* Note */}
                <Input
                  label={`${t("common.note")} (${t("common.optional")})`}
                  placeholder="..."
                  value={note}
                  onValueChange={setNote}
                  radius="lg"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
                <Button color="primary" isLoading={saving} onPress={handleWithdraw}
                  isDisabled={banks.length === 0 || !selectedBank}>
                  {t("common.submit")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
