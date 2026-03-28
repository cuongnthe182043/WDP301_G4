const Banner = require('../models/Banner');
const FlashSale = require('../models/FlashSale');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Shop = require('../models/Shop');

// ─── Helper: attach shop_name + shop_slug to a product list ────────────────
async function enrichWithShop(products) {
    const shopIds = [...new Set(products.map((p) => p.shop_id).filter(Boolean))];
    if (!shopIds.length) return products;
    const shops = await Shop.find({ _id: { $in: shopIds } }).select("_id shop_name shop_slug shop_logo").lean();
    const shopMap = new Map(shops.map((s) => [s._id, s]));
    return products.map((p) => ({ ...p, shop: shopMap.get(p.shop_id) || null }));
}

async function getActiveBanners() {
    const now = new Date();
    const query = {
        is_active: true,
        $and: [
            { $or: [{ start_date: { $lte: now } }, { start_date: { $exists: false } }] },
            { $or: [{ end_date: { $gte: now } }, { end_date: { $exists: false } }] },
        ],
        position: { $in: ['homepage_top', 'homepage_mid', 'homepage_bottom'] },
    };
    const banners = await Banner.find(query)
        .sort({ position: 1, createdAt: -1 })
        .lean();
    const grouped = {
        homepage_top: [],
        homepage_mid: [],
        homepage_bottom: [],
    };
    for (const b of banners) grouped[b.position]?.push(b);
    return grouped;
}

async function getBrands(limit = 12) {
    return Brand.find({ is_active: true })
        .sort({ name: 1 })
        .limit(limit)
        .lean();
}
async function getActiveFlashSale(limitItems = 200) {
    const now = new Date();

    // Priority 1: prefer currently ACTIVE flash sale (started, not ended, not cancelled)
    // Sort by end_time ascending = soonest-expiring first (most urgency for customer)
    let fs = await FlashSale.findOne({
        status: { $ne: 'cancelled' },
        start_time: { $lte: now },
        end_time: { $gt: now },
    })
        .sort({ end_time: 1 })
        .lean();

    // Priority 2: upcoming flash sale (not started yet)
    if (!fs) {
        fs = await FlashSale.findOne({
            status: { $ne: 'cancelled' },
            start_time: { $gt: now },
            end_time: { $gt: now },
        })
            .sort({ start_time: 1 })
            .lean();
    }

    // Priority 2: fallback — find the most recently ended non-cancelled flash sale with products
    // (handles test data where end_time may already be past)
    if (!fs) {
        fs = await FlashSale.findOne({
            status: { $ne: 'cancelled' },
            'products.0': { $exists: true },
        })
            .sort({ end_time: -1 })
            .lean();
        if (fs) console.log(`[FlashSale] Showing recently-ended sale as fallback: ${fs._id}`);
    }

    if (!fs) {
        console.log('[FlashSale] No valid flash sale found in DB');
        return null;
    }

    // Determine live vs upcoming purely from time
    const isUpcoming = new Date(fs.start_time) > now;
    const isEnded    = new Date(fs.end_time)   <= now;
    console.log(`[FlashSale] Found: ${fs._id} | status: ${fs.status} | upcoming: ${isUpcoming} | ended: ${isEnded} | products: ${fs.products?.length}`);

    // Enrich with product data + shop data (parallel)
    const productIds = fs.products.map((p) => p.product_id);
    const [products, shop] = await Promise.all([
        Product.find({ _id: { $in: productIds } })
            .select('_id name slug images base_price currency rating_avg rating_count sold_count stock_total brand_id category_id status shop_id')
            .lean(),
        Shop.findOne({ $or: [{ _id: fs.shop_id }, { owner_id: fs.shop_id }] })
            .select('_id shop_name shop_slug shop_logo')
            .lean(),
    ]);
    const prodMap = new Map(products.map((p) => [String(p._id), p]));

    const items = fs.products
        .map((item) => {
            const product = prodMap.get(String(item.product_id)) || null;
            const sold    = item.quantity_sold  || 0;
            const total   = item.quantity_total || 0;
            return {
                ...item,
                product,
                name:             product?.name        || item.name || "",
                slug:             product?.slug        || "",
                image:            product?.images?.[0] || "",
                discount_percent: Math.max(0, Math.round((1 - item.flash_price / (item.original_price || item.flash_price)) * 100)),
                remaining:        Math.max(0, total - sold),
                progress:         total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0,
            };
        });

    console.log(`[FlashSale] Enriched items: ${items.length} (products matched: ${products.length}/${productIds.length})`);
    if (!items.length) return null;

    return { ...fs, items, shop: shop || null, _upcoming: isUpcoming, _ended: isEnded };
}

async function getCategoryTree() {
    const parents = await Category.find({ parent_id: null, is_active: true })
        .sort({ name: 1 })
        .lean();
    const parentIds = parents.map((p) => p._id);
    const children = await Category.find({ parent_id: { $in: parentIds }, is_active: true })
        .sort({ name: 1 })
        .lean();
    const childMap = children.reduce((acc, c) => {
        acc[c.parent_id] = acc[c.parent_id] || [];
        acc[c.parent_id].push(c);
        return acc;
    }, {});
    return parents.map((p) => ({ ...p, children: childMap[p._id] || [] }));
}

// services/homeService.js

async function getProductsByRootSlug(rootSlug, limit = 50) {
  // map alias để không phụ thuộc tiếng Anh
  const alias = {
    men: "thoi-trang-nam",
    women: "thoi-trang-nu",
    unisex: "unisex",
  };
  const resolved = alias[rootSlug] || rootSlug;

  const root = await Category.findOne({ slug: resolved, is_active: true }).lean();
  if (!root) return [];

  const descendants = await Category.find({
    $or: [
      { _id: root._id },
      { ancestors: root._id },
      { path: resolved },
    ],
    is_active: true,
  })
    .select("_id")
    .lean();

  const catIds = descendants.map((c) => c._id);

  const products = await Product.find({
    category_id: { $in: catIds },
    status: "active",
  })
    .sort({ is_featured: -1, sold_count: -1, createdAt: -1 })
    .limit(limit)
    .select("_id name slug images base_price currency rating_avg rating_count sold_count stock_total category_id brand_id shop_id")
    .lean();

  return enrichWithShop(products);
}


async function getHomepageData() {
  const [banners, flashSale, categories, men, women, brands, unisex] = await Promise.all([
    getActiveBanners(),
    getActiveFlashSale(),
    getCategoryTree(),
    getProductsByRootSlug("thoi-trang-nam", 50),
    getProductsByRootSlug("thoi-trang-nu", 50),
    getBrands(50),
    getProductsByRootSlug("unisex", 50),
  ]);
  return { banners, flashSale, categories, men, women, brands, unisex };
}


module.exports = {
    getActiveBanners,
    getActiveFlashSale,
    getCategoryTree,
    getProductsByRootSlug,
    getHomepageData,
};