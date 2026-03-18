const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/bankController");

router.get("/",                  verifyToken, ctrl.list);
router.post("/",                 verifyToken, ctrl.create);
router.put("/:id",               verifyToken, ctrl.update);
router.delete("/:id",            verifyToken, ctrl.remove);
router.patch("/:id/set-default", verifyToken, ctrl.setDefault);
router.post("/:id/send-otp",     verifyToken, ctrl.sendOtp);
router.post("/:id/verify-otp",   verifyToken, ctrl.verifyOtp);

module.exports = router;
