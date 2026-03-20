const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/conversationController");

const router = express.Router();
router.use(verifyToken);

router.get("/",              ctrl.shopListConversations);
router.get("/:id/messages",  ctrl.getMessages);
router.post("/:id/messages", ctrl.sendMessage);

module.exports = router;
