/**
 * seedShopData.js
 *
 * Seeds data for anhdovietvp2003@gmail.com (shop owner):
 *   • Updates user role → shop_owner
 *   • Creates/updates an approved Shop (ANV Fashion)
 *   • Creates Brand "ANV Fashion"
 *   • Creates 8 Categories (tree: Thời Trang → Nam/Nữ/Unisex → leaves)
 *   • Creates 5 Products (Áo sơ mi nam, Quần jean nữ, Đầm wrap, Áo thun, Quần kaki)
 *   • Creates color×size ProductVariants for each product
 *   • Creates ProductSizeCharts with full body measurements for AI size matching
 *
 * Run:  node backend/src/seed/seedShopData.js
 *
 * Idempotent – safe to run multiple times (skips existing docs).
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { connectDB, disconnectDB } = require("../config/db");
const User             = require("../models/User");
const Role             = require("../models/Role");
const Shop             = require("../models/Shop");
const Brand            = require("../models/Brand");
const Category         = require("../models/Category");
const Product          = require("../models/Product");
const ProductVariant   = require("../models/ProductVariant");
const ProductSizeChart = require("../models/ProductSizeChart");

// ─── Tiny helper: insert only if _id not already in collection ────────────────
async function upsertById(Model, id, data) {
  const exists = await Model.findById(id);
  if (exists) {
    console.log(`   ⚙️  ${Model.modelName} [${id}] already exists — skip`);
    return exists;
  }
  // Use raw collection insert to bypass mongoose hooks that might fight us
  // (e.g. Category slug-generation hook)
  try {
    await Model.collection.insertOne({ _id: id, ...data, createdAt: new Date(), updatedAt: new Date() });
    console.log(`   ✅ ${Model.modelName} [${id}] created`);
    return await Model.findById(id);
  } catch (e) {
    if (e.code === 11000) {
      console.log(`   ⚙️  ${Model.modelName} [${id}] dup-key — skip`);
      return await Model.findById(id);
    }
    throw e;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  await connectDB();
  console.log("\n══════════════════════════════════════════════════");
  console.log("  ANV Fashion seed  –  anhdovietvp2003@gmail.com");
  console.log("══════════════════════════════════════════════════\n");

  // ── 1. Find user ─────────────────────────────────────────────────────────
  console.log("① Finding user ...");
  const user = await User.findOne({ email: "anhdovietvp2003@gmail.com" }).lean();
  if (!user) {
    console.error("❌  User not found. Please register the account first.");
    await disconnectDB();
    return;
  }
  console.log(`   ✅ Found: ${user._id}  (${user.name || user.username})`);

  // ── 2. Assign shop_owner role ────────────────────────────────────────────
  console.log("\n② Assigning shop_owner role ...");
  const shopOwnerRole = await Role.findOne({ name: "shop_owner" }).lean();
  const roleId = shopOwnerRole?._id ?? "role-shop_owner";
  await User.updateOne({ _id: user._id }, { role_id: roleId });
  console.log(`   ✅ role_id → ${roleId}`);

  // ── 3. Create / approve Shop ──────────────────────────────────────────────
  console.log("\n③ Creating shop ...");
  let shop = await Shop.findOne({ owner_id: user._id });
  if (!shop) {
    shop = await Shop.create({
      owner_id:     user._id,
      shop_name:    "ANV Fashion",
      shop_slug:    "anv-fashion",
      shop_logo:    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300&h=300&fit=crop",
      banner_url:   "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      description:  "Thời trang ANV – Phong cách hiện đại, chất liệu cao cấp dành cho mọi lứa tuổi. Chuyên cung cấp áo, quần, đầm và phụ kiện thời trang chính hãng Việt Nam.",
      address:      "123 Nguyễn Trãi, Quận 1, TP.HCM",
      phone:        "0901234567",
      email:        "anhdovietvp2003@gmail.com",
      status:       "approved",
      rating_avg:   4.7,
      followers:    128,
    });
    console.log(`   ✅ Shop created: ${shop._id}`);
  } else {
    if (shop.status !== "approved") {
      await Shop.updateOne({ _id: shop._id }, { status: "approved" });
      console.log(`   ⚙️  Shop exists [${shop._id}] — status set to approved`);
    } else {
      console.log(`   ⚙️  Shop already exists [${shop._id}]`);
    }
  }
  const SHOP_ID = shop._id;

  // ── 4. Brand ──────────────────────────────────────────────────────────────
  console.log("\n④ Creating brand ...");
  await upsertById(Brand, "brand-anv-fashion", {
    name:         "ANV Fashion",
    slug:         "anv-fashion-brand",
    country:      "Vietnam",
    gender_focus: "mixed",
    description:  "Thương hiệu thời trang Việt Nam, chú trọng chất lượng và thiết kế hiện đại.",
    logo_url:     "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&h=200&fit=crop",
    is_active:    true,
  });

  // ── 5. Categories (tree: root → mid → leaf) ───────────────────────────────
  console.log("\n⑤ Creating categories ...");

  await upsertById(Category, "cat-thoi-trang", {
    name: "Thời Trang", slug: "thoi-trang",
    level: 0, path: ["thoi-trang"], ancestors: [], children_count: 0, is_active: true,
  });
  await upsertById(Category, "cat-thoi-trang-nam", {
    name: "Thời Trang Nam", slug: "thoi-trang-nam",
    parent_id: "cat-thoi-trang", level: 1, gender_hint: "men",
    path: ["thoi-trang", "thoi-trang-nam"], ancestors: ["cat-thoi-trang"], is_active: true,
  });
  await upsertById(Category, "cat-thoi-trang-nu", {
    name: "Thời Trang Nữ", slug: "thoi-trang-nu",
    parent_id: "cat-thoi-trang", level: 1, gender_hint: "women",
    path: ["thoi-trang", "thoi-trang-nu"], ancestors: ["cat-thoi-trang"], is_active: true,
  });
  await upsertById(Category, "cat-thoi-trang-unisex", {
    name: "Unisex", slug: "thoi-trang-unisex",
    parent_id: "cat-thoi-trang", level: 1, gender_hint: null,
    path: ["thoi-trang", "thoi-trang-unisex"], ancestors: ["cat-thoi-trang"], is_active: true,
  });
  // Leaf categories
  await upsertById(Category, "cat-ao-so-mi-nam", {
    name: "Áo Sơ Mi Nam", slug: "ao-so-mi-nam",
    parent_id: "cat-thoi-trang-nam", level: 2, gender_hint: "men",
    path: ["thoi-trang", "thoi-trang-nam", "ao-so-mi-nam"],
    ancestors: ["cat-thoi-trang", "cat-thoi-trang-nam"], is_active: true,
  });
  await upsertById(Category, "cat-quan-jean-nu", {
    name: "Quần Jean Nữ", slug: "quan-jean-nu",
    parent_id: "cat-thoi-trang-nu", level: 2, gender_hint: "women",
    path: ["thoi-trang", "thoi-trang-nu", "quan-jean-nu"],
    ancestors: ["cat-thoi-trang", "cat-thoi-trang-nu"], is_active: true,
  });
  await upsertById(Category, "cat-dam-nu", {
    name: "Đầm Nữ", slug: "dam-nu",
    parent_id: "cat-thoi-trang-nu", level: 2, gender_hint: "women",
    path: ["thoi-trang", "thoi-trang-nu", "dam-nu"],
    ancestors: ["cat-thoi-trang", "cat-thoi-trang-nu"], is_active: true,
  });
  await upsertById(Category, "cat-ao-thun", {
    name: "Áo Thun", slug: "ao-thun",
    parent_id: "cat-thoi-trang-unisex", level: 2, gender_hint: null,
    path: ["thoi-trang", "thoi-trang-unisex", "ao-thun"],
    ancestors: ["cat-thoi-trang", "cat-thoi-trang-unisex"], is_active: true,
  });
  await upsertById(Category, "cat-quan-kaki-nam", {
    name: "Quần Kaki Nam", slug: "quan-kaki-nam",
    parent_id: "cat-thoi-trang-nam", level: 2, gender_hint: "men",
    path: ["thoi-trang", "thoi-trang-nam", "quan-kaki-nam"],
    ancestors: ["cat-thoi-trang", "cat-thoi-trang-nam"], is_active: true,
  });

  // ── 6. Products, Variants, Size Charts ───────────────────────────────────
  console.log("\n⑥ Creating products, variants, and size charts ...\n");

  const PRODUCTS = [
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCT 1 – Áo Sơ Mi Công Sở Nam
    // ═══════════════════════════════════════════════════════════════════════
    {
      product: {
        _id:          "prod-anv-ao-so-mi-nam",
        name:         "Áo Sơ Mi Công Sở Nam ANV Slim Fit",
        slug:         "ao-so-mi-cong-so-nam-anv-slim-fit",
        category_id:  "cat-ao-so-mi-nam",
        brand_id:     "brand-anv-fashion",
        shop_id:      SHOP_ID,
        base_price:   350000,
        status:       "active",
        is_featured:  true,
        rating_avg:   4.6,
        rating_count: 42,
        sold_count:   215,
        stock_total:  0,              // updated after variants
        variant_dimensions: ["color", "size"],
        description: "<p>Áo sơ mi công sở nam ANV Slim Fit với thiết kế thanh lịch, phù hợp cả công sở lẫn dạo phố. Chất liệu cotton 95% cao cấp, thoáng mát và co giãn nhẹ giúp thoải mái suốt ngày dài.</p><ul><li>Kiểu dáng: Slim Fit, cổ bẻ truyền thống</li><li>Phù hợp: Đi làm, gặp đối tác, tiệc lịch sự</li></ul>",
        detail_info: {
          origin_country: "Vietnam",
          materials:      ["Cotton", "Spandex"],
          material_ratio: { Cotton: 95, Spandex: 5 },
          customization_available: false,
          seasons:        ["spring", "summer", "autumn", "winter"],
          care_instructions: "Giặt máy ≤30 °C, không dùng chất tẩy, phơi nơi thoáng mát.",
        },
        tags:   ["sơ mi", "công sở", "nam", "slim fit", "cotton"],
        images: [
          "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80",
          "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80",
          "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80",
        ],
      },

      // 4 màu × 5 size = 20 variants
      variantsDef: {
        colors: [
          { key: "c0", name: "Trắng",      img: "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&q=80" },
          { key: "c1", name: "Xanh Biển",  img: "https://images.unsplash.com/photo-1612534847738-b3af9bc31f0c?w=400&q=80" },
          { key: "c2", name: "Đen",        img: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80" },
          { key: "c3", name: "Hồng Nhạt",  img: "https://images.unsplash.com/photo-1602810316693-3667c854239a?w=400&q=80" },
        ],
        sizes:  [
          { key: "s0", name: "S",   price: 350000, compareAt: 420000, stock: 20 },
          { key: "s1", name: "M",   price: 350000, compareAt: 420000, stock: 35 },
          { key: "s2", name: "L",   price: 370000, compareAt: 445000, stock: 40 },
          { key: "s3", name: "XL",  price: 380000, compareAt: 456000, stock: 25 },
          { key: "s4", name: "XXL", price: 390000, compareAt: 470000, stock: 15 },
        ],
      },

      sizeChart: {
        _id:         "psz-anv-ao-so-mi-nam",
        brand_id:    "brand-anv-fashion",
        category_id: "cat-ao-so-mi-nam",
        gender:      "men",
        unit:        "cm", weight_unit: "kg", height_unit: "cm",
        notes: "Số đo cơ thể (cm). Đo khi mặc đồ lót mỏng.",
        is_active: true,
        rows: [
          { label: "S",   measurements: { chest: 88,  waist: 76, shoulder: 42, sleeve_length: 59, shirt_length: 72, height_min: 158, height_max: 165, weight_min: 52, weight_max: 62 } },
          { label: "M",   measurements: { chest: 92,  waist: 80, shoulder: 44, sleeve_length: 61, shirt_length: 74, height_min: 163, height_max: 170, weight_min: 60, weight_max: 70 } },
          { label: "L",   measurements: { chest: 96,  waist: 84, shoulder: 46, sleeve_length: 63, shirt_length: 76, height_min: 168, height_max: 175, weight_min: 68, weight_max: 78 } },
          { label: "XL",  measurements: { chest: 100, waist: 88, shoulder: 48, sleeve_length: 65, shirt_length: 78, height_min: 173, height_max: 180, weight_min: 75, weight_max: 88 } },
          { label: "XXL", measurements: { chest: 108, waist: 96, shoulder: 51, sleeve_length: 67, shirt_length: 80, height_min: 178, height_max: 185, weight_min: 85, weight_max: 100 } },
        ],
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCT 2 – Quần Jean Nữ Slim Fit Cao Cổ
    // ═══════════════════════════════════════════════════════════════════════
    {
      product: {
        _id:          "prod-anv-quan-jean-nu",
        name:         "Quần Jean Nữ ANV Slim Fit Cạp Cao",
        slug:         "quan-jean-nu-anv-slim-fit-cap-cao",
        category_id:  "cat-quan-jean-nu",
        brand_id:     "brand-anv-fashion",
        shop_id:      SHOP_ID,
        base_price:   450000,
        status:       "active",
        is_featured:  true,
        rating_avg:   4.8,
        rating_count: 89,
        sold_count:   432,
        stock_total:  0,
        variant_dimensions: ["color", "size"],
        description: "<p>Quần jean nữ slim fit cạp cao, tôn dáng hoàn hảo. Chất liệu denim co giãn 4 chiều thoải mái mọi chuyển động.</p><ul><li>Kiểu dáng: Slim Fit, cạp cao (high-waist)</li><li>Phù hợp: Đi làm, dạo phố, du lịch</li></ul>",
        detail_info: {
          origin_country: "Vietnam",
          materials:      ["Cotton", "Elastane"],
          material_ratio: { Cotton: 98, Elastane: 2 },
          customization_available: false,
          seasons:        ["spring", "autumn", "winter"],
          care_instructions: "Giặt tay hoặc giặt máy nhẹ ≤30 °C, không vắt mạnh.",
        },
        tags:   ["jean", "nữ", "slim fit", "cạp cao", "denim"],
        images: [
          "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80",
          "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=800&q=80",
          "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80",
        ],
      },

      // 3 màu × 6 size = 18 variants
      variantsDef: {
        colors: [
          { key: "c0", name: "Xanh Denim", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80" },
          { key: "c1", name: "Đen",        img: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400&q=80" },
          { key: "c2", name: "Xanh Nhạt",  img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80" },
        ],
        sizes: [
          { key: "s0", name: "25", price: 450000, compareAt: 560000, stock: 12 },
          { key: "s1", name: "26", price: 450000, compareAt: 560000, stock: 18 },
          { key: "s2", name: "27", price: 460000, compareAt: 575000, stock: 25 },
          { key: "s3", name: "28", price: 470000, compareAt: 590000, stock: 22 },
          { key: "s4", name: "29", price: 480000, compareAt: 600000, stock: 15 },
          { key: "s5", name: "30", price: 490000, compareAt: 615000, stock: 10 },
        ],
      },

      sizeChart: {
        _id:         "psz-anv-quan-jean-nu",
        brand_id:    "brand-anv-fashion",
        category_id: "cat-quan-jean-nu",
        gender:      "women",
        unit:        "cm", weight_unit: "kg", height_unit: "cm",
        notes: "Size là waist inch. Bảng dưới là số đo cơ thể tương ứng (cm).",
        is_active: true,
        rows: [
          { label: "25", measurements: { waist: 62, hip: 88,  pant_length: 98,  height_min: 152, height_max: 158, weight_min: 42, weight_max: 50 } },
          { label: "26", measurements: { waist: 65, hip: 91,  pant_length: 99,  height_min: 155, height_max: 162, weight_min: 48, weight_max: 55 } },
          { label: "27", measurements: { waist: 68, hip: 94,  pant_length: 100, height_min: 158, height_max: 165, weight_min: 52, weight_max: 60 } },
          { label: "28", measurements: { waist: 71, hip: 97,  pant_length: 100, height_min: 160, height_max: 167, weight_min: 57, weight_max: 65 } },
          { label: "29", measurements: { waist: 74, hip: 100, pant_length: 101, height_min: 163, height_max: 170, weight_min: 62, weight_max: 70 } },
          { label: "30", measurements: { waist: 77, hip: 103, pant_length: 102, height_min: 165, height_max: 172, weight_min: 67, weight_max: 75 } },
        ],
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCT 3 – Đầm Wrap Nữ Boho Floral
    // ═══════════════════════════════════════════════════════════════════════
    {
      product: {
        _id:          "prod-anv-dam-wrap-nu",
        name:         "Đầm Wrap Nữ ANV Boho Floral",
        slug:         "dam-wrap-nu-anv-boho-floral",
        category_id:  "cat-dam-nu",
        brand_id:     "brand-anv-fashion",
        shop_id:      SHOP_ID,
        base_price:   550000,
        status:       "active",
        is_featured:  false,
        rating_avg:   4.5,
        rating_count: 31,
        sold_count:   178,
        stock_total:  0,
        variant_dimensions: ["color", "size"],
        description: "<p>Đầm wrap phong cách Boho với họa tiết hoa độc đáo. Thiết kế thắt eo tôn dáng, thích hợp đi biển, du lịch hoặc dạo phố mùa hè.</p><ul><li>Chất liệu Viscose mềm mại, thoáng mát</li><li>Phù hợp: Du lịch, đi biển, sự kiện ngoài trời</li></ul>",
        detail_info: {
          origin_country: "Vietnam",
          materials:      ["Viscose"],
          material_ratio: { Viscose: 100 },
          customization_available: false,
          seasons:        ["spring", "summer"],
          care_instructions: "Giặt tay nước lạnh, phơi bóng mát, ủi nhiệt độ thấp.",
        },
        tags:   ["đầm", "wrap", "boho", "nữ", "floral", "mùa hè"],
        images: [
          "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=800&q=80",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
        ],
      },

      // 4 màu × 4 size = 16 variants
      variantsDef: {
        colors: [
          { key: "c0", name: "Đỏ Hoa",       img: "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=400&q=80" },
          { key: "c1", name: "Xanh Olive",    img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80" },
          { key: "c2", name: "Hoa Nhí Vàng",  img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80" },
          { key: "c3", name: "Be Kem",         img: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80" },
        ],
        sizes: [
          { key: "s0", name: "S",  price: 550000, compareAt: 715000, stock: 15 },
          { key: "s1", name: "M",  price: 560000, compareAt: 730000, stock: 28 },
          { key: "s2", name: "L",  price: 570000, compareAt: 745000, stock: 20 },
          { key: "s3", name: "XL", price: 580000, compareAt: 755000, stock: 10 },
        ],
      },

      sizeChart: {
        _id:         "psz-anv-dam-nu",
        brand_id:    "brand-anv-fashion",
        category_id: "cat-dam-nu",
        gender:      "women",
        unit:        "cm", weight_unit: "kg", height_unit: "cm",
        notes: "Đo ngực qua điểm đầy nhất, eo phần nhỏ nhất, mông qua điểm đầy nhất.",
        is_active: true,
        rows: [
          { label: "S",  measurements: { chest: 82, waist: 66, hip: 90,  shoulder: 37.0, shirt_length: 105, height_min: 150, height_max: 160, weight_min: 42, weight_max: 52 } },
          { label: "M",  measurements: { chest: 86, waist: 70, hip: 94,  shoulder: 38.5, shirt_length: 107, height_min: 158, height_max: 165, weight_min: 50, weight_max: 60 } },
          { label: "L",  measurements: { chest: 90, waist: 74, hip: 98,  shoulder: 40.0, shirt_length: 109, height_min: 163, height_max: 170, weight_min: 57, weight_max: 68 } },
          { label: "XL", measurements: { chest: 96, waist: 80, hip: 104, shoulder: 42.0, shirt_length: 111, height_min: 168, height_max: 175, weight_min: 65, weight_max: 78 } },
        ],
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCT 4 – Áo Thun Oversize Unisex Basic
    // ═══════════════════════════════════════════════════════════════════════
    {
      product: {
        _id:          "prod-anv-ao-thun-oversize",
        name:         "Áo Thun Oversize Unisex ANV Basic",
        slug:         "ao-thun-oversize-unisex-anv-basic",
        category_id:  "cat-ao-thun",
        brand_id:     "brand-anv-fashion",
        shop_id:      SHOP_ID,
        base_price:   250000,
        status:       "active",
        is_featured:  true,
        rating_avg:   4.9,
        rating_count: 156,
        sold_count:   812,
        stock_total:  0,
        variant_dimensions: ["color", "size"],
        description: "<p>Áo thun oversize basic ANV – item must-have trong tủ đồ. Cotton compact 220gsm dày dặn, không bai, không nhàu, unisex phù hợp cả nam lẫn nữ.</p><ul><li>Kiểu dáng: Oversize, thân rộng, vai xuôi</li><li>Phù hợp: Dạo phố, thể thao nhẹ, mặc ở nhà</li></ul>",
        detail_info: {
          origin_country: "Vietnam",
          materials:      ["Cotton"],
          material_ratio: { Cotton: 100 },
          customization_available: true,
          seasons:        ["spring", "summer", "autumn"],
          care_instructions: "Giặt máy ≤40 °C, không dùng nước tẩy chứa chlorine.",
        },
        tags:   ["áo thun", "oversize", "unisex", "basic", "cotton"],
        images: [
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
          "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=800&q=80",
          "https://images.unsplash.com/photo-1622445275463-afa2ab738c73?w=800&q=80",
        ],
      },

      // 5 màu × 5 size = 25 variants
      variantsDef: {
        colors: [
          { key: "c0", name: "Trắng",    img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80" },
          { key: "c1", name: "Đen",      img: "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=400&q=80" },
          { key: "c2", name: "Xám Tro",  img: "https://images.unsplash.com/photo-1622445275463-afa2ab738c73?w=400&q=80" },
          { key: "c3", name: "Be Cát",   img: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80" },
          { key: "c4", name: "Xanh Rêu", img: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&q=80" },
        ],
        sizes: [
          { key: "s0", name: "S",   price: 250000, compareAt: 290000, stock: 30 },
          { key: "s1", name: "M",   price: 250000, compareAt: 290000, stock: 50 },
          { key: "s2", name: "L",   price: 260000, compareAt: 300000, stock: 60 },
          { key: "s3", name: "XL",  price: 270000, compareAt: 310000, stock: 40 },
          { key: "s4", name: "XXL", price: 280000, compareAt: 325000, stock: 20 },
        ],
      },

      sizeChart: {
        _id:         "psz-anv-ao-thun-unisex",
        brand_id:    "brand-anv-fashion",
        category_id: "cat-ao-thun",
        gender:      "unisex",
        unit:        "cm", weight_unit: "kg", height_unit: "cm",
        notes: "Áo oversize nên kích thước may lớn hơn nhiều số đo cơ thể. Bảng là số đo cơ thể để gợi ý size.",
        is_active: true,
        rows: [
          { label: "S",   measurements: { chest: 100, shoulder: 47, shirt_length: 68, height_min: 155, height_max: 165, weight_min: 45, weight_max: 60 } },
          { label: "M",   measurements: { chest: 106, shoulder: 50, shirt_length: 70, height_min: 163, height_max: 172, weight_min: 58, weight_max: 72 } },
          { label: "L",   measurements: { chest: 112, shoulder: 53, shirt_length: 72, height_min: 170, height_max: 178, weight_min: 68, weight_max: 83 } },
          { label: "XL",  measurements: { chest: 118, shoulder: 56, shirt_length: 74, height_min: 176, height_max: 183, weight_min: 78, weight_max: 93 } },
          { label: "XXL", measurements: { chest: 126, shoulder: 59, shirt_length: 76, height_min: 180, height_max: 188, weight_min: 88, weight_max: 105 } },
        ],
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCT 5 – Quần Kaki Nam Slim Chino
    // ═══════════════════════════════════════════════════════════════════════
    {
      product: {
        _id:          "prod-anv-quan-kaki-nam",
        name:         "Quần Kaki Nam ANV Slim Chino",
        slug:         "quan-kaki-nam-anv-slim-chino",
        category_id:  "cat-quan-kaki-nam",
        brand_id:     "brand-anv-fashion",
        shop_id:      SHOP_ID,
        base_price:   420000,
        status:       "active",
        is_featured:  false,
        rating_avg:   4.4,
        rating_count: 58,
        sold_count:   295,
        stock_total:  0,
        variant_dimensions: ["color", "size"],
        description: "<p>Quần kaki nam slim chino ANV – lịch lãm, dễ phối đồ. Cotton kaki cao cấp co giãn nhẹ, thoải mái vận động.</p><ul><li>Kiểu dáng: Slim Fit, cắt gọn ôm chân</li><li>Phù hợp: Công sở, dạo phố, dã ngoại</li></ul>",
        detail_info: {
          origin_country: "Vietnam",
          materials:      ["Cotton", "Elastane"],
          material_ratio: { Cotton: 97, Elastane: 3 },
          customization_available: false,
          seasons:        ["spring", "autumn", "winter"],
          care_instructions: "Giặt máy 30 °C, lộn trái trước khi giặt, không dùng chất tẩy, ủi mặt trái.",
        },
        tags:   ["kaki", "chino", "nam", "slim fit", "công sở"],
        images: [
          "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80",
          "https://images.unsplash.com/photo-1594938298603-c8148c4b4e41?w=800&q=80",
          "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=800&q=80",
        ],
      },

      // 4 màu × 5 size = 20 variants
      variantsDef: {
        colors: [
          { key: "c0", name: "Be Kem",    img: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80" },
          { key: "c1", name: "Olive",     img: "https://images.unsplash.com/photo-1594938298603-c8148c4b4e41?w=400&q=80" },
          { key: "c2", name: "Navy",      img: "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400&q=80" },
          { key: "c3", name: "Nâu Đất",   img: "https://images.unsplash.com/photo-1624378515195-cd73ebf23f11?w=400&q=80" },
        ],
        sizes: [
          { key: "s0", name: "28", price: 420000, compareAt: 505000, stock: 15 },
          { key: "s1", name: "30", price: 430000, compareAt: 516000, stock: 25 },
          { key: "s2", name: "32", price: 440000, compareAt: 528000, stock: 30 },
          { key: "s3", name: "34", price: 450000, compareAt: 540000, stock: 20 },
          { key: "s4", name: "36", price: 460000, compareAt: 552000, stock: 12 },
        ],
      },

      sizeChart: {
        _id:         "psz-anv-quan-kaki-nam",
        brand_id:    "brand-anv-fashion",
        category_id: "cat-quan-kaki-nam",
        gender:      "men",
        unit:        "cm", weight_unit: "kg", height_unit: "cm",
        notes: "Size là số đo waist inch. Bảng là số đo cơ thể tương ứng (cm).",
        is_active: true,
        rows: [
          { label: "28", measurements: { waist: 71, hip: 90,  pant_length: 100, height_min: 158, height_max: 166, weight_min: 52, weight_max: 62 } },
          { label: "30", measurements: { waist: 76, hip: 95,  pant_length: 102, height_min: 163, height_max: 171, weight_min: 60, weight_max: 72 } },
          { label: "32", measurements: { waist: 81, hip: 100, pant_length: 103, height_min: 168, height_max: 176, weight_min: 68, weight_max: 80 } },
          { label: "34", measurements: { waist: 86, hip: 105, pant_length: 104, height_min: 173, height_max: 180, weight_min: 76, weight_max: 90 } },
          { label: "36", measurements: { waist: 91, hip: 110, pant_length: 105, height_min: 177, height_max: 185, weight_min: 85, weight_max: 100 } },
        ],
      },
    },
  ];

  // ── 7. Insert each product + its variants + size chart ────────────────────
  let insertedCount = 0;

  for (const { product, variantsDef, sizeChart } of PRODUCTS) {
    console.log(`\n  📦 ${product.name}`);

    // ── Build variants list from definition ──────────────────────────────
    const variants = [];
    for (const c of variantsDef.colors) {
      for (const s of variantsDef.sizes) {
        variants.push({
          _id:                 `var-${product._id.replace("prod-", "")}-${c.key}-${s.key}`,
          product_id:          product._id,
          shop_id:             SHOP_ID,
          sku:                 `${product._id.replace("prod-anv-", "").toUpperCase().replace(/-/g,"")}-${c.key.toUpperCase()}${s.key.toUpperCase()}`,
          variant_attributes:  { color: c.name, size: s.name },
          price:               s.price,
          compare_at_price:    s.compareAt,
          stock:               s.stock,
          images:              [c.img],
          is_active:           true,
        });
      }
    }

    const stockTotal = variants.reduce((acc, v) => acc + v.stock, 0);

    // ── Product ──────────────────────────────────────────────────────────
    const existingProd = await Product.findById(product._id);
    if (!existingProd) {
      await Product.collection.insertOne({
        ...product,
        stock_total: stockTotal,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`     ✅ Product created (stock_total: ${stockTotal})`);
      insertedCount++;
    } else {
      // Keep it active & linked to current shop
      await Product.updateOne({ _id: product._id }, {
        $set: { shop_id: SHOP_ID, status: "active", stock_total: stockTotal, updatedAt: new Date() },
      });
      console.log(`     ⚙️  Product exists — refreshed shop_id + stock_total`);
    }

    // ── Variants ─────────────────────────────────────────────────────────
    let newVars = 0;
    for (const v of variants) {
      const existsVar = await ProductVariant.findById(v._id);
      if (!existsVar) {
        await ProductVariant.collection.insertOne({ ...v, createdAt: new Date(), updatedAt: new Date() });
        newVars++;
      }
    }
    console.log(`     ✅ Variants: ${newVars} created, ${variants.length - newVars} already existed`);

    // ── Size chart ───────────────────────────────────────────────────────
    const existingSz = await ProductSizeChart.findById(sizeChart._id);
    if (!existingSz) {
      await ProductSizeChart.collection.insertOne({ ...sizeChart, createdAt: new Date(), updatedAt: new Date() });
      console.log(`     ✅ Size chart created (${sizeChart.rows.length} rows)`);
    } else {
      // Always refresh rows in case measurements were improved
      await ProductSizeChart.updateOne({ _id: sizeChart._id }, { $set: { rows: sizeChart.rows, updatedAt: new Date() } });
      console.log(`     ⚙️  Size chart exists — rows refreshed`);
    }
  }

  // ── 8. Update shop total_products ─────────────────────────────────────────
  const totalProds = await Product.countDocuments({ shop_id: SHOP_ID, status: "active" });
  await Shop.updateOne({ _id: SHOP_ID }, { total_products: totalProds });
  console.log(`\n  🔄 shop.total_products → ${totalProds}`);

  console.log("\n══════════════════════════════════════════════════");
  console.log(`  ✅  Seed completed!`);
  console.log(`      Shop:     ANV Fashion  [${SHOP_ID}]`);
  console.log(`      Brand:    brand-anv-fashion`);
  console.log(`      Cats:     9 (tree with 5 leaf nodes)`);
  console.log(`      Products: ${PRODUCTS.length}  (${PRODUCTS.reduce((a,p)=>a+p.variantsDef.colors.length*p.variantsDef.sizes.length,0)} total variants)`);
  console.log("══════════════════════════════════════════════════\n");

  await disconnectDB();
}

run().catch(err => {
  console.error("❌ Fatal error during seed:", err);
  process.exit(1);
});
