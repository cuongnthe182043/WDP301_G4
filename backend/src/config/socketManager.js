/**
 * socketManager.js
 *
 * Thin singleton that holds a reference to the Socket.IO namespace
 * so any service module can emit events without importing `io` directly.
 *
 * Initialised in server.js after the Socket.IO server is ready.
 */

let _emitToUser = null;

/**
 * Called once from server.js after realtime namespace is ready.
 * @param {Function} emitFn  (userId: string, event: string, data: any) => void
 */
exports.init = (emitFn) => {
  _emitToUser = emitFn;
};

/**
 * Emit a socket event to a specific user.
 * Safe to call even if Socket.IO is not yet initialised (no-op).
 */
exports.emitToUser = (userId, event, data) => {
  if (_emitToUser) {
    try {
      _emitToUser(String(userId), event, data);
    } catch (err) {
      console.error("[socketManager] emitToUser error:", err.message);
    }
  }
};
