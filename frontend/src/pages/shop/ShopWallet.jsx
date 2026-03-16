import React, { useState, useEffect } from "react";
import {
  Card, CardBody, Button, Input, Pagination, Chip, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import { Wallet, TrendingDown, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { shopWalletApi } from "../../services/shopManagementService";
import { useToast } from "../../components/common/ToastProvider";

const formatVND = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
const formatDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "-";

const TXN_TYPE_LABELS = {
  payment: "Thanh toán", refund: "Hoàn tiền", transfer: "Chuyển khoản",
  withdraw: "Rút tiền", deposit: "Nạp tiền",
};

export default function ShopWallet() {
  const toast = useToast();
  const [wallet, setWallet]         = useState(null);
  const [transactions, setTxns]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [txnLoading, setTxnLoading] = useState(false);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  // Withdraw modal
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount]             = useState("");
  const [note, setNote]                 = useState("");
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await shopWalletApi.getWallet();
        setWallet(res.data?.wallet || null);
      } catch (e) { toast.error(e?.message || "Lỗi tải ví"); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setTxnLoading(true);
      try {
        const res = await shopWalletApi.getTransactions({ page, limit: LIMIT });
        setTxns(res.data?.transactions || []);
        setTotal(res.data?.total || 0);
        setTotalPages(Math.ceil((res.data?.total || 0) / LIMIT));
      } catch (e) { toast.error(e?.message || "Lỗi tải giao dịch"); }
      finally { setTxnLoading(false); }
    })();
  }, [page]);

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Nhập số tiền hợp lệ");
    setSaving(true);
    try {
      await shopWalletApi.withdraw(amt, null, note);
      toast.success("Đã gửi yêu cầu rút tiền");
      setWithdrawOpen(false); setAmount(""); setNote("");
      const res = await shopWalletApi.getWallet();
      setWallet(res.data?.wallet || null);
      const txRes = await shopWalletApi.getTransactions({ page: 1, limit: LIMIT });
      setTxns(txRes.data?.transactions || []);
      setPage(1);
    } catch (e) { toast.error(e?.message || "Lỗi rút tiền"); }
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
        <h1 className="text-xl font-black text-default-900">Ví cửa hàng</h1>
        <Button color="primary" radius="lg" onPress={() => setWithdrawOpen(true)}
          startContent={<TrendingDown size={16} />}>
          Rút tiền
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card radius="xl" shadow="sm" className="bg-gradient-to-br from-primary to-primary-600 text-white">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/80 text-sm font-medium">Số dư khả dụng</p>
              <Wallet size={20} className="text-white/60" />
            </div>
            <p className="text-3xl font-black">{formatVND(wallet?.balance_available)}</p>
            <p className="text-white/60 text-xs mt-2">{wallet?.currency || "VND"}</p>
          </CardBody>
        </Card>
        <Card radius="xl" shadow="sm">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-default-500 text-sm font-medium">Số dư đang xử lý</p>
              <TrendingUp size={20} className="text-warning" />
            </div>
            <p className="text-3xl font-black text-default-900">{formatVND(wallet?.balance_pending)}</p>
            <p className="text-default-400 text-xs mt-2">Đang chờ giải ngân</p>
          </CardBody>
        </Card>
      </div>

      {/* Transaction History */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0">
          <div className="px-4 py-3 border-b border-default-100">
            <p className="font-bold text-default-900">Lịch sử giao dịch ({total})</p>
          </div>
          {txnLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Wallet size={40} className="text-default-300" />
              <p className="text-default-400">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="divide-y divide-default-100">
              {transactions.map((t) => (
                <div key={t._id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      t.direction === "in" ? "bg-success/10" : "bg-danger/10"
                    }`}>
                      {t.direction === "in"
                        ? <ArrowDownRight size={16} className="text-success" />
                        : <ArrowUpRight size={16} className="text-danger" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-default-900">
                        {TXN_TYPE_LABELS[t.type] || t.type}
                      </p>
                      <p className="text-xs text-default-400">{formatDate(t.createdAt)}</p>
                      {t.note && <p className="text-xs text-default-400 truncate max-w-[200px]">{t.note}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${t.direction === "in" ? "text-success" : "text-danger"}`}>
                      {t.direction === "in" ? "+" : "-"}{formatVND(t.amount)}
                    </p>
                    <Chip size="sm" color={t.status === "success" ? "success" : t.status === "pending" ? "warning" : "default"} variant="flat">
                      {t.status}
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}

      {/* Withdraw Modal */}
      <Modal isOpen={withdrawOpen} onOpenChange={(o) => !o && setWithdrawOpen(false)} radius="xl" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Yêu cầu rút tiền</ModalHeader>
              <ModalBody className="space-y-3">
                <div className="bg-default-50 rounded-xl p-3 text-sm">
                  <span className="text-default-500">Số dư khả dụng: </span>
                  <span className="font-bold text-success">{formatVND(wallet?.balance_available)}</span>
                </div>
                <Input
                  label="Số tiền rút (VND)"
                  placeholder="Nhập số tiền..."
                  type="number"
                  min="1"
                  value={amount}
                  onValueChange={setAmount}
                  radius="lg"
                />
                <Input
                  label="Ghi chú (tùy chọn)"
                  placeholder="Ví dụ: Rút về Vietcombank..."
                  value={note}
                  onValueChange={setNote}
                  radius="lg"
                />
                <p className="text-xs text-default-400">
                  * Yêu cầu rút tiền sẽ được xử lý trong 1-3 ngày làm việc.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Hủy</Button>
                <Button color="primary" isLoading={saving} onPress={handleWithdraw}>Gửi yêu cầu</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
