const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

/**
 * PlatformFee — records platform commission per settled order.
 *
 * Created when an order is marked "delivered" and the settlement runs.
 * The shop receives (order total − platform fee) in their wallet;
 * the platform fee is credited to the system wallet.
 */
const PlatformFeeSchema = new mongoose.Schema(
  {
    _id:          { type: String, default: () => `pfee-${uuidv4()}` },
    order_id:     { type: String, ref: "Order", required: true },
    order_code:   { type: String, required: true },
    shop_id:      { type: String, ref: "Shop", required: true },
    user_id:      { type: String, ref: "User" },                   // buyer

    order_total:  { type: Number, required: true },                 // total_price of the order
    fee_rate:     { type: Number, required: true },                 // e.g. 0.05 = 5%
    fee_amount:   { type: Number, required: true },                 // calculated fee
    shop_receive: { type: Number, required: true },                 // order_total − fee_amount

    status: {
      type: String,
      enum: ["settled", "reversed"],                                // reversed = refund after settlement
      default: "settled",
    },

    settled_at:   { type: Date, default: Date.now },
    note:         { type: String, default: "" },
  },
  { timestamps: true, versionKey: false, collection: "platform_fees" }
);

PlatformFeeSchema.index({ order_id: 1 }, { unique: true });
PlatformFeeSchema.index({ shop_id: 1, settled_at: -1 });
PlatformFeeSchema.index({ status: 1, settled_at: -1 });

module.exports = mongoose.model("PlatformFee", PlatformFeeSchema);
