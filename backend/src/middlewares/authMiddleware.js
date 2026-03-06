const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.verifyToken = async (req, res, next) => {
  // Skip preflight so CORS works
  if (req.method === "OPTIONS") return next();

  try {
    const authHeader = req.get("authorization") || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ message: "Người dùng không tồn tại" });
    }

    // Set both req.user (full doc) and req.userId (string) for all controllers
    req.user   = user;
    req.userId = String(user._id);

    const safe = user.toObject?.() || {};
    delete safe.password_hash;
    delete safe.refresh_token;
    req.userSafe = safe;

    return next();
  } catch (err) {
    // 401 = not authenticated (expired / tampered token)
    // 403 = authenticated but forbidden — wrong semantic here
    const msg = err.name === "TokenExpiredError"
      ? "Token đã hết hạn, vui lòng đăng nhập lại"
      : "Token không hợp lệ";
    return res.status(401).json({ message: msg });
  }
};
