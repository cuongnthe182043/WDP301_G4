const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

exports.getWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user_id: req.user._id, type: "customer" }).lean();
    if (!wallet) {
      // Auto-create wallet on first access
      wallet = await Wallet.create({ user_id: req.user._id, type: "customer" });
      wallet = wallet.toObject();
    }
    ok(res, { wallet });
  } catch (e) { bad(res, e, "Cannot get wallet"); }
};

exports.getTransactions = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user_id: req.user._id, type: "customer" }).lean();
    if (!wallet) return ok(res, { transactions: [], total: 0 });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ wallet_id: wallet._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({ wallet_id: wallet._id }),
    ]);

    ok(res, { transactions, total, page, limit });
  } catch (e) { bad(res, e, "Cannot get transactions"); }
};
