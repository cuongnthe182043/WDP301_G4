const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/systemConfigController");

const router = express.Router();

router.use(verifyToken, ...requireAnyRole("system_admin"));

router.get("/",          ctrl.listConfigs);
router.patch("/",        ctrl.updateConfigs);
router.post("/test-smtp", ctrl.testSmtp);

module.exports = router;
