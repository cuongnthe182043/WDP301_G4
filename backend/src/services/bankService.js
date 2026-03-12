const BankAccount = require("../models/BankAccount");

// Validation helpers
function validateAccountNumber(n) {
  if (!n || !/^\d+$/.test(n)) throw Object.assign(new Error("Số tài khoản chỉ được chứa chữ số"), { status: 400 });
  if (n.length < 6 || n.length > 20) throw Object.assign(new Error("Số tài khoản phải từ 6 đến 20 chữ số"), { status: 400 });
}
function validateOwnerName(name) {
  if (!name || name.trim().length < 2) throw Object.assign(new Error("Tên chủ tài khoản ít nhất 2 ký tự"), { status: 400 });
  if (/[^a-zA-ZÀ-ỹ\s]/.test(name)) throw Object.assign(new Error("Tên không được chứa ký tự đặc biệt"), { status: 400 });
}

exports.list = (userId) => BankAccount.find({ user_id: userId }).sort({ is_default: -1, createdAt: -1 }).lean();

exports.create = async (userId, p) => {
  const { bank_name, bank_code, account_number, owner_name, logo_url } = p || {};
  if (!bank_name) throw Object.assign(new Error("Vui lòng chọn ngân hàng"), { status: 400 });
  validateAccountNumber(account_number);
  validateOwnerName(owner_name);
  // Check duplicate
  const exists = await BankAccount.findOne({ user_id: userId, account_number, bank_code });
  if (exists) throw Object.assign(new Error("Tài khoản này đã được liên kết"), { status: 409 });
  const count = await BankAccount.countDocuments({ user_id: userId });
  return BankAccount.create({ user_id: userId, bank_name, bank_code, account_number, owner_name: owner_name.trim().toUpperCase(), logo_url, is_default: count === 0 });
};

exports.update = async (userId, id, p) => {
  const item = await BankAccount.findOne({ _id: id, user_id: userId });
  if (!item) return null;
  const { bank_name, bank_code, account_number, owner_name, logo_url } = p || {};
  if (bank_name !== undefined) item.bank_name = bank_name;
  if (bank_code !== undefined) item.bank_code = bank_code;
  if (account_number !== undefined) { validateAccountNumber(account_number); item.account_number = account_number; }
  if (owner_name !== undefined) { validateOwnerName(owner_name); item.owner_name = owner_name.trim().toUpperCase(); }
  if (logo_url !== undefined) item.logo_url = logo_url;
  await item.save();
  return item;
};

exports.remove = async (userId, id) => {
  const item = await BankAccount.findOneAndDelete({ _id: id, user_id: userId });
  // If deleted item was default, promote oldest remaining to default
  if (item?.is_default) {
    const next = await BankAccount.findOne({ user_id: userId }).sort({ createdAt: 1 });
    if (next) { next.is_default = true; await next.save(); }
  }
  return item;
};

exports.setDefault = async (userId, id) => {
  const item = await BankAccount.findOne({ _id: id, user_id: userId });
  if (!item) return null;
  await BankAccount.updateMany({ user_id: userId }, { is_default: false });
  item.is_default = true;
  await item.save();
  return item;
};

exports.sendOtp = async (userId, id) => {
  const item = await BankAccount.findOne({ _id: id, user_id: userId });
  if (!item) return null;
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  item.otp = otp;
  item.otp_expires = new Date(Date.now() + 5 * 60 * 1000);
  await item.save();
  // In production, send OTP via SMS/email. Here we return it for mock purposes.
  return { otp, expires_in: 300 };
};

exports.verifyOtp = async (userId, id, otp) => {
  const item = await BankAccount.findOne({ _id: id, user_id: userId });
  if (!item) return null;
  if (!item.otp || item.otp !== String(otp)) throw Object.assign(new Error("Mã OTP không đúng"), { status: 400 });
  if (item.otp_expires < new Date()) throw Object.assign(new Error("Mã OTP đã hết hạn"), { status: 400 });
  item.is_verified = true;
  item.otp = undefined;
  item.otp_expires = undefined;
  await item.save();
  return item;
};
