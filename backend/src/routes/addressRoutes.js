const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/addressController");

router.get("/ghn/provinces", verifyToken, ctrl.ghnProvinces);
router.get("/ghn/districts",  verifyToken, ctrl.ghnDistricts);
router.get("/ghn/wards",      verifyToken, ctrl.ghnWards);

router.get("/", verifyToken, ctrl.list);
router.post("/", verifyToken, ctrl.create);
router.put("/:id", verifyToken, ctrl.update);
router.delete("/:id", verifyToken, ctrl.remove);
router.patch("/:id/default", verifyToken, ctrl.setDefault);

module.exports = router;
