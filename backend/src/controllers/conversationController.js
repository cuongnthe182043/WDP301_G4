const Conversation = require("../models/Conversation");
const Message      = require("../models/Message");
const Shop         = require("../models/Shop");
const User         = require("../models/User");

// ─── Customer: start or get conversation with a shop ──────────────────────────
// POST /api/conversations  { shop_id, context?: { type: "product"|"order", data: {} } }
exports.customerStartConversation = async (req, res, next) => {
  try {
    const customerId = req.userId || req.user?._id;
    const { shop_id, context } = req.body;
    if (!shop_id) return res.status(400).json({ message: "shop_id is required" });

    let conv = await Conversation.findOne({ customer_id: customerId, shop_id });
    const isNew = !conv;
    if (!conv) {
      conv = await Conversation.create({ customer_id: customerId, shop_id });
    }

    // Auto-send a context message when a new conversation is started from a product or order page
    if (isNew && context?.type && context?.data) {
      const ctxMsg = await Message.create({
        conversation_id: conv._id,
        sender_id:       customerId,
        sender_type:     "customer",
        content:         "",
        context_type:    context.type,
        context_data:    context.data,
      });
      // Increment shop unread so they notice the new conversation
      conv.unread_shop = 1;
      conv.last_message = context.type === "product"
        ? `[Sản phẩm] ${context.data?.name || ""}`
        : `[Đơn hàng] ${context.data?.order_code || ""}`;
      conv.last_message_at = new Date();
      await conv.save();

      // Notify shop in real time
      const realtime = req.app.get("realtime");
      if (realtime) {
        if (realtime.emitToConversation) {
          realtime.emitToConversation(conv._id, "message:new", {
            conversation_id: conv._id,
            message: ctxMsg.toObject(),
          });
        }
        if (realtime.emitToUser) {
          realtime.emitToUser(String(conv.shop_id), "chat:new_message", {
            conversation_id: conv._id,
            message: ctxMsg.toObject(),
            sender_type: "customer",
          });
        }
      }
    }

    // Enrich with shop info
    const shop = await Shop.findById(shop_id).select("_id shop_name shop_slug shop_logo").lean();
    res.json({ success: true, data: { ...conv.toObject(), shop } });
  } catch (e) { next(e); }
};

// GET /api/conversations  — list customer's conversations
exports.customerListConversations = async (req, res, next) => {
  try {
    const customerId = req.userId || req.user?._id;
    const convs = await Conversation.find({ customer_id: customerId })
      .sort({ last_message_at: -1 })
      .lean();

    const shopIds = [...new Set(convs.map(c => c.shop_id).filter(Boolean))];
    const shops   = await Shop.find({ _id: { $in: shopIds } }).select("_id shop_name shop_slug shop_logo").lean();
    const shopMap = new Map(shops.map(s => [String(s._id), s]));

    const enriched = convs.map(c => ({ ...c, shop: shopMap.get(String(c.shop_id)) || null }));
    res.json({ success: true, data: enriched });
  } catch (e) { next(e); }
};

// GET /api/conversations/:id/messages
exports.getMessages = async (req, res, next) => {
  try {
    const actorId = req.userId || req.user?._id;
    const { id }  = req.params;
    const page    = Math.max(1, Number(req.query.page) || 1);
    const limit   = Math.min(Number(req.query.limit) || 30, 100);

    const conv = await Conversation.findById(id).lean();
    if (!conv) return res.status(404).json({ message: "Conversation not found" });

    // Access check: must be customer or the shop owner
    const isCustomer = String(conv.customer_id) === String(actorId);
    let isShop = false;
    if (!isCustomer) {
      const shop = await Shop.findOne({ _id: conv.shop_id, owner_id: actorId }).lean();
      isShop = !!shop;
    }
    if (!isCustomer && !isShop) return res.status(403).json({ message: "Forbidden" });

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      Message.find({ conversation_id: id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments({ conversation_id: id }),
    ]);

    // Mark read
    if (isCustomer && conv.unread_customer > 0) {
      await Conversation.updateOne({ _id: id }, { unread_customer: 0 });
      await Message.updateMany({ conversation_id: id, sender_type: "shop", read_at: null }, { read_at: new Date() });
    } else if (isShop && conv.unread_shop > 0) {
      await Conversation.updateOne({ _id: id }, { unread_shop: 0 });
      await Message.updateMany({ conversation_id: id, sender_type: "customer", read_at: null }, { read_at: new Date() });
    }

    res.json({ success: true, data: { messages: messages.reverse(), total, page, limit } });
  } catch (e) { next(e); }
};

// POST /api/conversations/:id/messages  { content, images }
exports.sendMessage = async (req, res, next) => {
  try {
    const actorId = req.userId || req.user?._id;
    const { id }  = req.params;
    const { content = "", images = [] } = req.body;

    if (!content.trim() && images.length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });

    // Determine sender_type
    const isCustomer = String(conv.customer_id) === String(actorId);
    let senderType = "customer";
    if (!isCustomer) {
      const shop = await Shop.findOne({ _id: conv.shop_id, owner_id: actorId }).lean();
      if (!shop) return res.status(403).json({ message: "Forbidden" });
      senderType = "shop";
    }

    const msg = await Message.create({
      conversation_id: id,
      sender_id:       actorId,
      sender_type:     senderType,
      content:         content.trim(),
      images,
    });

    // Update conversation
    if (senderType === "customer") {
      conv.unread_shop++;
    } else {
      conv.unread_customer++;
    }
    conv.last_message    = content.trim() || "[Hình ảnh]";
    conv.last_message_at = new Date();
    await conv.save();

    // Emit realtime events
    const realtime = req.app.get("realtime");
    if (realtime) {
      const targetId = senderType === "customer" ? conv.shop_id : conv.customer_id;

      // Emit to conversation room (both parties if they have the chat open)
      if (realtime.emitToConversation) {
        realtime.emitToConversation(id, "message:new", {
          conversation_id: id,
          message: msg.toObject(),
        });
      }

      // Notify the other party via their user room
      if (realtime.emitToUser) {
        realtime.emitToUser(String(targetId), "chat:new_message", {
          conversation_id: id,
          message: msg.toObject(),
          sender_type: senderType,
        });
      }
    }

    res.json({ success: true, data: msg.toObject() });
  } catch (e) { next(e); }
};

// GET /api/shop/conversations  — list shop's conversations
exports.shopListConversations = async (req, res, next) => {
  try {
    const ownerId = req.userId || req.user?._id;
    const shop = await Shop.findOne({ owner_id: ownerId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const convs = await Conversation.find({ shop_id: shop._id })
      .sort({ last_message_at: -1 })
      .lean();

    const customerIds = [...new Set(convs.map(c => c.customer_id).filter(Boolean))];
    const customers   = await User.find({ _id: { $in: customerIds } }).select("_id name avatar").lean();
    const customerMap = new Map(customers.map(u => [String(u._id), u]));

    const enriched = convs.map(c => ({ ...c, customer: customerMap.get(String(c.customer_id)) || null }));
    res.json({ success: true, data: enriched });
  } catch (e) { next(e); }
};
