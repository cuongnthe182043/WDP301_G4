// services/checkoutService.js
const notif = require("./dbNotificationService");
const Cart = require("../models/Cart");
const Voucher = require("../models/Voucher");
const Order = require("../models/Order");
const Address = require("../models/Address");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Shop = require("../models/Shop");
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
// applyVoucher
// ─────────────────────────────────────────────────────────────────────────────
async function applyVoucher(voucherCode, subtotal) {
  if (!voucherCode) return { voucher: null, discount: 0 };
  const v = await Voucher.findOne({ code: voucherCode, is_active: true });
  if (!v) return { voucher: null, discount: 0 };
  const discount = Math.min(
    v.type === "percent" ? Math.round((subtotal * v.value) / 100) : v.value,
    v.max_discount || Infinity
  );
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
  const { voucher, discount } = await applyVoucher(voucher_code, subtotal);
  const total = Math.max(0, subtotal + shipping_fee - discount);

  // Enrich with shop names
  const shopIds = [...new Set(items.map((i) => i.shop_id).filter(Boolean))];
  const shops = await Shop.find({ _id: { $in: shopIds } }).select("_id shop_name shop_slug shop_logo").lean();
  const shopMap = new Map(shops.map((s) => [s._id, s]));

  // Group items by shop
  const shopGroups = [];
  const grouped = groupItemsByShop(items);
  for (const [shopId, shopItems] of grouped) {
    shopGroups.push({
      shop: shopMap.get(shopId) || { _id: shopId, shop_name: "Shop" },
      items: shopItems,
      subtotal: shopItems.reduce((s, i) => s + i.total, 0),
    });
  }

  return {
    items,
    shop_groups: shopGroups,
    subtotal,
    shipping_fee,
    discount,
    total,
    currency: "VND",
    voucher: voucher ? { _id: voucher._id, code: voucher.code } : null,
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
  const { voucher, discount } = await applyVoucher(voucher_code, subtotal);

  // ── Split items by shop ───────────────────────────────────────────────────
  const grouped = groupItemsByShop(items);
  const createdOrders = [];

  for (const [shopId, shopItems] of grouped) {
    const shopSubtotal = shopItems.reduce((s, i) => s + i.total, 0);
    // Proportional discount and shipping per shop
    const ratio = subtotal > 0 ? shopSubtotal / subtotal : 1;
    const shopDiscount = Math.round(discount * ratio);
    const shopShipping = Math.round(shipping_fee * ratio);
    const total_price = Math.max(0, shopSubtotal + shopShipping - shopDiscount);

    const orderCode = `ORD${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${uuidv4().slice(0, 6).toUpperCase()}`;

    const order = await Order.create({
      order_code: orderCode,
      user_id: userId,
      shop_id: shopId !== "unknown" ? shopId : null,
      items: shopItems,
      address_id,
      shipping_address,
      voucher_id: voucher?._id || null,
      shipping_provider: ship_provider || "GHN",
      shipping_fee: shopShipping,
      total_price,
      payment_method: method,
      payment_status: "pending",
      note,
      status: "pending",
    });

    createdOrders.push({
      order_id: order._id,
      order_code: order.order_code,
      shop_id: shopId,
      total_price,
    });
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
