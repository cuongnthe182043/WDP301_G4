const mongoose = require("mongoose");

/**
 * Key-value store for system-wide configuration.
 * Each record is one config entry grouped by category.
 */
const SystemConfigSchema = new mongoose.Schema(
  {
    category:    { type: String, required: true }, // smtp | sms | cdn | storage | policy | general
    key:         { type: String, required: true }, // unique within category, e.g. "smtp_host"
    value:       { type: String, default: "" },
    label:       { type: String, default: "" },    // human-readable label
    input_type:  { type: String, default: "text" }, // text | password | number | boolean
    is_secret:   { type: Boolean, default: false }, // mask in responses
    updated_by:  { type: String, ref: "User" },
  },
  { timestamps: true, versionKey: false, collection: "system_configs" }
);

SystemConfigSchema.index({ category: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("SystemConfig", SystemConfigSchema);
