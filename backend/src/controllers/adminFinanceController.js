/**
 * adminFinanceController.js
 *
 * Admin endpoints for platform finance management:
 *  - Dashboard stats (system wallet, fees, withdrawals)
 *  - Withdraw approval / rejection
 *  - Manual deposit to shop wallet
 *  - Platform fee listing
 *  - Transaction history
 *  - Fee rate configuration
 */

const feeSvc  = require("../services/platformFeeService");
const auditLog = require("../services/auditLogService");
const BankAccount = require("../models/BankAccount");
const Shop = require("../models/Shop");

// GET /api/admin/finance/stats
exports.getStats = async (req, res, next) => {
  try {
    const stats = await feeSvc.getFinanceStats();
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
};

// GET /api/admin/finance/transactions?page=1&limit=20&type=withdraw&status=pending&wallet_type=shop
exports.getTransactions = async (req, res, next) => {
  try {
    const { page, limit, type, status, wallet_type } = req.query;
    const data = await feeSvc.getRecentTransactions({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      type, status, wallet_type,
    });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// GET /api/admin/finance/fees?page=1&limit=20&shop_id=
exports.getFees = async (req, res, next) => {
  try {
    const { page, limit, shop_id } = req.query;
    const data = await feeSvc.getPlatformFees({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      shop_id,
    });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// GET /api/admin/finance/withdrawals
exports.getPendingWithdrawals = async (req, res, next) => {
  try {
    const data = await feeSvc.listPendingWithdrawals();

    // Enrich with bank account info
    const ownerIds = [...new Set(data.map(d => d.owner_id).filter(Boolean))];
    const banks = await BankAccount.find({ user_id: { $in: ownerIds }, is_default: true }).lean();
    const bankMap = Object.fromEntries(banks.map(b => [b.user_id, b]));

    const enriched = data.map(d => ({
      ...d,
      bank_account: d.meta?.bank_account_id
        ? null // specific bank account requested — caller should look up
        : bankMap[d.owner_id] || null,
    }));

    res.json({ success: true, data: enriched });
  } catch (e) { next(e); }
};

// POST /api/admin/finance/withdrawals/:id/approve
exports.approveWithdrawal = async (req, res, next) => {
  try {
    const { note } = req.body || {};
    const txn = await feeSvc.approveWithdrawal(req.params.id, note);

    await auditLog.log({
      actorId: req.user._id,
      action: "finance.withdraw.approve",
      targetCollection: "transactions",
      targetId: txn._id,
      ip: auditLog.getIp(req),
      userAgent: auditLog.getUA(req),
      metadata: { amount: txn.amount, note },
    });

    res.json({ success: true, data: txn });
  } catch (e) { next(e); }
};

// POST /api/admin/finance/withdrawals/:id/reject
exports.rejectWithdrawal = async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }
    const txn = await feeSvc.rejectWithdrawal(req.params.id, reason);

    await auditLog.log({
      actorId: req.user._id,
      action: "finance.withdraw.reject",
      targetCollection: "transactions",
      targetId: txn._id,
      ip: auditLog.getIp(req),
      userAgent: auditLog.getUA(req),
      metadata: { amount: txn.amount, reason },
    });

    res.json({ success: true, data: txn });
  } catch (e) { next(e); }
};

// POST /api/admin/finance/deposit
exports.deposit = async (req, res, next) => {
  try {
    const { shop_id, amount, note } = req.body || {};
    if (!shop_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "shop_id and positive amount are required" });
    }

    const shop = await Shop.findById(shop_id).lean();
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

    const txn = await feeSvc.adminDeposit(shop.owner_id, Number(amount), note);

    await auditLog.log({
      actorId: req.user._id,
      action: "finance.deposit",
      targetCollection: "transactions",
      targetId: txn._id,
      ip: auditLog.getIp(req),
      userAgent: auditLog.getUA(req),
      metadata: { shop_id, amount: Number(amount), note },
    });

    res.json({ success: true, data: txn });
  } catch (e) { next(e); }
};

// GET /api/admin/finance/fee-rate
exports.getFeeRate = async (req, res, next) => {
  try {
    const rate = await feeSvc.getFeeRate();
    res.json({ success: true, data: { fee_rate: rate } });
  } catch (e) { next(e); }
};

// PATCH /api/admin/finance/fee-rate
exports.updateFeeRate = async (req, res, next) => {
  try {
    const { fee_rate } = req.body || {};
    if (fee_rate === undefined || fee_rate === null) {
      return res.status(400).json({ success: false, message: "fee_rate is required" });
    }
    const newRate = await feeSvc.updateFeeRate(fee_rate);

    await auditLog.log({
      actorId: req.user._id,
      action: "finance.fee_rate.update",
      targetCollection: "system_configs",
      targetId: "fee_rate",
      ip: auditLog.getIp(req),
      userAgent: auditLog.getUA(req),
      metadata: { new_rate: newRate },
    });

    res.json({ success: true, data: { fee_rate: newRate } });
  } catch (e) { next(e); }
};

// GET /api/admin/finance/shops — list all shops with wallet balance
exports.getShopWallets = async (req, res, next) => {
  try {
    const Wallet = require("../models/Wallet");
    const wallets = await Wallet.find({ type: "shop" }).lean();
    const ownerIds = wallets.map(w => w.user_id);
    const shops = await Shop.find({ owner_id: { $in: ownerIds } }).select("_id shop_name owner_id shop_logo").lean();
    const shopByOwner = Object.fromEntries(shops.map(s => [s.owner_id, s]));

    const result = wallets.map(w => {
      const shop = shopByOwner[w.user_id] || {};
      return {
        wallet_id: w._id,
        shop_id: shop._id || null,
        shop_name: shop.shop_name || "Unknown",
        shop_logo: shop.shop_logo || null,
        balance_available: w.balance_available,
        balance_pending: w.balance_pending,
        owner_id: w.user_id,
      };
    });

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};
