/**
 * platformFeeService.js
 *
 * Handles order settlement: when an order reaches "delivered", this service:
 *  1. Calculates the platform commission fee
 *  2. Credits the shop wallet (order total − fee)
 *  3. Credits the system wallet (fee)
 *  4. Records a PlatformFee document
 *
 * Also handles admin operations: approve/reject withdrawals, manual deposits.
 */

const Wallet      = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const PlatformFee = require("../models/PlatformFee");
const SystemConfig = require("../models/SystemConfig");
const Shop        = require("../models/Shop");

const DEFAULT_FEE_RATE = 0.05; // 5%

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getFeeRate() {
  const cfg = await SystemConfig.findOne({ category: "platform", key: "fee_rate" }).lean();
  if (cfg && cfg.value) {
    const rate = parseFloat(cfg.value);
    if (!isNaN(rate) && rate >= 0 && rate <= 1) return rate;
  }
  return DEFAULT_FEE_RATE;
}

async function findOrCreateWallet(userId, type) {
  let wallet = await Wallet.findOne({ user_id: userId, type });
  if (!wallet) wallet = await Wallet.create({ user_id: userId, type });
  return wallet;
}

/** The system wallet is owned by a virtual "system" user */
const SYSTEM_USER_ID = "system-platform";

async function getSystemWallet() {
  return findOrCreateWallet(SYSTEM_USER_ID, "system");
}

// ─── Settlement ───────────────────────────────────────────────────────────────

/**
 * settleOrder — called when order status becomes "delivered".
 * Idempotent: skips if a PlatformFee record already exists for this order.
 */
async function settleOrder(order) {
  if (!order || !order._id) throw new Error("Invalid order");

  // Idempotent check
  const existing = await PlatformFee.findOne({ order_id: order._id }).lean();
  if (existing) return existing; // already settled

  const feeRate   = await getFeeRate();
  const orderTotal = Number(order.total_price) || 0;
  if (orderTotal <= 0) return null; // nothing to settle

  const feeAmount  = Math.round(orderTotal * feeRate);
  const shopReceive = orderTotal - feeAmount;

  // Find shop owner
  const shop = await Shop.findById(order.shop_id).lean();
  const shopOwnerId = shop?.owner_id || order.shop_id;

  // Credit shop wallet
  const shopWallet = await findOrCreateWallet(shopOwnerId, "shop");
  const shopTxn = await Transaction.create({
    wallet_id:  shopWallet._id,
    order_id:   order._id,
    type:       "payment",
    direction:  "in",
    amount:     shopReceive,
    currency:   "VND",
    status:     "success",
    note:       `Thanh toán đơn #${order.order_code} (sau phí ${(feeRate * 100).toFixed(1)}%)`,
    meta:       { order_code: order.order_code, fee_rate: feeRate, fee_amount: feeAmount },
  });
  shopWallet.balance_available  += shopReceive;
  shopWallet.last_transaction_id = shopTxn._id;
  await shopWallet.save();

  // Credit system wallet
  const sysWallet = await getSystemWallet();
  const sysTxn = await Transaction.create({
    wallet_id:  sysWallet._id,
    order_id:   order._id,
    type:       "payment",
    direction:  "in",
    amount:     feeAmount,
    currency:   "VND",
    status:     "success",
    note:       `Phí nền tảng đơn #${order.order_code}`,
    meta:       { order_code: order.order_code, shop_id: order.shop_id, fee_rate: feeRate },
  });
  sysWallet.balance_available  += feeAmount;
  sysWallet.last_transaction_id = sysTxn._id;
  await sysWallet.save();

  // Record PlatformFee
  const pfee = await PlatformFee.create({
    order_id:     order._id,
    order_code:   order.order_code,
    shop_id:      order.shop_id,
    user_id:      order.user_id,
    order_total:  orderTotal,
    fee_rate:     feeRate,
    fee_amount:   feeAmount,
    shop_receive: shopReceive,
  });

  return pfee;
}

// ─── Admin: Withdraw management ───────────────────────────────────────────────

/**
 * listPendingWithdrawals — all shop withdraw requests with status "pending"
 */
async function listPendingWithdrawals() {
  const txns = await Transaction.find({ type: "withdraw", status: "pending" })
    .sort({ createdAt: -1 })
    .lean();

  // Enrich with wallet → shop info
  const walletIds = [...new Set(txns.map(t => t.wallet_id))];
  const wallets   = await Wallet.find({ _id: { $in: walletIds } }).lean();
  const walletMap = Object.fromEntries(wallets.map(w => [w._id, w]));

  const shopOwnerIds = wallets.filter(w => w.type === "shop").map(w => w.user_id);
  const shops = await Shop.find({ owner_id: { $in: shopOwnerIds } }).lean();
  const shopByOwner = Object.fromEntries(shops.map(s => [s.owner_id, s]));

  return txns.map(t => {
    const w = walletMap[t.wallet_id] || {};
    const shop = shopByOwner[w.user_id] || {};
    return {
      ...t,
      wallet_type: w.type,
      shop_name:   shop.shop_name || null,
      shop_id:     shop._id || null,
      owner_id:    w.user_id,
    };
  });
}

/**
 * approveWithdrawal — marks withdrawal as success, finalizes balance deduction
 */
async function approveWithdrawal(txnId, adminNote) {
  const txn = await Transaction.findById(txnId);
  if (!txn) throw Object.assign(new Error("Transaction not found"), { status: 404 });
  if (txn.type !== "withdraw" || txn.status !== "pending") {
    throw Object.assign(new Error("Transaction is not a pending withdrawal"), { status: 400 });
  }

  const wallet = await Wallet.findById(txn.wallet_id);
  if (!wallet) throw Object.assign(new Error("Wallet not found"), { status: 404 });

  // Move from pending to deducted
  wallet.balance_pending = Math.max(0, wallet.balance_pending - txn.amount);
  wallet.last_transaction_id = txn._id;
  await wallet.save();

  txn.status = "success";
  txn.note   = (txn.note || "") + (adminNote ? ` | Admin: ${adminNote}` : "");
  txn.meta   = { ...(txn.meta || {}), approved_at: new Date() };
  await txn.save();

  return txn;
}

/**
 * rejectWithdrawal — cancels withdrawal, returns balance from pending to available
 */
async function rejectWithdrawal(txnId, reason) {
  const txn = await Transaction.findById(txnId);
  if (!txn) throw Object.assign(new Error("Transaction not found"), { status: 404 });
  if (txn.type !== "withdraw" || txn.status !== "pending") {
    throw Object.assign(new Error("Transaction is not a pending withdrawal"), { status: 400 });
  }

  const wallet = await Wallet.findById(txn.wallet_id);
  if (!wallet) throw Object.assign(new Error("Wallet not found"), { status: 404 });

  wallet.balance_pending   = Math.max(0, wallet.balance_pending - txn.amount);
  wallet.balance_available += txn.amount;
  wallet.last_transaction_id = txn._id;
  await wallet.save();

  txn.status = "cancelled";
  txn.note   = (txn.note || "") + ` | Từ chối: ${reason || "Không có lý do"}`;
  txn.meta   = { ...(txn.meta || {}), rejected_at: new Date(), reject_reason: reason };
  await txn.save();

  return txn;
}

// ─── Admin: Manual deposit to shop wallet ─────────────────────────────────────

async function adminDeposit(shopOwnerId, amount, note) {
  if (!amount || Number(amount) <= 0) {
    throw Object.assign(new Error("Amount must be positive"), { status: 400 });
  }

  const wallet = await findOrCreateWallet(shopOwnerId, "shop");

  const txn = await Transaction.create({
    wallet_id:  wallet._id,
    type:       "deposit",
    direction:  "in",
    amount:     Number(amount),
    currency:   "VND",
    status:     "success",
    note:       note || "Nạp tiền bởi admin",
    meta:       { source: "admin_deposit" },
  });

  wallet.balance_available  += Number(amount);
  wallet.last_transaction_id = txn._id;
  await wallet.save();

  return txn;
}

// ─── Admin: Dashboard stats ───────────────────────────────────────────────────

async function getFinanceStats() {
  const sysWallet = await Wallet.findOne({ user_id: SYSTEM_USER_ID, type: "system" }).lean();

  // Total platform fees
  const feeAgg = await PlatformFee.aggregate([
    { $match: { status: "settled" } },
    { $group: { _id: null, total: { $sum: "$fee_amount" }, count: { $sum: 1 } } },
  ]);

  // Pending withdrawals
  const pendingWithdrawAgg = await Transaction.aggregate([
    { $match: { type: "withdraw", status: "pending" } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  // Completed withdrawals
  const completedWithdrawAgg = await Transaction.aggregate([
    { $match: { type: "withdraw", status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  // Total shop balances
  const shopBalanceAgg = await Wallet.aggregate([
    { $match: { type: "shop" } },
    { $group: { _id: null, total_available: { $sum: "$balance_available" }, total_pending: { $sum: "$balance_pending" }, count: { $sum: 1 } } },
  ]);

  // Monthly fee revenue (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthlyFees = await PlatformFee.aggregate([
    { $match: { status: "settled", settled_at: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: "$settled_at" }, month: { $month: "$settled_at" } },
        fee_total:   { $sum: "$fee_amount" },
        order_total: { $sum: "$order_total" },
        count:       { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return {
    system_balance:      sysWallet?.balance_available || 0,
    total_fees_collected: feeAgg[0]?.total || 0,
    total_orders_settled: feeAgg[0]?.count || 0,
    pending_withdrawals:  pendingWithdrawAgg[0]?.total || 0,
    pending_withdraw_count: pendingWithdrawAgg[0]?.count || 0,
    completed_withdrawals: completedWithdrawAgg[0]?.total || 0,
    completed_withdraw_count: completedWithdrawAgg[0]?.count || 0,
    shop_total_available: shopBalanceAgg[0]?.total_available || 0,
    shop_total_pending:   shopBalanceAgg[0]?.total_pending || 0,
    shop_count:           shopBalanceAgg[0]?.count || 0,
    monthly_fees:         monthlyFees,
    current_fee_rate:     await getFeeRate(),
  };
}

/**
 * getRecentTransactions — all wallet transactions for admin view
 */
async function getRecentTransactions({ page = 1, limit = 20, type, status, wallet_type }) {
  const filter = {};
  if (type)   filter.type   = type;
  if (status) filter.status = status;

  // If wallet_type filter, first find wallet IDs
  if (wallet_type) {
    const walletIds = (await Wallet.find({ type: wallet_type }).select("_id").lean()).map(w => w._id);
    filter.wallet_id = { $in: walletIds };
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [txns, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Math.min(limit, 50)).lean(),
    Transaction.countDocuments(filter),
  ]);

  // Enrich with wallet info
  const walletIds = [...new Set(txns.map(t => t.wallet_id))];
  const wallets   = await Wallet.find({ _id: { $in: walletIds } }).lean();
  const walletMap = Object.fromEntries(wallets.map(w => [w._id, w]));

  const ownerIds = wallets.map(w => w.user_id);
  const shops    = await Shop.find({ owner_id: { $in: ownerIds } }).select("_id shop_name owner_id").lean();
  const shopByOwner = Object.fromEntries(shops.map(s => [s.owner_id, s]));

  const enriched = txns.map(t => {
    const w = walletMap[t.wallet_id] || {};
    const shop = shopByOwner[w.user_id];
    return {
      ...t,
      wallet_type: w.type || "unknown",
      wallet_user_id: w.user_id,
      shop_name: shop?.shop_name || null,
    };
  });

  return { transactions: enriched, total, page, limit };
}

/**
 * getPlatformFees — list platform fee records with filters
 */
async function getPlatformFees({ page = 1, limit = 20, shop_id }) {
  const filter = {};
  if (shop_id) filter.shop_id = shop_id;

  const skip = (Math.max(1, page) - 1) * limit;

  const [fees, total] = await Promise.all([
    PlatformFee.find(filter).sort({ settled_at: -1 }).skip(skip).limit(Math.min(limit, 50)).lean(),
    PlatformFee.countDocuments(filter),
  ]);

  return { fees, total, page, limit };
}

/**
 * updateFeeRate — update platform fee rate in system config
 */
async function updateFeeRate(newRate) {
  const rate = parseFloat(newRate);
  if (isNaN(rate) || rate < 0 || rate > 1) {
    throw Object.assign(new Error("Fee rate must be between 0 and 1"), { status: 400 });
  }

  await SystemConfig.findOneAndUpdate(
    { category: "platform", key: "fee_rate" },
    { value: String(rate), label: "Platform Fee Rate", input_type: "number" },
    { upsert: true, new: true }
  );

  return rate;
}

module.exports = {
  settleOrder,
  getFeeRate,
  updateFeeRate,
  listPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  adminDeposit,
  getFinanceStats,
  getRecentTransactions,
  getPlatformFees,
  getSystemWallet,
  SYSTEM_USER_ID,
};
