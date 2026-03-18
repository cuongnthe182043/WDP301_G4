const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const RefundSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `refund-${uuidv4()}` },
    order_id:  { type: String, ref: "Order", required: true },
    user_id:   { type: String, ref: "User",  required: true },

    // What the customer wants
    type: {
      type: String,
      enum: ["refund", "return", "exchange"],
      default: "refund",
    },

    reason:   { type: String, required: true },
    images:   [{ type: String }],          // evidence photos (cloudinary URLs)
    amount:   { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },

    shop_note:       { type: String, default: "" }, // shop's note when rejecting / completing
    processed_by:    { type: String, ref: "User" },
    processed_at:    Date,
  },
  { timestamps: true, versionKey: false, collection: "refunds" }
);

module.exports = mongoose.model("Refund", RefundSchema);
