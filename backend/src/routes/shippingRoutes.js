const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/shippingWebhookController");

router.post("/ghn",          express.json({ type: "*/*" }), ctrl.ghn);
router.post("/ghn/simulate", express.json(),               ctrl.simulateGhn);

router.post("/ghtk", express.json({ type: "*/*" }), ctrl.ghtk);

module.exports = router;
