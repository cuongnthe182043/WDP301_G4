const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const BankAccountSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `bank-${uuidv4()}` },
    user_id: { type: String, ref: "User", required: true },
    bank_name: { type: String, required: true },
    account_number: { type: String, required: true },
    owner_name: { type: String, required: true },
    logo_url: String,
    logo_public_id: String,
    bank_code: { type: String },
    is_verified: { type: Boolean, default: false },
    is_default: { type: Boolean, default: false },
    otp: { type: String },
    otp_expires: { type: Date },
  },
  { timestamps: true, versionKey: false, collection: "bank_accounts" }
);


module.exports = mongoose.model("BankAccount", BankAccountSchema);
