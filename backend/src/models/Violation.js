const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ViolationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `vio-${uuidv4()}` },
    user_id: { type: String, ref: "User", required: true },
    role: {
      type: String,
      enum: ["customer", "shop"],
      required: true,
    },
    type: {
      type: String,
      enum: [
        "spam",
        "fake_order",
        "refund_abuse",
        "toxic_review",
        "fraud",
        "policy_violation",
        "frequent_cancellation",
        "fake_product",
        "high_complaint_rate",
        "payment_abuse",
      ],
      required: true,
    },
    severity: {
      type: Number,
      min: 1,
      max: 4,
      required: true,
    },
    description: { type: String, default: "" },

    // Auto-detection metadata
    auto_detected: { type: Boolean, default: false },
    detection_rule: { type: String, default: null },
    detection_data: { type: Object, default: null },

    // Resolution
    status: {
      type: String,
      enum: ["pending", "confirmed", "dismissed"],
      default: "pending",
    },
    reviewed_by: { type: String, ref: "User", default: null },
    reviewed_at: { type: Date, default: null },

    // Action taken
    action_taken: {
      type: String,
      enum: ["none", "warning", "temp_ban", "perm_ban", "trust_reduce", null],
      default: null,
    },
  },
  { timestamps: true, versionKey: false, collection: "violations" }
);

ViolationSchema.index({ user_id: 1, createdAt: -1 });
ViolationSchema.index({ status: 1, severity: -1 });
ViolationSchema.index({ type: 1 });

module.exports = mongoose.model("Violation", ViolationSchema);
