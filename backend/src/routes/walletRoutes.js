const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/walletController");

// GET /api/wallets — get current user's wallet balance
router.get("/", verifyToken, ctrl.getWallet);

// GET /api/wallets/transactions — get transaction history
router.get("/transactions", verifyToken, ctrl.getTransactions);

module.exports = router;
