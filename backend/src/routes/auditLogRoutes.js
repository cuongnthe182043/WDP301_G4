const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/auditLogController");

const router = express.Router();

router.use(verifyToken, ...requireAnyRole("system_admin"));

router.get("/",           ctrl.listLogs);
router.get("/actions",    ctrl.listActions);
router.get("/collections", ctrl.listCollections);

module.exports = router;
