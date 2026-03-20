import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Chip, Skeleton, Select, SelectItem } from "@heroui/react";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ShoppingBag,
  Banknote,
  RefreshCw,
} from "lucide-react";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { walletService } from "../../services/walletService";
import { formatCurrency } from "../../utils/formatCurrency";

const TOKEN_KEY = "DFS_TOKEN";

const TXN_TYPE_ICON = {
  refund:   <RotateCcw   size={16} className="text-success" />,
  payment:  <ShoppingBag size={16} className="text-danger"  />,
  deposit:  <ArrowUpRight  size={16} className="text-primary" />,
  withdraw: <ArrowDownLeft size={16} className="text-warning" />,
  transfer: <Banknote      size={16} className="text-secondary" />,
};

function txnIcon(type, direction) {
  if (TXN_TYPE_ICON[type]) return TXN_TYPE_ICON[type];
  return direction === "in"
    ? <TrendingUp  size={16} className="text-success" />
    : <TrendingDown size={16} className="text-danger" />;
}

export default function Wallet() {
  const { t } = useTranslation();
  const isLoggedIn = !!localStorage.getItem(TOKEN_KEY);

  const [wallet,  setWallet]  = useState(null);
  const [txns,    setTxns]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");

  const LIMIT = 20;

  const TXN_LABELS = {
    payment:  t("wallet.type_payment"),
    refund:   t("wallet.type_refund"),
    deposit:  t("wallet.type_deposit"),
    withdraw: t("wallet.type_withdraw"),
    transfer: t("wallet.type_transfer"),
  };

  const txnLabel = (type) => TXN_LABELS[type] || type;

  const loadWallet = useCallback(async () => {
    if (!isLoggedIn) { setLoading(false); return; }
    try {
      const w = await walletService.getWallet();
      setWallet(w);
    } catch { /* wallet may not exist yet */ }
  }, [isLoggedIn]);

  const loadTxns = useCallback(async (pageNum = 1, type = "all", append = false) => {
    if (!isLoggedIn) return;
    try {
      const result = await walletService.getTransactions(pageNum, LIMIT, type !== "all" ? type : undefined);
      const items = result?.transactions || [];
      setTxns(prev => append ? [...prev, ...items] : items);
      setTotal(result?.total || 0);
    } catch { /* ignore */ }
  }, [isLoggedIn]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadWallet(), loadTxns(1, typeFilter)]);
      setLoading(false);
    })();
  }, [isLoggedIn]);

  const handleTypeFilter = async (type) => {
    setTypeFilter(type);
    setPage(1);
    setLoading(true);
    await loadTxns(1, type);
    setLoading(false);
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    await loadTxns(nextPage, typeFilter, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const balance = wallet?.balance_available ?? 0;
  const pending = wallet?.balance_pending  ?? 0;
  const hasMore = txns.length < total;

  return (
    <PageContainer wide={false}>
      <h1 className="text-2xl font-black text-default-900 mb-7">{t("wallet.title")}</h1>

      <div className="space-y-5">
        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card
            radius="2xl"
            className="border-0"
            style={{ background: "linear-gradient(135deg, #0B74E5 0%, #0050c8 100%)" }}
          >
            <CardBody className="p-7">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-white/70 text-sm font-medium mb-1">{t("wallet.available")}</p>
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  >
                    <WalletIcon size={40} className="text-white/50" strokeWidth={1.5} />
                  </motion.div>
                </div>
                {pending > 0 && (
                  <Chip size="sm" className="bg-white/20 text-white border-white/30 border font-semibold">
                    {t("wallet.pending")} {formatCurrency(pending)}
                  </Chip>
                )}
              </div>

              {loading ? (
                <Skeleton className="h-10 w-1/2 rounded-xl" />
              ) : (
                <p className="text-4xl font-black text-white tracking-tight">{formatCurrency(balance)}</p>
              )}
              <p className="text-white/60 text-sm mt-2">{t("wallet.coming_soon")}</p>

              <div className="flex gap-3 mt-6">
                <Button
                  radius="xl" isDisabled
                  className="flex-1 bg-white/20 text-white border border-white/30 font-semibold"
                  startContent={<ArrowUpRight size={16} />}
                >
                  {t("wallet.deposit")}
                </Button>
                <Button
                  radius="xl" isDisabled
                  className="flex-1 bg-white/20 text-white border border-white/30 font-semibold"
                  startContent={<ArrowDownLeft size={16} />}
                >
                  {t("wallet.withdraw")}
                </Button>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Transaction history */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card radius="xl" shadow="sm" className="border border-default-100">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-default-900 flex items-center gap-2">
                  <Clock size={16} className="text-default-400" />
                  {t("wallet.history")}
                  {total > 0 && (
                    <Chip size="sm" variant="flat" className="text-xs">{total}</Chip>
                  )}
                </h3>

                {/* Type filter */}
                <div className="flex gap-2">
                  {["all", "refund", "payment"].map(type => (
                    <Chip
                      key={type}
                      size="sm"
                      variant={typeFilter === type ? "solid" : "flat"}
                      color={typeFilter === type ? "primary" : "default"}
                      className="cursor-pointer select-none"
                      onClick={() => handleTypeFilter(type)}
                    >
                      {type === "all"
                        ? t("wallet.filter_all") || "Tất cả"
                        : type === "refund"
                        ? t("wallet.type_refund") || "Hoàn tiền"
                        : t("wallet.type_payment") || "Thanh toán"}
                    </Chip>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : txns.length === 0 ? (
                <div className="py-10 text-center">
                  <RefreshCw size={32} className="text-default-200 mx-auto mb-3" />
                  <p className="text-default-400 text-sm">{t("wallet.no_transactions")}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {txns.map((txn) => (
                    <motion.div
                      key={txn._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between py-3 border-b border-default-50 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-default-50 flex-shrink-0 flex items-center justify-center">
                          {txnIcon(txn.type, txn.direction)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-default-800">{txnLabel(txn.type)}</p>
                          {txn.note && (
                            <p className="text-xs text-default-500 truncate max-w-[220px]">{txn.note}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-default-400">
                              {new Date(txn.createdAt).toLocaleString("vi-VN")}
                            </p>
                            {txn.order_id && (
                              <Link
                                to={`/orders/${txn.order_id}`}
                                className="text-xs text-primary underline-offset-2 hover:underline"
                              >
                                {t("wallet.view_order") || "Xem đơn"}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className={`font-bold text-sm ${txn.direction === "in" ? "text-success" : "text-danger"}`}>
                          {txn.direction === "in" ? "+" : "-"}{formatCurrency(txn.amount)}
                        </p>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={txn.status === "success" ? "success" : txn.status === "pending" ? "warning" : "danger"}
                          className="text-xs mt-1"
                        >
                          {txn.status === "success" ? "Thành công" : txn.status === "pending" ? "Đang xử lý" : txn.status}
                        </Chip>
                      </div>
                    </motion.div>
                  ))}

                  {hasMore && (
                    <div className="pt-3 text-center">
                      <Button
                        size="sm"
                        variant="flat"
                        isLoading={loadingMore}
                        onClick={handleLoadMore}
                      >
                        {t("wallet.load_more") || "Xem thêm"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </PageContainer>
  );
}
