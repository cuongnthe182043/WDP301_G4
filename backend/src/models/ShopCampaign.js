const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const shopCampaignSchema = new mongoose.Schema(
  {
    _id:        { type: String, default: () => `camp-${uuidv4()}` },
    shop_id:    { type: String, ref: "Shop", required: true, index: true },
    created_by: { type: String, ref: "User", required: true },

    // Campaign content
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Type of campaign
    campaign_type: {
      type: String,
      enum: ["announcement", "voucher_send", "credits_gift"],
      default: "announcement",
    },

    // Delivery channels
    channels: {
      type: [{ type: String, enum: ["in_app", "email"] }],
      default: ["in_app"],
    },

    // Recipients
    recipient_type: {
      type: String,
      enum: ["all_buyers", "recent_30d", "custom"],
      default: "all_buyers",
    },
    custom_user_ids: [{ type: String }],
    recipient_count: { type: Number, default: 0 },

    // Attached resources
    voucher_id:     { type: String, ref: "Voucher", default: null },
    credits_amount: { type: Number, default: 0 },

    // Delivery tracking
    status:       { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending" },
    sent_count:   { type: Number, default: 0 },
    failed_count: { type: Number, default: 0 },
    sent_at:      { type: Date, default: null },
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model("ShopCampaign", shopCampaignSchema);
