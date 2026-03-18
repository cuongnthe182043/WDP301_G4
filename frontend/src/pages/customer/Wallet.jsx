import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Chip, Skeleton } from "@heroui/react";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, TrendingUp, TrendingDown } from "lucide-react";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { walletService } from "../../services/walletService";
import { formatCurrency } from "../../utils/formatCurrency";

const TOKEN_KEY = "DFS_TOKEN";

function txnIcon(type, direction) {
  if (direction === "in") return <TrendingUp size={16} className="text-success" />;
  return <TrendingDown size={16} className="text-danger" />;
}

export default function Wallet() {
  const { t } = useTranslation();
  const isLoggedIn = !!localStorage.getItem(TOKEN_KEY);
  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  const TXN_LABELS = {
    payment:  t("wallet.type_payment"),
    refund:   t("wallet.type_refund"),
    deposit:  t("wallet.type_deposit"),
    withdraw: t("wallet.type_withdraw"),
    transfer: t("wallet.type_transfer"),
  };

  const txnLabel = (type) => TXN_LABELS[type] || type;

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    (async () => {
      try {
        const [w, tx] = await Promise.all([
          walletService.getWallet(),
          walletService.getTransactions(1, 20),
        ]);
        setWallet(w);
        setTxns(tx?.transactions || []);
      } catch { /* wallet may not exist yet */ }
      finally { setLoading(false); }
    })();
  }, [isLoggedIn]);

  const balance = wallet?.balance_available ?? 0;
  const pending = wallet?.balance_pending ?? 0;

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
              <h3 className="font-bold text-default-900 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-default-400" />
                {t("wallet.history")}
              </h3>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : txns.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-default-400 text-sm">{t("wallet.no_transactions")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {txns.map((txn) => (
                    <motion.div
                      key={txn._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between py-3 border-b border-default-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-default-50 flex items-center justify-center">
                          {txnIcon(txn.type, txn.direction)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-default-800">{txnLabel(txn.type)}</p>
                          <p className="text-xs text-default-400">
                            {new Date(txn.createdAt).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </div>
                      <p className={`font-bold text-sm ${txn.direction === "in" ? "text-success" : "text-danger"}`}>
                        {txn.direction === "in" ? "+" : "-"}{formatCurrency(txn.amount)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </PageContainer>
  );
}
