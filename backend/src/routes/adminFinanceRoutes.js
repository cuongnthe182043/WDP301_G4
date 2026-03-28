const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/adminFinanceController");

const router = express.Router();

router.use(verifyToken, ...requireAnyRole("system_admin"));

// Dashboard
router.get("/stats",                    ctrl.getStats);
router.get("/transactions",             ctrl.getTransactions);
router.get("/fees",                     ctrl.getFees);
router.get("/shops",                    ctrl.getShopWallets);

// Fee rate
router.get("/fee-rate",                 ctrl.getFeeRate);
router.patch("/fee-rate",               ctrl.updateFeeRate);

// Withdrawal management
router.get("/withdrawals",              ctrl.getPendingWithdrawals);
router.post("/withdrawals/:id/approve", ctrl.approveWithdrawal);
router.post("/withdrawals/:id/reject",  ctrl.rejectWithdrawal);

// Manual deposit
router.post("/deposit",                 ctrl.deposit);

module.exports = router;
