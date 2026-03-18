// services/ghnService.js
//
// GHN (Giao Hàng Nhanh) shipping API integration.
// Sandbox: https://dev-online-gateway.ghn.vn/shiip/public-api/v2/
//
// All calls are wrapped so failures never crash the calling flow.

const axios = require("axios");

const GHN_API_URL = process.env.GHN_API_URL || "https://dev-online-gateway.ghn.vn/shiip/public-api/v2";
const GHN_TOKEN   = process.env.GHN_TOKEN   || "fb35fa85-1f15-11f1-a973-aee5264794df";
const GHN_SHOP_ID = Number(process.env.GHN_SHOP_ID || "2510907");

// Axios instance with GHN auth headers
const ghnClient = axios.create({
  baseURL: GHN_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type":    "application/json",
    "Token":           GHN_TOKEN,
    "ShopId":          String(GHN_SHOP_ID),
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GHN status → internal status mapping
// ─────────────────────────────────────────────────────────────────────────────
const GHN_STATUS_MAP = {
  ready_to_pick:               "processing",
  picking:                     "picking",
  picked:                      "picking",
  cancel:                      "cancelled_by_shop",
  storing:                     "packed",
  transporting:                "in_transit",
  sorting:                     "in_transit",
  delivering:                  "out_for_delivery",
  money_collect_delivering:    "out_for_delivery",
  delivered:                   "delivered",
  delivery_fail:               "delivery_failed",
  waiting_to_return:           "delivery_failed",
  return:                      "delivery_failed",
  returned:                    "delivery_failed",
  exception:                   "delivery_failed",
  lost:                        "delivery_failed",
};

/**
 * Map a GHN status string to our internal order status.
 * Returns null if the GHN status is unrecognised.
 */
function mapGhnStatus(ghnStatus) {
  return GHN_STATUS_MAP[(ghnStatus || "").toLowerCase()] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// createShippingOrder
// Creates a GHN shipping order for an existing platform order.
//
// @param {Object} order  — Mongoose Order document (with .shipping_address)
// @returns {Object}      — GHN response data (order_code, expected_delivery_time, …)
// ─────────────────────────────────────────────────────────────────────────────
async function createShippingOrder(order) {
  const addr = order.shipping_address || {};

  // Validate required GHN address fields before calling API
  const districtId = Number(addr.district_code || 0);
  const wardCode   = String(addr.ward_code || "").trim();

  if (!districtId) {
    throw new Error(
      "Địa chỉ giao hàng thiếu mã quận/huyện (district_code). " +
      "Khách hàng cần cập nhật địa chỉ với đầy đủ thông tin để sử dụng giao hàng nhanh."
    );
  }
  if (!wardCode) {
    throw new Error(
      "Địa chỉ giao hàng thiếu mã phường/xã (ward_code). " +
      "Khách hàng cần cập nhật địa chỉ với đầy đủ thông tin để sử dụng giao hàng nhanh."
    );
  }

  // Determine payment type:
  // 2 = COD (recipient pays shipper) | 1 = prepaid (shop already paid)
  const isCOD = order.payment_method === "COD";
  const payment_type_id = isCOD ? 2 : 1;
  const cod_amount      = isCOD ? Math.round(order.total_price) : 0;

  // Build items list from order items
  const items = (order.items || []).map((it) => ({
    name:     it.name || "Sản phẩm",
    quantity: it.qty  || 1,
    price:    Math.round(it.price || 0),
    weight:   200,
  }));

  const payload = {
    payment_type_id,
    note:           order.note || "",
    required_note:  "KHONGCHOXEM",
    to_name:        addr.name    || "Khách hàng",
    to_phone:       addr.phone   || "0000000000",
    to_address:     [addr.street, addr.ward, addr.district].filter(Boolean).join(", "),
    to_ward_code:   wardCode,
    to_district_id: districtId,
    cod_amount,
    weight:         500,
    length:         20,
    width:          20,
    height:         10,
    service_type_id: 2,
    items,
  };

  console.log(`[GHN] createShippingOrder | order: ${order.order_code} | COD: ${cod_amount}`);
  console.log(`[GHN] payload:`, JSON.stringify(payload, null, 2));

  let response;
  try {
    response = await ghnClient.post("/shipping-order/create", payload);
  } catch (axiosErr) {
    const status  = axiosErr.response?.status;
    const body    = axiosErr.response?.data;
    const headers = axiosErr.response?.headers;
    console.error(`[GHN] HTTP ${status} from GHN API`);
    console.error(`[GHN] Response body:`, JSON.stringify(body, null, 2));
    console.error(`[GHN] Response headers:`, JSON.stringify(headers, null, 2));
    const detail = body?.message || body?.error || axiosErr.message;
    throw new Error(`GHN HTTP ${status}: ${detail}`);
  }

  if (response.data?.code !== 200) {
    const msg = response.data?.message || "GHN API error";
    console.error(`[GHN] createShippingOrder failed | order: ${order.order_code} | msg: ${msg}`);
    console.error(`[GHN] Full response:`, JSON.stringify(response.data, null, 2));
    throw new Error(`GHN: ${msg}`);
  }

  console.log(`[GHN] Created | order: ${order.order_code} | ghn_code: ${response.data.data?.order_code}`);
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelShippingOrder
// Cancels an existing GHN order.
//
// @param {string} ghnCode — GHN order_code
// ─────────────────────────────────────────────────────────────────────────────
async function cancelShippingOrder(ghnCode) {
  console.log(`[GHN] cancelShippingOrder | ghn_code: ${ghnCode}`);
  const response = await ghnClient.post("/switch-status/cancel", {
    order_codes: [ghnCode],
  });

  if (response.data?.code !== 200) {
    const msg = response.data?.message || "GHN cancel error";
    console.error(`[GHN] cancelShippingOrder failed | ghn_code: ${ghnCode} | msg: ${msg}`);
    throw new Error(`GHN cancel: ${msg}`);
  }

  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrderDetail
// Retrieves full order detail + tracking logs from GHN.
// Note: GHN uses POST for this endpoint.
//
// @param {string} ghnCode — GHN order_code
// ─────────────────────────────────────────────────────────────────────────────
async function getOrderDetail(ghnCode) {
  const response = await ghnClient.post("/shipping-order/detail", {
    order_code: ghnCode,
  });

  if (response.data?.code !== 200) {
    const msg = response.data?.message || "GHN detail error";
    throw new Error(`GHN detail: ${msg}`);
  }

  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateFee
// Calculates estimated shipping fee for given destination.
//
// @param {Object} opts — { toDistrictId, toWardCode, weight }
// ─────────────────────────────────────────────────────────────────────────────
async function calculateFee({ toDistrictId, toWardCode, weight = 500 }) {
  const response = await ghnClient.get("/shipping-order/fee", {
    params: {
      service_type_id: 2,
      to_district_id:  Number(toDistrictId),
      to_ward_code:    String(toWardCode),
      weight:          Number(weight),
    },
  });

  if (response.data?.code !== 200) {
    const msg = response.data?.message || "GHN fee error";
    throw new Error(`GHN fee: ${msg}`);
  }

  return response.data.data;
}

module.exports = {
  createShippingOrder,
  cancelShippingOrder,
  getOrderDetail,
  mapGhnStatus,
  calculateFee,
};
