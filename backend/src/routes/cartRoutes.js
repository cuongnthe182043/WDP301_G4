// backend/src/routes/cartRoutes.js
const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/authMiddleware");
const checkBanStatus  = require("../middlewares/checkBanStatus");
const ctrl = require("../controllers/cartController");

router.use(verifyToken);

router.get("/", ctrl.getCart);
router.post("/add",              checkBanStatus, ctrl.addItem);
router.patch("/item/:itemId",    checkBanStatus, ctrl.updateItem);
router.delete("/item/:itemId",   checkBanStatus, ctrl.removeItem);
router.post("/clear",            checkBanStatus, ctrl.clearCart);

module.exports = router;
