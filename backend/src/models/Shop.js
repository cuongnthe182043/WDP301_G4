const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ShopSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `shop-${uuidv4()}` },
    owner_id: { type: String, ref: "User", required: true, unique: true },
    shop_name: { type: String, required: true, trim: true },
    shop_slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    shop_logo: { type: String, default: "" },
    banner_url: { type: String, default: "" },
    description: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "pending",
    },
    rating_avg: { type: Number, default: 0 },
    total_products: { type: Number, default: 0 },
    total_orders: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    rejection_reason: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false, collection: "shops" }
);

ShopSchema.index({ shop_slug: 1 }, { unique: true });
ShopSchema.index({ owner_id: 1 });
ShopSchema.index({ status: 1 });

module.exports = mongoose.model("Shop", ShopSchema);
