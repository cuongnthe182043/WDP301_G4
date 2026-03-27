const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const AppealSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `apl-${uuidv4()}` },
    user_id: { type: String, ref: "User", required: true },
    reason: { type: String, required: true },
    evidence_urls: [{ type: String }],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewed_by: { type: String, ref: "User", default: null },
    reviewed_at: { type: Date, default: null },
    admin_note: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false, collection: "appeals" }
);

AppealSchema.index({ user_id: 1, status: 1 });
AppealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Appeal", AppealSchema);
