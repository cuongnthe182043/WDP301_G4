const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/conversationController");

const router = express.Router();
router.use(verifyToken);

router.post("/",             ctrl.customerStartConversation);
router.get("/",              ctrl.customerListConversations);
router.get("/:id/messages",  ctrl.getMessages);
router.post("/:id/messages", ctrl.sendMessage);

module.exports = router;
