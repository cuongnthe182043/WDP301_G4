const router = require("express").Router();
const ctrl = require("../controllers/sizeChartController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireShopOwner } = require("../middlewares/shopMiddleware");

// Public — anyone can read size charts (needed for product detail page)
router.get("/",    ctrl.list);
router.get("/:id", ctrl.getOne);

// Shop-owner only — create / update / delete
router.post(  "/",    verifyToken, requireShopOwner, ctrl.create);
router.put(   "/:id", verifyToken, requireShopOwner, ctrl.update);
router.delete("/:id", verifyToken, requireShopOwner, ctrl.remove);

module.exports = router;
