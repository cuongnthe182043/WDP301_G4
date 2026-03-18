const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/apiKeyController");

const router = express.Router();

router.use(verifyToken, ...requireAnyRole("system_admin"));

router.get("/",              ctrl.listKeys);
router.get("/:id/reveal",    ctrl.revealKey);
router.post("/",             ctrl.createKey);
router.patch("/:id",         ctrl.updateKey);
router.delete("/:id",        ctrl.deleteKey);

module.exports = router;
