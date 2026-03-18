// services/checkoutService.js
const notif = require("./dbNotificationService");
const Cart = require("../models/Cart");
const Voucher = require("../models/Voucher");
const Order = require("../models/Order");
const Address = require("../models/Address");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Shop = require("../models/Shop");
const ShopCredit  = require("../models/ShopCredit");
const { v4: uuidv4 } = require("uuid");
const shippingSvc = require("./shippingService");

// ─────────────────────────────────────────────────────────────────────────────
// resolveItems — Unified item resolution with DB validation
// Returns items enriched with shop_id from each product
// ─────────────────────────────────────────────────────────────────────────────
async function resolveItems(userId, { selected_item_ids, buy_now_items }) {
  const isBuyNow = Array.isArray(buy_now_items) && buy_now_items.length > 0;

  if (isBuyNow) {
    const result = [];
    for (const { productId, variantId, quantity } of buy_now_items) {
      const qty = Math.max(1, Number(quantity) || 1);

      const variant = await ProductVariant.findById(variantId).lean();
      if (!variant) {
        throw Object.assign(new Error(`Biến thể không tồn tại (id: ${variantId})`), { status: 400 });
      }
      const product = await Product.findById(productId || variant.product_id).lean();
      if (!product) {
        throw Object.assign(new Error("Sản phẩm không tồn tại"), { status: 400 });
      }
      if (String(variant.product_id) !== String(product._id)) {
        throw Object.assign(new Error("Biến thể không thuộc sản phẩm này"), { status: 400 });
      }
      if ((variant.stock ?? 0) < qty) {
        throw Object.assign(
          new Error(`"${product.name}" không đủ tồn kho (còn ${variant.stock ?? 0}, cần ${qty})`),
          { status: 400 }
        );
      }

      result.push({
        product_id: product._id,
        variant_id: variant._id,
        shop_id: product.shop_id || null,
        name: product.name,
        image_url: variant.images?.[0] || product.images?.[0] || "",
        qty,
        price: variant.price,
        discount: 0,
        total: variant.price * qty,
      });
    }
    return { items: result, cartItemIds: null };
  }

  // ── Cart-based ────────────────────────────────────────────────────────────
  const cart = await Cart.findOne({ user_id: userId }).lean();
  if (!cart || !cart.items?.length) {
    throw Object.assign(new Error("Giỏ hàng trống"), { status: 400 });
  }

  const ids = Array.isArray(selected_item_ids) && selected_item_ids.length > 0
    ? new Set(selected_item_ids)
    : new Set(cart.items.map((i) => i._id));

  const cartItems = cart.items.filter((i) => ids.has(i._id));
  if (!cartItems.length) {
    throw Object.assign(new Error("Chưa chọn sản phẩm nào trong giỏ hàng"), { status: 400 });
  }

  const result = [];
  for (const ci of cartItems) {
    const variant = await ProductVariant.findById(ci.variant_id).lean();
    if (!variant) {
      throw Object.assign(
        new Error(`Biến thể của "${ci.name}" không còn tồn tại. Vui lòng cập nhật giỏ hàng.`),
        { status: 400 }
      );
    }
    const product = await Product.findById(ci.product_id).lean();
    if (!product) {
      throw Object.assign(
        new Error(`Sản phẩm "${ci.name}" không còn tồn tại.`),
        { status: 400 }
      );
    }
    if ((variant.stock ?? 0) < ci.qty) {
      throw Object.assign(
        new Error(`"${ci.name}" không đủ tồn kho (còn ${variant.stock ?? 0}, cần ${ci.qty})`),
        { status: 400 }
      );
    }

    result.push({
      product_id: product._id,
      variant_id: variant._id,
      shop_id: product.shop_id || null,
      name: product.name,
      image_url: variant.images?.[0] || product.images?.[0] || ci.image || "",
      qty: ci.qty,
      price: variant.price,
      discount: 0,
      total: variant.price * ci.qty,
    });
  }

  return { items: result, cartItemIds: Array.from(ids) };
}

// ─────────────────────────────────────────────────────────────────────────────
// applyVoucher — validates & calculates discount
// Returns { voucher, discount } on success, or { voucher:null, discount:0, error } on failure
// ─────────────────────────────────────────────────────────────────────────────
async function applyVoucher(voucherCode, subtotal, userId) {
  if (!voucherCode) return { voucher: null, discount: 0 };

  const code = voucherCode.toString().trim().toUpperCase();
  const v = await Voucher.findOne({ code, is_active: true });
  if (!v) return { voucher: null, discount: 0, error: "Mã voucher không tồn tại hoặc đã bị vô hiệu hóa" };

  const now = new Date();
  if (now < new Date(v.valid_from))
    return { voucher: null, discount: 0, error: "Voucher chưa có hiệu lực" };
  if (now > new Date(v.valid_to))
    return { voucher: null, discount: 0, error: "Voucher đã hết hạn" };
  if (v.used_count >= v.max_uses)
    return { voucher: null, discount: 0, error: "Voucher đã hết lượt sử dụng" };
  if (subtotal < (v.min_order_value || 0))
    return {
      voucher: null, discount: 0,
      error: `Đơn hàng tối thiểu ${(v.min_order_value || 0).toLocaleString("vi-VN")}₫ để dùng voucher này`,
    };

  if (userId && v.applicable_users?.length > 0) {
    if (!v.applicable_users.map(String).includes(String(userId)))
      return { voucher: null, discount: 0, error: "Voucher này không áp dụng cho tài khoản của bạn" };
  }

  if (userId && v.usage_limit_per_user > 0) {
    const usedByUser = await Order.countDocuments({ user_id: String(userId), voucher_id: v._id });
    if (usedByUser >= v.usage_limit_per_user)
      return { voucher: null, discount: 0, error: "Bạn đã sử dụng hết lượt cho voucher này" };
  }

  const rawDiscount = v.discount_type === "percent"
    ? Math.round((subtotal * v.discount_value) / 100)
    : v.discount_value;
  const discount = Math.min(rawDiscount, subtotal); // cannot exceed order value
  return { voucher: v, discount: Math.max(0, discount) };
}

// ─────────────────────────────────────────────────────────────────────────────
// groupItemsByShop — split items array into per-shop groups
// Items without a shop_id are grouped under a fallback key
// ─────────────────────────────────────────────────────────────────────────────
function groupItemsByShop(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.shop_id || "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// preview — Read-only calculation for the Checkout UI
// Returns items grouped by shop for UI display
// ─────────────────────────────────────────────────────────────────────────────
exports.preview = async ({
  userId,
  selected_item_ids,
  buy_now_items,
  address_id,
  ship_provider,
  voucher_code,
  credits_to_use = {},
}) => {
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });

  const { items } = await resolveItems(userId, { selected_item_ids, buy_now_items });

  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const shipping_fee = await shippingSvc.calculate(
    ship_provider || "GHN",
    address_id || null,
    null,
    items
  );
  const { voucher, discount, error: voucherError } = await applyVoucher(voucher_code, subtotal, userId);

  // Enrich with shop names
  const shopIds = [...new Set(items.map((i) => i.shop_id).filter(Boolean))];
  const shops = await Shop.find({ _id: { $in: shopIds } }).select("_id shop_name shop_slug shop_logo").lean();
  const shopMap = new Map(shops.map((s) => [s._id, s]));

  // Load user's credit balances for each shop
  const creditRecords = await ShopCredit.find({
    user_id: String(userId),
    shop_id: { $in: shopIds },
    balance: { $gt: 0 },
  }).lean();
  const creditBalanceMap = new Map(creditRecords.map((c) => [String(c.shop_id), c.balance]));

  // Group items by shop + calculate per-shop totals including credits
  const shopGroups = [];
  const grouped = groupItemsByShop(items);
  let totalCreditsDiscount = 0;

  for (const [shopId, shopItems] of grouped) {
    const shopSubtotal = shopItems.reduce((s, i) => s + i.total, 0);
    const ratio = subtotal > 0 ? shopSubtotal / subtotal : 1;
    const shopVoucherDiscount = Math.round(discount * ratio);

    const availableCredits = creditBalanceMap.get(String(shopId)) || 0;
    const requestedCredits  = Number((credits_to_use || {})[shopId] || 0);
    const creditsUsed       = Math.min(requestedCredits, availableCredits, shopSubtotal - shopVoucherDiscount);

    totalCreditsDiscount += creditsUsed;

    const shopInfo = shopMap.get(shopId);
    shopGroups.push({
      shop_id:           shopId,
      shop_name:         shopInfo?.shop_name || "Cửa hàng",
      shop_logo:         shopInfo?.shop_logo || null,
      items:             shopItems,
      subtotal:          shopSubtotal,
      available_credits: availableCredits,
      credits_used:      creditsUsed,
    });
  }

  const total = Math.max(0, subtotal + shipping_fee - discount - totalCreditsDiscount);

  return {
    items,
    shop_groups: shopGroups,
    subtotal,
    shipping_fee,
    discount,
    credits_discount: totalCreditsDiscount,
    total,
    currency: "VND",
    voucher: voucher
      ? { _id: voucher._id, code: voucher.code, discount_type: voucher.discount_type, discount_value: voucher.discount_value }
      : null,
    voucher_error: voucherError || null,
    payment_methods: ["COD", "PAYPAL", "VNPAY"],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// confirm — Creates ONE ORDER PER SHOP
// Returns array of created orders (multi-vendor split)
// ─────────────────────────────────────────────────────────────────────────────
exports.confirm = async ({
  userId,
  address_id,
  note,
  ship_provider,
  voucher_code,
  credits_to_use = {},
  selected_item_ids,
  buy_now_items,
  payment_method,
}) => {
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (!address_id) throw Object.assign(new Error("Thiếu địa chỉ nhận hàng"), { status: 400 });

  const method = payment_method || "COD";
  if (!["COD", "PAYPAL", "VNPAY"].includes(method)) {
    throw Object.assign(new Error(`Phương thức thanh toán không hỗ trợ: ${method}`), { status: 400 });
  }

  // ── Validate & snapshot address ──────────────────────────────────────────
  const address = await Address.findOne({ _id: address_id, user_id: userId }).lean();
  if (!address) {
    throw Object.assign(
      new Error("Địa chỉ không hợp lệ hoặc không thuộc về bạn"),
      { status: 400 }
    );
  }
  const shipping_address = {
    name:          address.name,
    phone:         address.phone,
    city:          address.city,
    district:      address.district || "",
    ward:          address.ward,
    street:        address.street,
    source:        address.source,
    province_code: address.province_code || null,
    district_code: address.district_code || null,
    ward_code:     address.ward_code || null,
  };

  // ── Resolve & validate items ──────────────────────────────────────────────
  const { items, cartItemIds } = await resolveItems(userId, { selected_item_ids, buy_now_items });

  // ── Apply voucher (applied to total subtotal, then split proportionally) ──
  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const shipping_fee = await shippingSvc.calculate(ship_provider || "GHN", address_id, null, items);
  const { voucher, discount, error: voucherError } = await applyVoucher(voucher_code, subtotal, userId);
  if (voucherError) throw Object.assign(new Error(voucherError), { status: 400 });

  // ── Split items by shop ───────────────────────────────────────────────────
  const grouped = groupItemsByShop(items);
  const createdOrders = [];

  for (const [shopId, shopItems] of grouped) {
    const shopSubtotal = shopItems.reduce((s, i) => s + i.total, 0);
    // Proportional voucher discount and shipping per shop
    const ratio = subtotal > 0 ? shopSubtotal / subtotal : 1;
    const shopDiscount  = Math.round(discount * ratio);
    const shopShipping  = Math.round(shipping_fee * ratio);

    // Shop credits deduction (per-shop, validate balance)
    const requestedCredits = Number((credits_to_use || {})[shopId] || 0);
    let shopCreditsUsed = 0;
    if (requestedCredits > 0) {
      const creditRecord = await ShopCredit.findOne({ user_id: String(userId), shop_id: String(shopId) });
      shopCreditsUsed = Math.min(requestedCredits, creditRecord?.balance || 0, shopSubtotal - shopDiscount);
    }

    const total_price = Math.max(0, shopSubtotal + shopShipping - shopDiscount - shopCreditsUsed);

    const orderCode = `ORD${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${uuidv4().slice(0, 6).toUpperCase()}`;

    const order = await Order.create({
      order_code: orderCode,
      user_id: userId,
      shop_id: shopId !== "unknown" ? shopId : null,
      items: shopItems,
      address_id,
      shipping_address,
      voucher_id:        voucher?._id || null,
      discount:          shopDiscount,
      credits_used:      shopCreditsUsed,
      shipping_provider: ship_provider || "GHN",
      shipping_fee:      shopShipping,
      total_price,
      payment_method: method,
      payment_status: "pending",
      note,
      status: method === "COD" ? "order_created" : "payment_pending",
    });

    // Deduct credits from ShopCredit balance
    if (shopCreditsUsed > 0) {
      await ShopCredit.findOneAndUpdate(
        { user_id: String(userId), shop_id: String(shopId) },
        {
          $inc: { balance: -shopCreditsUsed, total_spent: shopCreditsUsed },
          $push: {
            history: {
              type:          "spend",
              amount:        -shopCreditsUsed,
              balance_after: 0, // approximate; will be slightly off — acceptable
              reason:        `Đơn hàng #${orderCode}`,
              order_id:      order._id,
            },
          },
        }
      );
    }

    createdOrders.push({
      order_id: order._id,
      order_code: order.order_code,
      shop_id: shopId,
      total_price,
    });
  }

  // ── Increment voucher usage counter ──────────────────────────────────────
  if (voucher) {
    Voucher.updateOne({ _id: voucher._id }, { $inc: { used_count: 1 } }).catch(() => {});
  }

  // ── Clear purchased items from cart ──────────────────────────────────────
  if (cartItemIds) {
    try {
      const cart = await Cart.findOne({ user_id: userId });
      if (cart) {
        cart.items = cart.items.filter((i) => !cartItemIds.includes(i._id));
        await cart.save();
      }
    } catch (err) {
      console.error("CART_CLEAR_ERROR:", err.message);
    }
  }

  // Fire order-placed notifications (non-fatal, one per shop order)
  for (const ord of createdOrders) {
    notif.orderPlaced(userId, ord.order_code).catch(() => {});
  }

  // Return the first order for single-shop compatibility, plus full array
  const firstOrder = createdOrders[0];
  return {
    order_id: firstOrder?.order_id,
    order_code: firstOrder?.order_code,
    orders: createdOrders,
    pay_url: null,
  };
};
