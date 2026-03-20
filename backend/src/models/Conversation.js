const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ConversationSchema = new mongoose.Schema({
  _id:             { type: String, default: () => `conv-${uuidv4()}` },
  customer_id:     { type: String, ref: "User", required: true, index: true },
  shop_id:         { type: String, ref: "Shop", required: true, index: true },
  last_message:    { type: String, default: "" },
  last_message_at: { type: Date, default: Date.now },
  unread_customer: { type: Number, default: 0 },
  unread_shop:     { type: Number, default: 0 },
}, { timestamps: true, versionKey: false, collection: "conversations" });

ConversationSchema.index({ customer_id: 1, shop_id: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
