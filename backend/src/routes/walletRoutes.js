const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/walletController");

// GET /api/wallets — wallet balance
router.get("/", verifyToken, ctrl.getWallet);

// GET /api/wallets/transactions — transaction history
router.get("/transactions", verifyToken, ctrl.getTransactions);

// POST /api/wallets/deposit/vnpay — create VNPay deposit URL
router.post("/deposit/vnpay", verifyToken, ctrl.depositVnpay);

// GET /api/wallets/deposit/vnpay/return — VNPay browser redirect after deposit (no auth)
router.get("/deposit/vnpay/return", ctrl.depositVnpayReturn);

// POST /api/wallets/withdraw — request withdrawal (balance moves to pending; admin approves)
router.post("/withdraw", verifyToken, ctrl.withdraw);

// Bank account management
router.get("/bank-accounts",      verifyToken, ctrl.getBankAccounts);
router.post("/bank-accounts",     verifyToken, ctrl.addBankAccount);
router.delete("/bank-accounts/:id", verifyToken, ctrl.deleteBankAccount);

module.exports = router;
