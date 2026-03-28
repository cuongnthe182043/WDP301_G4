const express = require("express");
const router  = express.Router();
const { verifyToken }    = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/adminTicketController");

router.use(verifyToken, ...requireAnyRole("system_admin"));

router.get("/",             ctrl.listTickets);
router.get("/:id",          ctrl.getTicket);
router.patch("/:id",        ctrl.updateTicket);
router.post("/:id/reply",   ctrl.addReply);

module.exports = router;
