import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card, CardBody, Button, Chip, Skeleton,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Input, useDisclosure, Divider,
} from "@heroui/react";
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
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
} from "lucide-react";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { walletService } from "../../services/walletService";
import { formatCurrency } from "../../utils/formatCurrency";
import { useToast } from "../../components/common/ToastProvider";

const TOKEN_KEY = "DFS_TOKEN";

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

const TXN_TYPE_ICON = {
  refund:   <RotateCcw    size={16} className="text-success" />,
  payment:  <ShoppingBag  size={16} className="text-danger"  />,
  deposit:  <ArrowUpRight size={16} className="text-primary" />,
  withdraw: <ArrowDownLeft size={16} className="text-warning" />,
  transfer: <Banknote      size={16} className="text-secondary" />,
};

function txnIcon(type, direction) {
  if (TXN_TYPE_ICON[type]) return TXN_TYPE_ICON[type];
  return direction === "in"
    ? <TrendingUp  size={16} className="text-success" />
    : <TrendingDown size={16} className="text-danger" />;
}

// ─── Deposit Modal ────────────────────────────────────────────────────────────
function DepositModal({ isOpen, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handleQuick = (v) => {
    setAmount(String(v));
    setError("");
  };

  const handleChange = (v) => {
    setAmount(v.replace(/\D/g, ""));
    setError("");
  };

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10000) { setError("Số tiền tối thiểu là 10.000đ"); return; }
    if (amt > 50000000)       { setError("Số tiền tối đa là 50.000.000đ"); return; }
    setLoading(true);
    try {
      const { payUrl } = await walletService.depositVnpay(amt);
      window.location.href = payUrl;
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể khởi tạo giao dịch. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} radius="2xl" size="sm">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-lg font-black">
            <ArrowUpRight size={20} className="text-primary" />
            Nạp tiền vào ví
          </span>
          <p className="text-sm font-normal text-default-500">Thanh toán qua VNPay — nạp tức thì</p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-default-500 mb-2 uppercase tracking-wide">Chọn nhanh</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleQuick(v)}
                    className={`py-2 px-1 rounded-xl text-sm font-semibold border transition-all ${
                      amount === String(v)
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "border-default-200 text-default-700 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {formatCurrency(v)}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Hoặc nhập số tiền"
              placeholder="0"
              value={amount ? Number(amount).toLocaleString("vi-VN") : ""}
              onValueChange={(v) => handleChange(v.replace(/\./g, "").replace(/,/g, ""))}
              startContent={<span className="text-default-400 text-sm">₫</span>}
              radius="xl"
              variant="bordered"
              isInvalid={!!error}
              errorMessage={error}
              description="Tối thiểu 10.000đ — tối đa 50.000.000đ"
            />

            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 text-xs text-primary-700 dark:text-primary-300 flex items-start gap-2">
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
              <span>Sau khi thanh toán thành công, số dư sẽ được cộng vào ví ngay lập tức.</span>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" radius="xl" onPress={handleClose}>Hủy</Button>
          <Button
            color="primary"
            radius="xl"
            isLoading={loading}
            onPress={handleSubmit}
            startContent={!loading && <ArrowUpRight size={16} />}
            className="font-bold"
          >
            Thanh toán qua VNPay
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────
function WithdrawModal({ isOpen, onClose, onSuccess, availableBalance }) {
  const [step, setStep]           = useState("form"); // "form" | "add_bank"
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [amount, setAmount]       = useState("");
  const [note, setNote]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [error, setError]         = useState("");

  // Add bank form
  const [newBank, setNewBank] = useState({ bank_name: "", account_number: "", owner_name: "" });
  const [addingBank, setAddingBank] = useState(false);
  const [bankError, setBankError]   = useState("");

  const loadBankAccounts = useCallback(async () => {
    setLoadingBanks(true);
    try {
      const list = await walletService.getBankAccounts();
      setBankAccounts(list || []);
      if (list?.length > 0 && !selectedBank) setSelectedBank(list[0]._id);
    } catch { /* ignore */ }
    finally { setLoadingBanks(false); }
  }, []);

  useEffect(() => {
    if (isOpen) loadBankAccounts();
  }, [isOpen, loadBankAccounts]);

  const handleAddBank = async () => {
    if (!newBank.bank_name || !newBank.account_number || !newBank.owner_name) {
      setBankError("Vui lòng điền đầy đủ thông tin"); return;
    }
    setAddingBank(true);
    try {
      const account = await walletService.addBankAccount(newBank);
      setBankAccounts(prev => [account, ...prev]);
      setSelectedBank(account._id);
      setNewBank({ bank_name: "", account_number: "", owner_name: "" });
      setBankError("");
      setStep("form");
    } catch (e) {
      setBankError(e?.response?.data?.message || "Không thể thêm tài khoản");
    } finally { setAddingBank(false); }
  };

  const handleDeleteBank = async (id) => {
    try {
      await walletService.deleteBankAccount(id);
      setBankAccounts(prev => prev.filter(b => b._id !== id));
      if (selectedBank === id) setSelectedBank(bankAccounts.find(b => b._id !== id)?._id || null);
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 50000)          { setError("Số tiền rút tối thiểu là 50.000đ"); return; }
    if (amt > availableBalance)       { setError("Số tiền vượt quá số dư khả dụng"); return; }
    if (!selectedBank)                { setError("Vui lòng chọn tài khoản ngân hàng"); return; }
    setLoading(true);
    setError("");
    try {
      const result = await walletService.withdraw({ amount: amt, bank_account_id: selectedBank, note });
      onSuccess(result?.message || "Yêu cầu rút tiền đã được gửi!");
      handleClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể gửi yêu cầu rút tiền");
    } finally { setLoading(false); }
  };

  const handleClose = () => {
    setAmount("");
    setNote("");
    setError("");
    setStep("form");
    setNewBank({ bank_name: "", account_number: "", owner_name: "" });
    setBankError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} radius="2xl" size="md" scrollBehavior="inside">
      <ModalContent>
        {step === "form" ? (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-lg font-black">
                <ArrowDownLeft size={20} className="text-warning" />
                Rút tiền
              </span>
              <p className="text-sm font-normal text-default-500">
                Khả dụng: <span className="font-semibold text-success">{formatCurrency(availableBalance)}</span>
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                {/* Bank account selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">Tài khoản nhận</p>
                    <button
                      type="button"
                      onClick={() => setStep("add_bank")}
                      className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> Thêm mới
                    </button>
                  </div>

                  {loadingBanks ? (
                    <div className="space-y-2">
                      <Skeleton className="h-14 rounded-xl" />
                      <Skeleton className="h-14 rounded-xl" />
                    </div>
                  ) : bankAccounts.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setStep("add_bank")}
                      className="w-full border-2 border-dashed border-default-200 rounded-xl p-4 text-sm text-default-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Thêm tài khoản ngân hàng
                    </button>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {bankAccounts.map(b => (
                        <div
                          key={b._id}
                          onClick={() => setSelectedBank(b._id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedBank === b._id
                              ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                              : "border-default-100 hover:border-default-300"
                          }`}
                        >
                          <Building2 size={20} className={selectedBank === b._id ? "text-primary" : "text-default-400"} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-default-800 truncate">{b.bank_name}</p>
                            <p className="text-xs text-default-500">{b.account_number} · {b.owner_name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteBank(b._id); }}
                            className="text-default-300 hover:text-danger transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Divider />

                <Input
                  label="Số tiền rút"
                  placeholder="0"
                  value={amount ? Number(amount).toLocaleString("vi-VN") : ""}
                  onValueChange={(v) => { setAmount(v.replace(/\./g, "").replace(/,/g, "")); setError(""); }}
                  startContent={<span className="text-default-400 text-sm">₫</span>}
                  radius="xl"
                  variant="bordered"
                  description="Tối thiểu 50.000đ"
                />

                <Input
                  label="Ghi chú (tùy chọn)"
                  placeholder="Nội dung chuyển khoản..."
                  value={note}
                  onValueChange={setNote}
                  radius="xl"
                  variant="bordered"
                />

                {error && <p className="text-danger text-sm">{error}</p>}

                <div className="bg-warning-50 dark:bg-warning-900/20 rounded-xl p-3 text-xs text-warning-700 dark:text-warning-300">
                  Yêu cầu rút tiền sẽ được xử lý trong 1–3 ngày làm việc.
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" radius="xl" onPress={handleClose}>Hủy</Button>
              <Button
                color="warning"
                radius="xl"
                isLoading={loading}
                onPress={handleSubmit}
                startContent={!loading && <ArrowDownLeft size={16} />}
                className="font-bold text-white"
              >
                Gửi yêu cầu rút tiền
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalHeader>
              <button type="button" onClick={() => setStep("form")} className="text-sm text-primary font-semibold mr-2">← Quay lại</button>
              Thêm tài khoản ngân hàng
            </ModalHeader>
            <ModalBody>
              <div className="space-y-3">
                <Input
                  label="Tên ngân hàng"
                  placeholder="VD: Vietcombank, BIDV, MB Bank..."
                  value={newBank.bank_name}
                  onValueChange={(v) => setNewBank(p => ({ ...p, bank_name: v }))}
                  radius="xl" variant="bordered"
                />
                <Input
                  label="Số tài khoản"
                  placeholder="Nhập số tài khoản"
                  value={newBank.account_number}
                  onValueChange={(v) => setNewBank(p => ({ ...p, account_number: v }))}
                  radius="xl" variant="bordered"
                />
                <Input
                  label="Tên chủ tài khoản"
                  placeholder="Nhập họ tên (IN HOA)"
                  value={newBank.owner_name}
                  onValueChange={(v) => setNewBank(p => ({ ...p, owner_name: v.toUpperCase() }))}
                  radius="xl" variant="bordered"
                />
                {bankError && <p className="text-danger text-sm">{bankError}</p>}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" radius="xl" onPress={() => setStep("form")}>Hủy</Button>
              <Button
                color="primary"
                radius="xl"
                isLoading={addingBank}
                onPress={handleAddBank}
                className="font-bold"
              >
                Lưu tài khoản
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// ─── Main Wallet Page ─────────────────────────────────────────────────────────
export default function Wallet() {
  const { t }    = useTranslation();
  const toast    = useToast();
  const isLoggedIn = !!localStorage.getItem(TOKEN_KEY);

  const [wallet,      setWallet]      = useState(null);
  const [txns,        setTxns]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typeFilter,  setTypeFilter]  = useState("all");

  const depositDisc  = useDisclosure();
  const withdrawDisc = useDisclosure();

  const LIMIT = 20;

  const TXN_LABELS = {
    payment:  t("wallet.type_payment"),
    refund:   t("wallet.type_refund"),
    deposit:  t("wallet.type_deposit")  || "Nạp tiền",
    withdraw: t("wallet.type_withdraw") || "Rút tiền",
    transfer: t("wallet.type_transfer") || "Chuyển khoản",
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

  const handleWithdrawSuccess = (msg) => {
    loadWallet();
    loadTxns(1, typeFilter);
    toast.success(msg);
  };

  const balance = wallet?.balance_available ?? 0;
  const pending = wallet?.balance_pending  ?? 0;
  const hasMore = txns.length < total;

  const FILTER_TYPES = ["all", "deposit", "withdraw", "refund", "payment"];
  const FILTER_LABELS = {
    all:      t("wallet.filter_all") || "Tất cả",
    deposit:  t("wallet.type_deposit")  || "Nạp tiền",
    withdraw: t("wallet.type_withdraw") || "Rút tiền",
    refund:   t("wallet.type_refund")   || "Hoàn tiền",
    payment:  t("wallet.type_payment")  || "Thanh toán",
  };

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

              <div className="flex gap-3 mt-6">
                <Button
                  radius="xl"
                  onPress={depositDisc.onOpen}
                  className="flex-1 bg-white/20 text-white border border-white/30 font-semibold hover:bg-white/30 transition-colors"
                  startContent={<ArrowUpRight size={16} />}
                >
                  {t("wallet.deposit") || "Nạp tiền"}
                </Button>
                <Button
                  radius="xl"
                  onPress={withdrawDisc.onOpen}
                  className="flex-1 bg-white/20 text-white border border-white/30 font-semibold hover:bg-white/30 transition-colors"
                  startContent={<ArrowDownLeft size={16} />}
                >
                  {t("wallet.withdraw") || "Rút tiền"}
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
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-bold text-default-900 flex items-center gap-2">
                  <Clock size={16} className="text-default-400" />
                  {t("wallet.history")}
                  {total > 0 && (
                    <Chip size="sm" variant="flat" className="text-xs">{total}</Chip>
                  )}
                </h3>

                {/* Type filter */}
                <div className="flex gap-1.5 flex-wrap">
                  {FILTER_TYPES.map(type => (
                    <Chip
                      key={type}
                      size="sm"
                      variant={typeFilter === type ? "solid" : "flat"}
                      color={typeFilter === type ? "primary" : "default"}
                      className="cursor-pointer select-none"
                      onClick={() => handleTypeFilter(type)}
                    >
                      {FILTER_LABELS[type]}
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

      {/* Modals */}
      <DepositModal
        isOpen={depositDisc.isOpen}
        onClose={depositDisc.onClose}
        onSuccess={loadWallet}
      />
      <WithdrawModal
        isOpen={withdrawDisc.isOpen}
        onClose={withdrawDisc.onClose}
        onSuccess={handleWithdrawSuccess}
        availableBalance={balance}
      />
    </PageContainer>
  );
}
