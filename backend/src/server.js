// src/server.js
require("dotenv").config();
const http = require("http");
const app = require("./app");

const FE_ORIGIN = process.env.FE_ORIGIN || "http://localhost:5173";
const PORT = process.env.PORT || 5000;

// Tạo httpServer từ app (thay vì app.listen)
// maxHeaderSize: tăng từ 8 KB mặc định lên 32 KB để tránh 431 khi JWT token lớn
const server = http.createServer({ maxHeaderSize: 32768 }, app);

// === Socket.IO v4 gắn vào httpServer ===
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: FE_ORIGIN,
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  // path: "/socket.io", // giữ mặc định để khớp client
});

// Namespace realtime + helper broadcast
const realtime = require("./sockets/realtime")(io);
// Cho controller lấy ra broadcast: req.app.get("realtime")
app.set("realtime", realtime);

// Wire socketManager so any service can emit user events
const socketManager = require("./config/socketManager");
socketManager.init(realtime.emitToUser);

// Kết nối DB + start
const { connectDB } = require("./config/db");
(async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`✅ API + Socket.IO listening on ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
