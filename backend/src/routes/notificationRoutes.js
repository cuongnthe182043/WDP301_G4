const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/notificationController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.get("/",              ctrl.list);
router.get("/unread-count",  ctrl.unreadCount);
router.put("/read-all",      ctrl.markAllRead);
router.put("/:id/read",      ctrl.markRead);
router.delete("/:id",        ctrl.remove);

module.exports = router;
