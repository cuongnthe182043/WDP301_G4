const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/authMiddleware");
const checkBanStatus  = require("../middlewares/checkBanStatus");
const checkoutCtrl    = require("../controllers/checkoutController");

router.use(verifyToken, checkBanStatus);

router.post("/preview", checkoutCtrl.preview);
router.post("/confirm", checkoutCtrl.confirm);

module.exports = router;
