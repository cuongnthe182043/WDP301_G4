const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/adminUserController");

const router = express.Router();

router.use(verifyToken, ...requireAnyRole("system_admin"));

router.get("/roles",          ctrl.listRoles);
router.get("/",               ctrl.listUsers);
router.get("/:id",            ctrl.getUser);
router.patch("/:id/role",     ctrl.updateRole);
router.post("/:id/ban",       ctrl.banUser);
router.post("/:id/unban",     ctrl.unbanUser);
router.post("/:id/warn",      ctrl.warnUser);

module.exports = router;
