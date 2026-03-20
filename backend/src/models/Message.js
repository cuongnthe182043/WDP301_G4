const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const MessageSchema = new mongoose.Schema({
  _id:             { type: String, default: () => `msg-${uuidv4()}` },
  conversation_id: { type: String, ref: "Conversation", required: true, index: true },
  sender_id:       { type: String, required: true },
  sender_type:     { type: String, enum: ["customer", "shop"], required: true },
  content:         { type: String, default: "" },
  images:          [{ type: String }],
  read_at:         { type: Date, default: null },
}, { timestamps: true, versionKey: false, collection: "messages" });

module.exports = mongoose.model("Message", MessageSchema);
