const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/ticketController");

router.get("/", verifyToken, ctrl.getUserTickets);
router.post("/", verifyToken, ctrl.createTicket);
router.get("/:id", verifyToken, ctrl.getTicketById);
router.patch("/:id/close", verifyToken, ctrl.closeTicket);

module.exports = router;
