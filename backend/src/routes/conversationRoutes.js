const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const checkBanStatus  = require("../middlewares/checkBanStatus");
const ctrl = require("../controllers/conversationController");

const router = express.Router();
router.use(verifyToken);

// Read-only — allowed for banned users
router.get("/",              ctrl.customerListConversations);
router.get("/:id/messages",  ctrl.getMessages);

// Write operations — blocked for banned users
router.post("/",             checkBanStatus, ctrl.customerStartConversation);
router.post("/:id/messages", checkBanStatus, ctrl.sendMessage);

module.exports = router;
