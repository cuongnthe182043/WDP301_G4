const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `user-${uuidv4()}` },
    name: { type: String, required: true },
    username: { type: String, required: true, trim: true, lowercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, unique: true, sparse: true },

    gender: { type: String, enum: ["male", "female", "other"] },
    dob: Date,
    role_id: {
      type: String,
      ref: "Role",
      default: "role-customer",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "banned", "warning", "suspended", "banned_permanent"],
      default: "active",
    },
    password_hash: String,
    refresh_token: String,
    avatar_url: String,
    avatar_public_id: String,
    preferences: {
      height: Number,
      weight: Number,
      size_top: String,
      size_bottom: String,
    },
    wishlist: [{ type: String, ref: "Product" }],
    recently_viewed: [{ type: String, ref: "Product" }],
    last_login: Date,

    // ── Moderation ────────────────────────────────────────────────────────
    warning_count: { type: Number, default: 0 },
    ban_until: { type: Date, default: null }, // legacy field kept for backward compat

    // Unified ban info
    is_banned:  { type: Boolean, default: false },
    ban_type:   { type: String, enum: ["temporary", "permanent", null], default: null },
    ban_reason: { type: String, default: null },
    ban_start:  { type: Date, default: null },
    ban_end:    { type: Date, default: null },
    banned_by:  { type: String, default: null },

    // Trust score (0–100)
    trust_score: { type: Number, default: 80, min: 0, max: 100 },

    violation_history: [{
      _id: false,
      reason:    { type: String },
      review_id: { type: String },
      severity:  { type: Number, min: 1, max: 4 },
      at:        { type: Date, default: Date.now },
    }],
  },
  { timestamps: true, versionKey: false, collection: "users" }
);

UserSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
UserSchema.index(
  { username: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
UserSchema.index({ is_banned: 1, ban_end: 1 });
UserSchema.index({ status: 1, trust_score: 1 });

module.exports = mongoose.model("User", UserSchema);
