const express = require("express");
const { verifyToken }    = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/envController");

const router = express.Router();

router.use(verifyToken, ...requireAnyRole("system_admin"));

router.get("/",              ctrl.listEnvConfig);
router.get("/reveal/:key",   ctrl.revealEnvVar);
router.patch("/",            ctrl.updateEnvConfig);

module.exports = router;
