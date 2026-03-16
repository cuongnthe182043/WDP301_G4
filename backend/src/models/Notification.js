const mongoose = require("mongoose");

/**
 * In-app notification — one document per notification per user.
 * NOTE: Do NOT add any fields to User/Order/etc. schemas.
 */
const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["order", "payment", "promotion", "system"],
      default: "system",
    },
    // Dot-notation subtype for icon selection (e.g. "order.placed", "payment.success")
    subtype: { type: String, default: null },
    link:    { type: String, default: null },
    isRead:  { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound index for efficient per-user unread count queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
