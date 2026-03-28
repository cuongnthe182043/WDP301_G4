const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ReplySchema = new mongoose.Schema(
  {
    _id:      { type: String, default: () => `rep-${uuidv4()}` },
    actor_id: { type: String, ref: "User", required: true },
    role:     { type: String, enum: ["customer", "admin", "shop"], required: true },
    message:  { type: String, required: true },
    images:   [String],
  },
  { timestamps: true }
);

const TicketSchema = new mongoose.Schema(
  {
    _id:      { type: String, default: () => `tkt-${uuidv4()}` },
    order_id: { type: String, ref: "Order" },
    user_id:  { type: String, ref: "User", required: true },
    shop_id:  { type: String, ref: "Shop" },

    // Type of complaint
    type: {
      type: String,
      enum: ["order", "shop", "delivery", "product", "payment", "general"],
      default: "general",
    },
    // Sub-category label
    category: { type: String, default: "" },

    subject: { type: String, required: true },
    message: { type: String, required: true },
    images:  [String],

    status: {
      type: String,
      enum: ["open", "in_progress", "escalated", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // Conversation thread
    replies: [ReplySchema],

    // Admin fields
    assigned_to:  { type: String, ref: "User" },
    admin_note:   { type: String, default: "" },
    resolution:   { type: String, default: "" },
    resolved_at:  { type: Date },
    resolved_by:  { type: String, ref: "User" },

    logs: [
      {
        actor_id:   { type: String, ref: "User" },
        action:     String,
        created_at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);
