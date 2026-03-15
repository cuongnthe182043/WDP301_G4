const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const historyEntry = new mongoose.Schema(
  {
    type:          { type: String, enum: ["earn", "spend", "gift", "expire", "adjust"], required: true },
    amount:        { type: Number, required: true },   // positive = added, negative = spent
    balance_after: { type: Number, required: true },
    reason:        { type: String, default: "" },
    order_id:      { type: String, default: null },
    at:            { type: Date, default: Date.now },
  },
  { _id: false }
);

const shopCreditSchema = new mongoose.Schema(
  {
    _id:           { type: String, default: () => `sc-${uuidv4()}` },
    user_id:       { type: String, ref: "User",  required: true, index: true },
    shop_id:       { type: String, ref: "Shop",  required: true, index: true },
    balance:       { type: Number, default: 0, min: 0 },
    total_earned:  { type: Number, default: 0 },
    total_spent:   { type: Number, default: 0 },
    expires_at:    { type: Date, default: null },  // null = never expires
    history:       [historyEntry],
  },
  { versionKey: false, timestamps: true }
);

// Compound unique index: one record per (user, shop)
shopCreditSchema.index({ user_id: 1, shop_id: 1 }, { unique: true });

module.exports = mongoose.model("ShopCredit", shopCreditSchema);
