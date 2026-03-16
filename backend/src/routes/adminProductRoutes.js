const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/adminProductController");

const router = express.Router();

// All admin product routes require system_admin role
router.use(verifyToken, ...requireAnyRole("system_admin"));

router.get("/",            ctrl.listProducts);
router.get("/:id",         ctrl.getProduct);
router.patch("/:id/approve", ctrl.approveProduct);
router.patch("/:id/reject",  ctrl.rejectProduct);

module.exports = router;
