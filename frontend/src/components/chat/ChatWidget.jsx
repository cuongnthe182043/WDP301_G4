import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import chatService from "../../services/chatService";
import { Button, Avatar, Badge } from "@heroui/react";
import { MessageCircle, X, ChevronLeft, Send, Loader2, Package, ShoppingBag, ExternalLink } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || "http://localhost:5000").replace("/api", "");

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000)   return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ`;
  return new Date(date).toLocaleDateString("vi-VN");
}

/* ── Context card rendered inside the chat thread ── */
function ContextCard({ ctx, compact = false }) {
  if (!ctx?.type || !ctx?.data) return null;

  if (ctx.type === "product") {
    const { name, image, price, slug } = ctx.data;
    return (
      <div
        className={`rounded-xl border border-default-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 overflow-hidden cursor-pointer hover:border-primary transition-colors ${compact ? "flex items-center gap-2 p-2" : ""}`}
        onClick={() => slug && window.open(`/products/${slug}`, "_blank")}
      >
        {compact ? (
          <>
            {image
              ? <img src={image} alt={name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
              : <div className="w-10 h-10 rounded-lg bg-default-100 flex items-center justify-center flex-shrink-0"><Package size={16} className="text-default-300" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-primary font-semibold">Đang hỏi về sản phẩm</p>
              <p className="text-xs text-default-700 dark:text-zinc-200 truncate font-medium">{name}</p>
              {price > 0 && <p className="text-[10px] text-default-500">{formatCurrency(price)}</p>}
            </div>
            <ExternalLink size={12} className="text-default-300 flex-shrink-0" />
          </>
        ) : (
          <div className="flex items-center gap-2.5 p-2.5">
            {image
              ? <img src={image} alt={name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
              : <div className="w-12 h-12 rounded-lg bg-default-100 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-default-300" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-primary font-semibold mb-0.5">Sản phẩm được hỏi</p>
              <p className="text-xs text-default-800 dark:text-zinc-100 line-clamp-2 font-medium leading-tight">{name}</p>
              {price > 0 && <p className="text-xs text-danger font-semibold mt-0.5">{formatCurrency(price)}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (ctx.type === "order") {
    const { order_code, total_price, status, items = [] } = ctx.data;
    const STATUS_VI = {
      order_created: "Đặt hàng", confirmed: "Đã xác nhận", processing: "Đang xử lý",
      in_transit: "Đang giao", delivered: "Đã giao", cancelled_by_customer: "Đã hủy",
    };
    return (
      <div className={`rounded-xl border border-default-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 overflow-hidden ${compact ? "p-2" : "p-2.5"}`}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <ShoppingBag size={compact ? 11 : 13} className="text-primary flex-shrink-0" />
          <p className="text-[10px] text-primary font-semibold">
            {compact ? "Đang hỏi về đơn hàng" : "Đơn hàng được hỏi"}
          </p>
        </div>
        <p className="text-xs font-bold text-default-800 dark:text-zinc-100">#{order_code}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {total_price > 0 && <span className="text-xs text-danger font-semibold">{formatCurrency(total_price)}</span>}
          {status && <span className="text-[10px] text-default-400">{STATUS_VI[status] || status}</span>}
        </div>
        {!compact && items.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {items.slice(0, 3).map((it, i) => (
              <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
                {it.image_url
                  ? <img src={it.image_url} alt={it.name} className="w-7 h-7 object-cover rounded-md flex-shrink-0" />
                  : <div className="w-7 h-7 rounded-md bg-default-100 flex-shrink-0" />
                }
                <p className="text-[10px] text-default-500 truncate">{it.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function ChatWidget() {
  const { user, isAuthenticated } = useAuth();

  const [open, setOpen]                 = useState(false);
  const [view, setView]                 = useState("list"); // "list" | "chat"
  const [conversations, setConvs]       = useState([]);
  const [activeConv, setActiveConv]     = useState(null);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [totalUnread, setTotalUnread]   = useState(0);
  // Context from the current chat trigger (product / order page)
  const [pendingContext, setPendingContext] = useState(null);

  const socketRef     = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Connect socket ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const s = io(`${SOCKET_URL}/realtime`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
    });

    s.on("connect", () => {
      s.emit("join-user", { userId: user._id });
    });

    s.on("chat:new_message", ({ conversation_id, message }) => {
      // If this conversation is currently open, append the message
      setActiveConv(prev => {
        if (prev?._id === conversation_id) {
          setMessages(msgs => {
            if (msgs.find(m => m._id === message._id)) return msgs;
            return [...msgs, message];
          });
        }
        return prev;
      });

      // Update conversation list preview + unread count
      setConvs(prev => prev.map(c =>
        c._id === conversation_id
          ? {
              ...c,
              last_message: message.content || "[Hình ảnh]",
              last_message_at: message.createdAt,
              unread_customer: (c.unread_customer || 0) + 1,
            }
          : c
      ));
      setTotalUnread(t => t + 1);
    });

    socketRef.current = s;

    return () => {
      s.emit("leave-user", { userId: user._id });
      s.close();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?._id]); // eslint-disable-line

  // ── Join conversation room when a chat is opened ──────────────────────────
  useEffect(() => {
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit("join-conversation", { conversationId: activeConv._id });
    return () => {
      socketRef.current?.emit("leave-conversation", { conversationId: activeConv._id });
    };
  }, [activeConv?._id]); // eslint-disable-line

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingConvs(true);
    try {
      const data = await chatService.listConversations();
      setConvs(data || []);
      setTotalUnread((data || []).reduce((s, c) => s + (c.unread_customer || 0), 0));
    } catch { /* silent */ }
    finally { setLoadingConvs(false); }
  }, [isAuthenticated]);

  useEffect(() => {
    if (open && isAuthenticated) loadConversations();
  }, [open, isAuthenticated]); // eslint-disable-line

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (conv) => {
    setLoadingMsgs(true);
    try {
      const data = await chatService.getMessages(conv._id);
      setMessages(data.messages || []);
      // Reset unread for this conversation locally
      setConvs(prev => prev.map(c =>
        c._id === conv._id ? { ...c, unread_customer: 0 } : c
      ));
      setTotalUnread(prev => Math.max(0, prev - (conv.unread_customer || 0)));
    } catch { /* silent */ }
    finally { setLoadingMsgs(false); }
  }, []);

  const openConversation = useCallback((conv) => {
    setActiveConv(conv);
    setView("chat");
    loadMessages(conv);
  }, [loadMessages]);

  // ── Listen for openChat custom DOM event (from ProductDetail / OrderDetail) ──
  useEffect(() => {
    const handler = (e) => {
      const conv    = e.detail?.conversation;
      const context = e.detail?.context || null;
      if (!conv) return;
      setOpen(true);
      setPendingContext(context);
      openConversation(conv);
    };
    window.addEventListener("openChat", handler);
    return () => window.removeEventListener("openChat", handler);
  }, [openConversation]);

  // ── Auto-scroll to latest message ─────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !activeConv) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic update
    const temp = {
      _id: `tmp-${Date.now()}`,
      sender_id: user._id,
      sender_type: "customer",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, temp]);

    try {
      const msg = await chatService.sendMessage(activeConv._id, text);
      setMessages(prev => prev.map(m => m._id === temp._id ? msg : m));
    } catch {
      setMessages(prev => prev.filter(m => m._id !== temp._id));
    }
    setSending(false);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* ── Floating button ────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!open && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Badge
                content={totalUnread > 0 ? totalUnread : undefined}
                color="danger"
                shape="circle"
              >
                <Button
                  isIconOnly
                  radius="full"
                  size="lg"
                  color="primary"
                  className="shadow-xl w-14 h-14"
                  onPress={() => setOpen(true)}
                >
                  <MessageCircle size={22} />
                </Button>
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 h-[520px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-default-200 dark:border-zinc-700 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                {view === "chat" && (
                  <button
                    onClick={() => { setView("list"); setActiveConv(null); setMessages([]); setPendingContext(null); }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <MessageCircle size={18} />
                <span className="font-semibold text-sm">
                  {view === "list" ? "Tin nhắn" : (activeConv?.shop?.shop_name || "Chat")}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {view === "list" ? (
                /* ── Conversation list ─────────────────────────────── */
                <div className="flex-1 overflow-y-auto">
                  {loadingConvs ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={24} className="animate-spin text-default-300" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-default-400 p-6">
                      <MessageCircle size={40} className="text-default-200" />
                      <p className="text-sm text-center">
                        Chưa có cuộc trò chuyện nào.<br />Vào trang shop để bắt đầu chat.
                      </p>
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <button
                        key={conv._id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-default-50 dark:hover:bg-zinc-800 transition-colors border-b border-default-50 dark:border-zinc-800 text-left"
                        onClick={() => openConversation(conv)}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar
                            src={conv.shop?.shop_logo}
                            name={conv.shop?.shop_name?.charAt(0) || "S"}
                            size="sm"
                            className="w-10 h-10"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-default-900 dark:text-zinc-100 truncate">
                              {conv.shop?.shop_name || "Shop"}
                            </p>
                            <span className="text-[10px] text-default-400 flex-shrink-0 ml-2">
                              {timeAgo(conv.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-default-400 truncate flex-1">
                              {conv.last_message || "Bắt đầu cuộc trò chuyện"}
                            </p>
                            {conv.unread_customer > 0 && (
                              <span className="ml-2 flex-shrink-0 bg-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {conv.unread_customer > 9 ? "9+" : conv.unread_customer}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                /* ── Message thread ─────────────────────────────────── */
                <>
                  {/* Shop info bar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-default-100 dark:border-zinc-700 flex-shrink-0 bg-default-50 dark:bg-zinc-800">
                    <Avatar
                      src={activeConv?.shop?.shop_logo}
                      name={activeConv?.shop?.shop_name?.charAt(0)}
                      size="sm"
                      className="w-7 h-7"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-default-900 dark:text-zinc-100 truncate">
                        {activeConv?.shop?.shop_name}
                      </p>
                      <p className="text-[10px] text-default-400">Shop</p>
                    </div>
                  </div>

                  {/* Pending context banner — shown for existing convs when context not yet in history */}
                  {pendingContext && !messages.some(m => m.context_type === pendingContext.type) && (
                    <div className="px-3 pt-2 flex-shrink-0">
                      <ContextCard ctx={pendingContext} compact />
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                    {loadingMsgs ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 size={20} className="animate-spin text-default-300" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-default-400">Hãy gửi tin nhắn đầu tiên</p>
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isMe = msg.sender_type === "customer";

                        // Context card message (product / order reference)
                        if (msg.context_type && msg.context_data) {
                          return (
                            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              {!isMe && (
                                <Avatar
                                  src={activeConv?.shop?.shop_logo}
                                  size="sm"
                                  className="w-6 h-6 mr-1.5 mt-auto flex-shrink-0"
                                />
                              )}
                              <div className="max-w-[80%]">
                                <ContextCard ctx={{ type: msg.context_type, data: msg.context_data }} />
                                <p className={`text-[10px] text-default-300 mt-0.5 ${isMe ? "text-right" : "text-left"}`}>
                                  {timeAgo(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            {!isMe && (
                              <Avatar
                                src={activeConv?.shop?.shop_logo}
                                size="sm"
                                className="w-6 h-6 mr-1.5 mt-auto flex-shrink-0"
                              />
                            )}
                            <div className="max-w-[70%] group">
                              <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                isMe
                                  ? "bg-primary text-white rounded-br-sm"
                                  : "bg-default-100 dark:bg-zinc-700 text-default-900 dark:text-zinc-100 rounded-bl-sm"
                              }`}>
                                {msg.content}
                                {msg.images?.map((img, i) => (
                                  <img key={i} src={img} alt="" className="mt-1 rounded-lg max-w-full" />
                                ))}
                              </div>
                              <p className={`text-[10px] text-default-300 mt-0.5 ${isMe ? "text-right" : "text-left"}`}>
                                {timeAgo(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="px-3 py-2 border-t border-default-100 dark:border-zinc-700 flex items-center gap-2 flex-shrink-0">
                    <input
                      className="flex-1 text-sm bg-default-50 dark:bg-zinc-800 border border-default-200 dark:border-zinc-600 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
                      placeholder="Nhập tin nhắn..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      color="primary"
                      radius="full"
                      isLoading={sending}
                      isDisabled={!input.trim()}
                      onPress={handleSend}
                    >
                      <Send size={15} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
