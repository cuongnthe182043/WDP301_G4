const crypto      = require("crypto");
const Wallet      = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const BankAccount = require("../models/BankAccount");
const vnpaySvc    = require("../services/vnpayService");

const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallets
// ─────────────────────────────────────────────────────────────────────────────
exports.getWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user_id: req.user._id, type: "customer" }).lean();
    if (!wallet) {
      wallet = await Wallet.create({ user_id: req.user._id, type: "customer" });
      wallet = wallet.toObject();
    }
    ok(res, { wallet });
  } catch (e) { bad(res, e, "Cannot get wallet"); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallets/transactions
// ─────────────────────────────────────────────────────────────────────────────
exports.getTransactions = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user_id: req.user._id, type: "customer" }).lean();
    if (!wallet) return ok(res, { transactions: [], total: 0 });

    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip  = (page - 1) * limit;

    const cond = { wallet_id: wallet._id };
    const VALID_TYPES = ["payment", "refund", "transfer", "withdraw", "deposit"];
    if (req.query.type && VALID_TYPES.includes(req.query.type)) {
      cond.type = req.query.type;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(cond).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(cond),
    ]);

    ok(res, { transactions, total, page, limit });
  } catch (e) { bad(res, e, "Cannot get transactions"); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallets/deposit/vnpay
// Initiates a VNPay wallet top-up. Returns a payUrl to redirect the user.
// ─────────────────────────────────────────────────────────────────────────────
exports.depositVnpay = async (req, res) => {
  try {
    const userId = req.user._id;
    const amt    = Number(req.body.amount);

    if (!amt || amt < 10000 || amt > 50000000) {
      return res.status(400).json({ status: "fail", message: "Số tiền nạp phải từ 10.000đ đến 50.000.000đ" });
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ user_id: userId, type: "customer" });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, type: "customer" });
    }

    // Unique txnRef with DEP prefix (VNPAY max txnRef 8 chars — we use 12, they accept it in sandbox/prod)
    const txnRef = `DEP${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

    // Create pending deposit transaction so IPN/return can look it up
    await Transaction.create({
      wallet_id: wallet._id,
      type:      "deposit",
      direction: "in",
      amount:    amt,
      currency:  "VND",
      status:    "pending",
      note:      "Nạp ví qua VNPay",
      meta:      { vnp_txn_ref: txnRef },
    });

    const rawIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "127.0.0.1";
    const ip    = rawIp.replace(/^::ffff:/, "") || "127.0.0.1";

    const { payUrl } = await vnpaySvc.createWalletDepositUrl(wallet._id, txnRef, amt, ip);

    ok(res, { payUrl, txnRef });
  } catch (e) { bad(res, e, "Không thể khởi tạo giao dịch nạp tiền"); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallets/deposit/vnpay/return
// Browser redirect back from VNPay after deposit payment.
// No auth — VNPay doesn't pass tokens.
// ─────────────────────────────────────────────────────────────────────────────
exports.depositVnpayReturn = async (req, res) => {
  const frontendUrl = process.env.FE_ORIGIN || "http://localhost:5173";
  try {
    const result = vnpaySvc.verifyReturnUrl(req.query);

    const rawAmount = Number(req.query.vnp_Amount || 0);
    const amount    = rawAmount ? rawAmount / 100 : 0;
    const payDate   = req.query.vnp_PayDate       || "";
    const txnNo     = req.query.vnp_TransactionNo || "";
    const bank      = req.query.vnp_BankCode      || "";
    const txnRef    = result.orderCode; // For deposits, vnp_TxnRef is our DEP-prefixed ref

    const extraParams =
      (amount  ? `&amount=${amount}`                        : "") +
      (txnNo   ? `&txn_no=${encodeURIComponent(txnNo)}`     : "") +
      (bank    ? `&bank=${encodeURIComponent(bank)}`         : "") +
      (payDate ? `&pay_date=${encodeURIComponent(payDate)}`  : "");

    if (!result.isValid) {
      return res.redirect(`${frontendUrl}/payment/return?status=fail&reason=invalid_signature&deposit=1`);
    }

    if (result.isSuccess) {
      await vnpaySvc.settleWalletDeposit(txnRef, result.transactionNo, result.bankCode);
      return res.redirect(`${frontendUrl}/payment/return?status=success&deposit=1${extraParams}`);
    }

    await vnpaySvc.failWalletDeposit(txnRef, result.responseCode);
    return res.redirect(
      `${frontendUrl}/payment/return?status=fail&deposit=1` +
      `&code=${result.responseCode}` +
      extraParams
    );
  } catch (e) {
    console.error("[VNPAY DEP Return] Error:", e.message, e.stack);
    return res.redirect(`${frontendUrl}/payment/return?status=fail&reason=server_error&deposit=1`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallets/withdraw
// Customer requests a withdrawal. Balance moves available → pending.
// Admin must approve/reject the request separately.
// ─────────────────────────────────────────────────────────────────────────────
exports.withdraw = async (req, res) => {
  try {
    const userId = req.user._id;
    const amt    = Number(req.body.amount);

    if (!amt || amt < 50000) {
      return res.status(400).json({ status: "fail", message: "Số tiền rút tối thiểu là 50.000đ" });
    }

    const wallet = await Wallet.findOne({ user_id: userId, type: "customer" });
    if (!wallet || wallet.balance_available < amt) {
      return res.status(400).json({ status: "fail", message: "Số dư không đủ để thực hiện rút tiền" });
    }

    // Resolve bank account info
    let bankInfo;
    const { bank_account_id, bank_name, account_number, owner_name, note } = req.body;

    if (bank_account_id) {
      const bankAccount = await BankAccount.findOne({ _id: bank_account_id, user_id: userId }).lean();
      if (!bankAccount) {
        return res.status(400).json({ status: "fail", message: "Tài khoản ngân hàng không tồn tại" });
      }
      bankInfo = {
        bank_name:      bankAccount.bank_name,
        account_number: bankAccount.account_number,
        owner_name:     bankAccount.owner_name,
        bank_code:      bankAccount.bank_code || "",
      };
    } else if (bank_name && account_number && owner_name) {
      bankInfo = { bank_name, account_number, owner_name, bank_code: "" };
    } else {
      return res.status(400).json({ status: "fail", message: "Vui lòng cung cấp thông tin tài khoản ngân hàng" });
    }

    // Atomically move balance available → pending
    wallet.balance_available -= amt;
    wallet.balance_pending   += amt;
    await wallet.save();

    await Transaction.create({
      wallet_id: wallet._id,
      type:      "withdraw",
      direction: "out",
      amount:    amt,
      currency:  "VND",
      status:    "pending",
      note:      note || `Rút tiền về ${bankInfo.bank_name} - ${bankInfo.account_number}`,
      meta:      { ...bankInfo, requested_at: new Date().toISOString() },
    });

    ok(res, { message: "Yêu cầu rút tiền đã được gửi. Chúng tôi sẽ xử lý trong 1-3 ngày làm việc." });
  } catch (e) { bad(res, e, "Không thể xử lý yêu cầu rút tiền"); }
};

// ─────────────────────────────────────────────────────────────────────────────
// Bank account management
// ─────────────────────────────────────────────────────────────────────────────

exports.getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ user_id: req.user._id }).sort({ createdAt: -1 }).lean();
    ok(res, { accounts });
  } catch (e) { bad(res, e, "Không thể tải danh sách tài khoản ngân hàng"); }
};

exports.addBankAccount = async (req, res) => {
  try {
    const { bank_name, account_number, owner_name, bank_code } = req.body;
    if (!bank_name || !account_number || !owner_name) {
      return res.status(400).json({ status: "fail", message: "Vui lòng điền đầy đủ thông tin tài khoản" });
    }

    // Prevent duplicates for the same user
    const exists = await BankAccount.findOne({
      user_id:        req.user._id,
      account_number: account_number.trim(),
      bank_name:      bank_name.trim(),
    }).lean();
    if (exists) {
      return res.status(400).json({ status: "fail", message: "Tài khoản ngân hàng này đã được lưu" });
    }

    const account = await BankAccount.create({
      user_id:        req.user._id,
      bank_name:      bank_name.trim(),
      account_number: account_number.trim(),
      owner_name:     owner_name.trim(),
      bank_code:      bank_code || "",
      is_verified:    true,
    });

    ok(res, { account });
  } catch (e) { bad(res, e, "Không thể thêm tài khoản ngân hàng"); }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    if (!account) {
      return res.status(404).json({ status: "fail", message: "Không tìm thấy tài khoản ngân hàng" });
    }
    ok(res, { message: "Đã xóa tài khoản ngân hàng" });
  } catch (e) { bad(res, e, "Không thể xóa tài khoản ngân hàng"); }
};
