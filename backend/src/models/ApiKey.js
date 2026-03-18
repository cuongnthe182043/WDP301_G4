const mongoose = require("mongoose");

const ApiKeySchema = new mongoose.Schema(
  {
    service:     { type: String, required: true }, // e.g. "GHTK", "VNPay", "MoMo", "GHN", "Custom"
    key_name:    { type: String, required: true }, // display label, e.g. "VNPay TmnCode"
    api_key:     { type: String, required: true }, // the actual key value
    environment: { type: String, enum: ["sandbox", "production"], default: "sandbox" },
    is_active:   { type: Boolean, default: true },
    expires_at:  { type: Date, default: null },
    note:        { type: String, default: "" },
    created_by:  { type: String, ref: "User" },
    updated_by:  { type: String, ref: "User" },
  },
  { timestamps: true, versionKey: false, collection: "api_keys" }
);

module.exports = mongoose.model("ApiKey", ApiKeySchema);
