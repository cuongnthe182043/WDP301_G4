const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const { uploadImagesMw } = require("../middlewares/uploadMiddleware");
const ctrl = require("../controllers/adminProductController");

const router = express.Router();

// All admin product routes require system_admin role
router.use(verifyToken, ...requireAnyRole("system_admin"));

router.get("/stats",              ctrl.getStats);
router.get("/",                   ctrl.listProducts);
router.get("/:id",                ctrl.getProduct);
router.patch("/:id/approve",      ctrl.approveProduct);
router.patch("/:id/reject",       ctrl.rejectProduct);
router.post("/:id/moderate",      ctrl.moderateProduct);
router.post("/moderate-pending",  ctrl.moderatePending);
router.post("/bulk-approve",      ctrl.bulkApprove);
router.post("/bulk-reject",       ctrl.bulkReject);

// Admin media upload (no shop required)
router.post("/media/images",      uploadImagesMw, ctrl.uploadImages);

module.exports = router;
