const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ReportSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `rpt-${uuidv4()}` },
    reporter_id: { type: String, ref: "User", required: true },
    target_id: { type: String, ref: "User", required: true },
    target_type: {
      type: String,
      enum: ["user", "shop", "review", "product"],
      default: "user",
    },
    reason: { type: String, required: true },
    description: { type: String, default: "" },
    evidence_urls: [{ type: String }],

    status: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "pending",
    },
    resolved_by: { type: String, ref: "User", default: null },
    resolved_at: { type: Date, default: null },
    resolution_note: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false, collection: "reports" }
);

ReportSchema.index({ target_id: 1, status: 1 });
ReportSchema.index({ reporter_id: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Report", ReportSchema);
