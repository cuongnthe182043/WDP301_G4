import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import chatService from "../../services/chatService";
import { Avatar, Button, Skeleton } from "@heroui/react";
import { MessageCircle, Send, Loader2, Users, Package, ShoppingBag, ExternalLink } from "lucide-react";
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

/* ── Context card shown in message thread ── */
function ContextCard({ ctx }) {
  if (!ctx?.type || !ctx?.data) return null;

  if (ctx.type === "product") {
    const { name, image, price, slug } = ctx.data;
    return (
      <div
        className="rounded-xl border border-default-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 overflow-hidden cursor-pointer hover:border-primary transition-colors"
        onClick={() => slug && window.open(`/products/${slug}`, "_blank")}
      >
        <div className="flex items-center gap-2.5 p-2.5">
          {image
            ? <img src={image} alt={name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
            : <div className="w-12 h-12 rounded-lg bg-default-100 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-default-300" /></div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-primary font-semibold mb-0.5">Sản phẩm được hỏi</p>
            <p className="text-sm text-default-800 dark:text-zinc-100 line-clamp-2 font-medium leading-tight">{name}</p>
            {price > 0 && <p className="text-xs text-danger font-semibold mt-0.5">{formatCurrency(price)}</p>}
          </div>
          <ExternalLink size={14} className="text-default-300 flex-shrink-0" />
        </div>
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
      <div className="rounded-xl border border-default-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ShoppingBag size={14} className="text-primary flex-shrink-0" />
          <p className="text-[10px] text-primary font-semibold">Đơn hàng được hỏi</p>
        </div>
        <p className="text-sm font-bold text-default-800 dark:text-zinc-100">#{order_code}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {total_price > 0 && <span className="text-sm text-danger font-semibold">{formatCurrency(total_price)}</span>}
          {status && <span className="text-xs text-default-400">{STATUS_VI[status] || status}</span>}
        </div>
        {items.length > 0 && (
          <div className="flex gap-2 mt-2">
            {items.slice(0, 3).map((it, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-1 min-w-0">
                {it.image_url
                  ? <img src={it.image_url} alt={it.name} className="w-8 h-8 object-cover rounded-md flex-shrink-0" />
                  : <div className="w-8 h-8 rounded-md bg-default-100 flex-shrink-0" />
                }
                <p className="text-xs text-default-500 truncate">{it.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function ShopInbox() {
  const { user } = useAuth();

  const [conversations, setConvs]     = useState([]);
  const [activeConv, setActiveConv]   = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const socketRef     = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Socket connection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id) return;

    const s = io(`${SOCKET_URL}/realtime`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
    });

    s.on("connect", () => {
      s.emit("join-user", { userId: user._id });
    });

    // Receive real-time messages via conversation room
    s.on("message:new", ({ conversation_id, message }) => {
      setActiveConv(prev => {
        if (prev?._id === conversation_id) {
          setMessages(msgs => {
            if (msgs.find(m => m._id === message._id)) return msgs;
            return [...msgs, message];
          });
        }
        return prev;
      });

      setConvs(prev => prev.map(c =>
        c._id === conversation_id
          ? {
              ...c,
              last_message: message.content || "[Hình ảnh]",
              last_message_at: message.createdAt,
              unread_shop: message.sender_type === "customer"
                ? (c.unread_shop || 0) + 1
                : c.unread_shop,
            }
          : c
      ));
    });

    // Also listen for chat:new_message (sent via user room when shop_id is the target)
    s.on("chat:new_message", ({ conversation_id, message }) => {
      setActiveConv(prev => {
        if (prev?._id === conversation_id) {
          setMessages(msgs => {
            if (msgs.find(m => m._id === message._id)) return msgs;
            return [...msgs, message];
          });
        }
        return prev;
      });

      setConvs(prev => prev.map(c =>
        c._id === conversation_id
          ? {
              ...c,
              last_message: message.content || "[Hình ảnh]",
              last_message_at: message.createdAt,
              unread_shop: message.sender_type === "customer"
                ? (c.unread_shop || 0) + 1
                : c.unread_shop,
            }
          : c
      ));
    });

    socketRef.current = s;

    return () => {
      s.emit("leave-user", { userId: user._id });
      s.close();
      socketRef.current = null;
    };
  }, [user?._id]); // eslint-disable-line

  // ── Join / leave conversation room ────────────────────────────────────────
  useEffect(() => {
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit("join-conversation", { conversationId: activeConv._id });
    return () => {
      socketRef.current?.emit("leave-conversation", { conversationId: activeConv._id });
    };
  }, [activeConv?._id]); // eslint-disable-line

  // ── Load conversations on mount ───────────────────────────────────────────
  useEffect(() => {
    chatService.shopListConversations()
      .then(data => setConvs(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Open a conversation and load its messages ─────────────────────────────
  const openConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    setLoadingMsgs(true);
    try {
      const data = await chatService.shopGetMessages(conv._id);
      setMessages(data.messages || []);
      setConvs(prev => prev.map(c =>
        c._id === conv._id ? { ...c, unread_shop: 0 } : c
      ));
    } catch { /* silent */ }
    finally { setLoadingMsgs(false); }
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
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
      sender_type: "shop",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, temp]);

    try {
      const msg = await chatService.shopSendMessage(activeConv._id, text);
      setMessages(prev => prev.map(m => m._id === temp._id ? msg : m));
    } catch {
      setMessages(prev => prev.filter(m => m._id !== temp._id));
    }
    setSending(false);
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_shop || 0), 0);

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-default-100 dark:border-zinc-700 bg-white dark:bg-zinc-900">

      {/* ── Conversation list ───────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-default-100 dark:border-zinc-700 flex flex-col">
        <div className="px-4 py-4 border-b border-default-100 dark:border-zinc-700">
          <h2 className="font-bold text-default-900 dark:text-zinc-100 flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            Tin nhắn
            {totalUnread > 0 && (
              <span className="ml-auto bg-danger text-white text-xs font-bold rounded-full px-2 py-0.5">
                {totalUnread}
              </span>
            )}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-default-400 p-6">
              <Users size={32} className="text-default-200" />
              <p className="text-sm text-center">Chưa có tin nhắn nào từ khách hàng</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv._id}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-default-50 dark:border-zinc-800 ${
                  activeConv?._id === conv._id
                    ? "bg-primary-50 dark:bg-primary-900/20"
                    : "hover:bg-default-50 dark:hover:bg-zinc-800"
                }`}
                onClick={() => openConversation(conv)}
              >
                <Avatar
                  src={conv.customer?.avatar}
                  name={conv.customer?.name?.charAt(0) || "K"}
                  size="sm"
                  className="w-10 h-10 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-default-900 dark:text-zinc-100 truncate">
                      {conv.customer?.name || "Khách hàng"}
                    </p>
                    <span className="text-[10px] text-default-400 ml-2 flex-shrink-0">
                      {timeAgo(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-default-400 truncate flex-1">
                      {conv.last_message || "Bắt đầu cuộc trò chuyện"}
                    </p>
                    {conv.unread_shop > 0 && (
                      <span className="ml-2 flex-shrink-0 bg-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {conv.unread_shop > 9 ? "9+" : conv.unread_shop}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Message area ───────────────────────────────────────────────── */}
      {!activeConv ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-default-400">
          <MessageCircle size={48} className="text-default-200" />
          <p className="text-sm">Chọn cuộc trò chuyện để bắt đầu</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-default-100 dark:border-zinc-700 flex-shrink-0">
            <Avatar
              src={activeConv.customer?.avatar}
              name={activeConv.customer?.name?.charAt(0)}
              size="sm"
            />
            <div>
              <p className="font-semibold text-sm text-default-900 dark:text-zinc-100">
                {activeConv.customer?.name || "Khách hàng"}
              </p>
              <p className="text-xs text-default-400">Khách hàng</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-default-300" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-default-400">Hãy gửi tin nhắn đầu tiên</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_type === "shop";

                // Context card message (product / order reference)
                if (msg.context_type && msg.context_data) {
                  return (
                    <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <Avatar
                          src={activeConv.customer?.avatar}
                          size="sm"
                          className="w-7 h-7 mr-2 mt-auto flex-shrink-0"
                        />
                      )}
                      <div className="max-w-[75%]">
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
                        src={activeConv.customer?.avatar}
                        size="sm"
                        className="w-7 h-7 mr-2 mt-auto flex-shrink-0"
                      />
                    )}
                    <div className="max-w-[65%]">
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
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
          <div className="px-5 py-3 border-t border-default-100 dark:border-zinc-700 flex items-center gap-3 flex-shrink-0">
            <input
              className="flex-1 text-sm bg-default-50 dark:bg-zinc-800 border border-default-200 dark:border-zinc-600 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors"
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
              color="primary"
              radius="full"
              isLoading={sending}
              isDisabled={!input.trim()}
              onPress={handleSend}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
