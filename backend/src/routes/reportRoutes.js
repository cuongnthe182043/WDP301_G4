/**
 * reportRoutes.js
 *
 * User-facing: submit reports, appeals, check ban status.
 * Mounted at /api/reports
 */

const express = require("express");
const router  = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl            = require("../controllers/reportController");

router.use(verifyToken);

// Submit a report against another user/shop/review
router.post("/",       ctrl.submitReport);

// Submit an appeal (banned users)
router.post("/appeal", ctrl.submitAppeal);

// Check own ban status
router.get("/ban-status", ctrl.getBanStatus);

module.exports = router;
