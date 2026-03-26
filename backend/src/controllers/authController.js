const authService = require("../services/authService");
const { successResponse, errorResponse } = require("../utils/constants");
const User = require("../models/User");
const auditLog = require("../services/auditLogService");

// ─── MIDDLEWARE: Set COOP header đúng cho tất cả auth routes ───
// FIX: "same-origin" chặn window.postMessage của Google OAuth popup
// Phải dùng "same-origin-allow-popups" để Google Sign-In hoạt động
const setAuthCOOPHeader = (req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
};

exports.setAuthCOOPHeader = setAuthCOOPHeader;

exports.requestRegisterOTP = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const result = await authService.requestOTP({ email, phone, type: "register" });
    res.json(successResponse(result, "Đã gửi OTP xác thực đăng ký"));
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
};

exports.verifyRegisterOTP = async (req, res) => {
  try {
    const { email, otp, name, username, password } = req.body;
    const result = await authService.verifyRegister({ email, otp, name, username, password });
    auditLog.log({ actorId: result.user?._id || email, action: "auth.register", targetCollection: "users", targetId: result.user?._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { email } });
    res.json(successResponse(result, "Đăng ký thành công"));
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
};

exports.login = async (req, res) => {
  const { identifier, password } = req.body || {};
  try {
    const result = await authService.login(identifier, password);
    auditLog.log({ actorId: result.user?._id || identifier, action: "auth.login", targetCollection: "users", targetId: result.user?._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { method: "password" } });
    res.json(successResponse(result, "Đăng nhập thành công"));
  } catch (err) {
    auditLog.log({ actorId: identifier, action: "auth.login_failed", targetCollection: "users", ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { reason: err.message } });
    res.status(401).json(errorResponse(err.message));
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body; // Google ID token

    // FIX: Google ID token rất dài (~2KB). Kiểm tra sơ bộ để tránh xử lý token rác
    if (!token || typeof token !== "string" || token.length < 100) {
      return res.status(400).json(errorResponse("Token Google không hợp lệ"));
    }

    const result = await authService.googleLogin(token);
    auditLog.log({ actorId: result.user?._id, action: "auth.login", targetCollection: "users", targetId: result.user?._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { method: "google" } });
    res.json(successResponse(result, "Đăng nhập Google thành công"));
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
};

exports.requestResetOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.requestOTP({ email, type: "forgot" });
    res.json(successResponse(result, "Đã gửi OTP đặt lại mật khẩu"));
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await authService.resetPassword(email, otp, newPassword);
    res.json(successResponse(result, "Đặt lại mật khẩu thành công"));
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(userId, oldPassword, newPassword);
    auditLog.log({ actorId: userId, action: "auth.change_password", targetCollection: "users", targetId: userId, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req) });
    res.json(successResponse(result, "Đổi mật khẩu thành công"));
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
};

exports.logout = async (req, res) => {
  try {
    // FIX: Xóa refresh_token để invalidate session
    await User.updateOne(
      { _id: req.user._id },
      { $unset: { refresh_token: "" } }
    );

    // FIX: Xóa tất cả auth cookies phía server khi logout
    // Tránh cookie cũ tích lũy gây lỗi 431 Request Header Fields Too Large
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0), // Expire ngay lập tức
      path: "/",
    };

    // Xóa các cookie auth phổ biến nếu có
    res.clearCookie("token", cookieOptions);
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("dfs_token", cookieOptions);
    res.clearCookie("connect.sid", cookieOptions);

    auditLog.log({ actorId: req.user._id, action: "auth.logout", targetCollection: "users", targetId: req.user._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req) });
    return res.json(successResponse(null, "Đã đăng xuất"));
  } catch (err) {
    return res.status(500).json(errorResponse("Lỗi khi đăng xuất"));
  }
};