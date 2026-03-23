const ExcelJS = require("exceljs");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const { v4: uuidv4 } = require("uuid");

/* ── Vietnamese slug helper ───────────────────────────────────────── */
function slugifyVi(str = "") {
  const map = {
    à:"a",á:"a",â:"a",ã:"a",ä:"a",å:"a",
    ă:"a",ắ:"a",ặ:"a",ằ:"a",ẳ:"a",ẵ:"a",
    â:"a",ấ:"a",ậ:"a",ầ:"a",ẩ:"a",ẫ:"a",
    è:"e",é:"e",ê:"e",ë:"e",
    ế:"e",ệ:"e",ề:"e",ể:"e",ễ:"e",
    ì:"i",í:"i",î:"i",ï:"i",
    ò:"o",ó:"o",ô:"o",õ:"o",ö:"o",ø:"o",
    ố:"o",ộ:"o",ồ:"o",ổ:"o",ỗ:"o",
    ơ:"o",ớ:"o",ợ:"o",ờ:"o",ở:"o",ỡ:"o",
    ù:"u",ú:"u",û:"u",ü:"u",
    ư:"u",ứ:"u",ự:"u",ừ:"u",ử:"u",ữ:"u",
    ỳ:"y",ý:"y",ỵ:"y",ỷ:"y",ỹ:"y",
    đ:"d",
    ñ:"n",
  };
  return str
    .toLowerCase()
    .split("")
    .map(c => map[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ── Parse cell value to clean number ────────────────────────────── */
function toNumber(val) {
  if (val === null || val === undefined || val === "") return NaN;
  // If it's already a number type from Excel, use it directly
  if (typeof val === "number") return val;
  // Otherwise parse string — strip commas, dots used as thousand-separators
  const cleaned = val.toString().replace(/[,\s]/g, "").replace(/\.(?=\d{3})/g, "");
  return Number(cleaned);
}

/* ── Strip " *" suffix from header keys ─────────────────────────── */
function normalizeHeaderKey(raw) {
  return raw
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s*\*+\s*$/, "") // remove trailing asterisks
    .trim();
}

/* ── Ensure unique slug for a Product ───────────────────────────── */
async function uniqueSlug(base) {
  let slug = `${base}-${Date.now()}`;
  let conflict = await Product.findOne({ slug });
  let attempt = 0;
  while (conflict) {
    slug = `${base}-${Date.now()}-${++attempt}`;
    conflict = await Product.findOne({ slug });
  }
  return slug;
}

/* ── Upsert category (with slug) ────────────────────────────────── */
async function resolveCategory(catName) {
  if (!catName) catName = "Chưa phân loại";
  const slug = slugifyVi(catName);
  const cat = await Category.findOneAndUpdate(
    { name: catName },
    { $setOnInsert: { name: catName, slug, is_active: true } },
    { upsert: true, new: true }
  );
  return cat._id;
}

/* ── Upsert brand (with slug) ────────────────────────────────────── */
async function resolveBrand(brandName) {
  if (!brandName) return undefined;
  const slug = slugifyVi(brandName);
  // Slug must be unique — if slug conflicts, append short uuid
  let finalSlug = slug;
  const existing = await Brand.findOne({ slug, name: { $ne: brandName } });
  if (existing) finalSlug = `${slug}-${uuidv4().slice(0, 6)}`;
  const brand = await Brand.findOneAndUpdate(
    { name: brandName },
    { $setOnInsert: { name: brandName, slug: finalSlug, is_active: true, country: "unknown" } },
    { upsert: true, new: true }
  );
  return brand._id;
}

/**
 * Import products from an Excel buffer.
 * @param {Buffer} buffer   - raw xlsx buffer
 * @param {string} shopId   - shop _id
 */
exports.importProductsFromExcel = async (buffer, shopId) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("File Excel không có dữ liệu");

  /* ── Map header name → column index (strip " *" suffix) ── */
  const header = {};
  ws.getRow(1).eachCell((cell, col) => {
    if (!cell.value) return;
    const key = normalizeHeaderKey(cell.value);
    if (key) header[key] = col;
  });

  /* ── Validate required columns ── */
  const REQUIRED = ["name", "sku", "price", "stock"];
  const missing = REQUIRED.filter(k => !header[k]);
  if (missing.length > 0) {
    throw new Error(
      `Thiếu cột bắt buộc: ${missing.map(k => `"${k}"`).join(", ")}. ` +
      `Hãy tải lại template để xem định dạng đúng.`
    );
  }

  const VARIANT_DIMS = ["color", "size", "material_variant", "pattern", "fit"];
  const errors = [];
  const created = [];

  for (let r = 2; r <= ws.actualRowCount; r++) {
    const row = ws.getRow(r);

    /* ── Skip completely empty rows ── */
    const name = row.getCell(header["name"])?.value?.toString().trim();
    if (!name) continue;

    /* ── Name validation ── */
    if (name.length > 200) {
      errors.push(`Dòng ${r}: Tên sản phẩm quá dài (tối đa 200 ký tự)`);
      continue;
    }

    /* ── SKU ── */
    const rawSku = row.getCell(header["sku"])?.value?.toString().trim();
    const sku = rawSku || `sku-${uuidv4().slice(0, 8)}`;

    /* ── Price ── */
    const rawPrice = row.getCell(header["price"])?.value;
    const price = toNumber(rawPrice);
    if (isNaN(price) || price <= 0) {
      errors.push(`Dòng ${r}: Giá không hợp lệ ("${rawPrice}") — phải là số nguyên dương`);
      continue;
    }

    /* ── Stock ── */
    const rawStock = row.getCell(header["stock"])?.value;
    const stock = toNumber(rawStock);
    if (isNaN(stock) || stock < 0) {
      errors.push(`Dòng ${r}: Tồn kho không hợp lệ ("${rawStock}") — phải >= 0`);
      continue;
    }

    /* ── Optional fields ── */
    const description = header["description"]
      ? row.getCell(header["description"])?.value?.toString().trim() || ""
      : "";
    const catName   = header["category"]
      ? row.getCell(header["category"])?.value?.toString().trim() || ""
      : "";
    const brandName = header["brand"]
      ? row.getCell(header["brand"])?.value?.toString().trim() || ""
      : "";
    const imagesCsv = header["images"]
      ? row.getCell(header["images"])?.value?.toString().trim() || ""
      : "";

    /* ── Resolve category (always required — fallback to "Chưa phân loại") ── */
    let category_id;
    try {
      category_id = await resolveCategory(catName || null);
    } catch (e) {
      errors.push(`Dòng ${r}: Không thể tạo danh mục "${catName}" — ${e.message}`);
      continue;
    }

    /* ── Resolve brand ── */
    let brand_id;
    if (brandName) {
      try {
        brand_id = await resolveBrand(brandName);
      } catch (e) {
        errors.push(`Dòng ${r}: Không thể tạo thương hiệu "${brandName}" — ${e.message}`);
        continue;
      }
    }

    /* ── Images ── */
    const images = imagesCsv
      ? imagesCsv.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    /* ── Variant dimension values ── */
    const variantDims = [];
    const variantValuesMap = {};
    for (const dim of VARIANT_DIMS) {
      if (header[dim]) {
        const raw = row.getCell(header[dim])?.value?.toString().trim();
        if (raw) {
          const vals = raw.split(",").map(s => s.trim()).filter(Boolean);
          if (vals.length > 0) {
            variantDims.push(dim);
            variantValuesMap[dim] = vals;
          }
        }
      }
    }

    /* ── Unique slug ── */
    const baseSlug = slugifyVi(name) || `product-${uuidv4().slice(0, 8)}`;
    let slug;
    try {
      slug = await uniqueSlug(baseSlug);
    } catch (e) {
      errors.push(`Dòng ${r}: Lỗi tạo slug — ${e.message}`);
      continue;
    }

    /* ── Create product ── */
    let prod;
    try {
      prod = await Product.create({
        name,
        slug,
        shop_id: shopId,
        base_price: price,
        description,
        images,
        category_id,
        brand_id,
        status: "pending",
        variant_dimensions: variantDims,
        variant_values: Object.keys(variantValuesMap).length ? variantValuesMap : undefined,
        stock_total: 0,
      });
    } catch (e) {
      errors.push(`Dòng ${r}: Lỗi tạo sản phẩm "${name}" — ${e.message}`);
      continue;
    }

    /* ── Create variants ── */
    try {
      if (variantDims.length > 0) {
        const dimEntries = variantDims.map(d => variantValuesMap[d]);
        const combos = cartesian(dimEntries);
        const perVariant = combos.length > 0 ? Math.floor(stock / combos.length) : 0;
        const remainder  = stock - perVariant * combos.length;

        const variantRows = combos.map((combo, i) => {
          const attrs = {};
          variantDims.forEach((d, j) => { attrs[d] = combo[j]; });
          // Prefix variant SKU with product SKU to guarantee global uniqueness
          const variantSku = i === 0 ? sku : `${sku}-v${i + 1}`;
          return {
            product_id: prod._id,
            shop_id: shopId,
            sku: variantSku,
            price,
            stock: perVariant + (i === 0 ? remainder : 0),
            variant_attributes: attrs,
            is_active: true,
          };
        });

        // ordered:false → continue inserting even if some SKUs already exist
        const result = await ProductVariant.insertMany(variantRows, { ordered: false });
        await Product.findByIdAndUpdate(prod._id, { stock_total: stock });
        created.push({ product_id: prod._id, name, sku, variants: result.length });
      } else {
        // No variant dimensions — single variant
        await ProductVariant.create({
          product_id: prod._id,
          shop_id: shopId,
          sku,
          price,
          stock,
          variant_attributes: {},
          is_active: true,
        });
        await Product.findByIdAndUpdate(prod._id, { stock_total: stock });
        created.push({ product_id: prod._id, name, sku, variants: 1 });
      }
    } catch (e) {
      // Partial variant insert errors (duplicate SKU etc.) — still count product as created
      const msg = e.writeErrors
        ? `${e.result?.insertedCount || 0}/${e.insertedCount || "?"} biến thể được thêm (một số SKU trùng lặp)`
        : e.message;
      errors.push(`Dòng ${r}: Sản phẩm "${name}" đã tạo nhưng có lỗi biến thể — ${msg}`);
      created.push({ product_id: prod._id, name, sku, variants: 0 });
    }
  }

  return { inserted: created.length, errors, items: created };
};

/* ── Generate downloadable Excel template ──────────────────────── */
exports.generateTemplate = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Web-Ecommerces-AI";
  wb.created = new Date();

  /* ═══════════════════════════════════════════════════════════════
     Sheet 1 — Sản phẩm
  ═══════════════════════════════════════════════════════════════ */
  const ws = wb.addWorksheet("Sản phẩm", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1, activeCell: "A2" }],
    properties: { defaultRowHeight: 20 },
  });

  // Column definitions — header values are PLAIN so the importer matches exactly.
  // Required columns visually marked by red header fill.
  const cols = [
    { header: "name",             key: "name",             width: 32, required: true,  note: "Tên sản phẩm (bắt buộc, tối đa 200 ký tự)" },
    { header: "sku",              key: "sku",              width: 18, required: true,  note: "Mã SKU sản phẩm (bắt buộc, duy nhất)" },
    { header: "price",            key: "price",            width: 14, required: true,  note: "Giá bán VND — số nguyên dương (vd: 199000)" },
    { header: "stock",            key: "stock",            width: 10, required: true,  note: "Tổng tồn kho — số nguyên >= 0" },
    { header: "description",      key: "description",      width: 42, required: false, note: "Mô tả sản phẩm (tùy chọn)" },
    { header: "category",         key: "category",         width: 22, required: false, note: "Tên danh mục — tự tạo nếu chưa có; bỏ trống → 'Chưa phân loại'" },
    { header: "brand",            key: "brand",            width: 22, required: false, note: "Tên thương hiệu — tự tạo nếu chưa có (tùy chọn)" },
    { header: "images",           key: "images",           width: 50, required: false, note: "URL ảnh, nhiều ảnh cách nhau bằng dấu phẩy (tùy chọn)" },
    { header: "color",            key: "color",            width: 26, required: false, note: "Màu sắc, cách nhau bằng dấu phẩy (vd: Đỏ,Xanh,Đen)" },
    { header: "size",             key: "size",             width: 20, required: false, note: "Kích cỡ, cách nhau bằng dấu phẩy (vd: S,M,L,XL hoặc 28,30,32)" },
    { header: "material_variant", key: "material_variant", width: 26, required: false, note: "Biến thể chất liệu, cách nhau bằng dấu phẩy (vd: Cotton,Linen)" },
    { header: "pattern",          key: "pattern",          width: 24, required: false, note: "Biến thể họa tiết, cách nhau bằng dấu phẩy (vd: Trơn,Kẻ sọc)" },
    { header: "fit",              key: "fit",              width: 22, required: false, note: "Biến thể dáng, cách nhau bằng dấu phẩy (vd: Slim fit,Regular fit)" },
  ];

  ws.columns = cols.map(({ header, key, width }) => ({ header, key, width }));

  /* ── Style header row ── */
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell, col) => {
    const colDef = cols[col - 1];
    const isReq  = colDef?.required ?? false;
    cell.font      = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: isReq ? "FFDC2626" : "FF4F46E5" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border    = {
      top:    { style: "thin", color: { argb: "FFCCCCCC" } },
      left:   { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "medium", color: { argb: "FF888888" } },
      right:  { style: "thin", color: { argb: "FFCCCCCC" } },
    };
    // No cell.note — ExcelJS notes/comments cause internal errors in some versions
  });

  /* ── Data validation for price & stock (apply directly to specific cells) ── */
  const PRICE_COL = cols.findIndex(c => c.key === "price") + 1;  // 1-based
  const STOCK_COL = cols.findIndex(c => c.key === "stock") + 1;
  const colLetter = (n) => String.fromCharCode(64 + n); // 1→A, 2→B ...
  const priceLetter = colLetter(PRICE_COL);
  const stockLetter = colLetter(STOCK_COL);

  // Apply data validation to rows 2–100 by setting it on each cell individually
  for (let r = 2; r <= 100; r++) {
    ws.getCell(`${priceLetter}${r}`).dataValidation = {
      type: "whole", operator: "greaterThan", formulae: [0],
      showErrorMessage: true,
      errorTitle: "Giá không hợp lệ",
      error: "Vui lòng nhập số nguyên dương (vd: 199000)",
    };
    ws.getCell(`${priceLetter}${r}`).numFmt = "#,##0";
    ws.getCell(`${stockLetter}${r}`).dataValidation = {
      type: "whole", operator: "greaterThanOrEqual", formulae: [0],
      showErrorMessage: true,
      errorTitle: "Tồn kho không hợp lệ",
      error: "Vui lòng nhập số nguyên >= 0",
    };
  }

  /* ── Sample data ── */
  const samples = [
    // Row 2 — áo thun với color + size
    {
      name:             "Áo thun nam basic",
      sku:              "ATN-001",
      price:            199000,
      stock:            60,
      description:      "Áo thun nam cổ tròn chất liệu cotton 100%, thoáng mát",
      category:         "Áo thun",
      brand:            "ANV Fashion",
      images:           "",
      color:            "Trắng,Đen,Xám",
      size:             "S,M,L,XL",
      material_variant: "",
      pattern:          "",
      fit:              "",
    },
    // Row 3 — quần jeans với color + size + fit
    {
      name:             "Quần jeans slim fit",
      sku:              "QJ-002",
      price:            450000,
      stock:            40,
      description:      "Quần jeans nam form slim fit, co giãn 4 chiều",
      category:         "Quần jeans",
      brand:            "ANV Fashion",
      images:           "",
      color:            "Xanh đậm,Đen",
      size:             "28,30,32,34",
      material_variant: "",
      pattern:          "",
      fit:              "Slim fit,Regular fit",
    },
    // Row 4 — sản phẩm đơn giản không có biến thể
    {
      name:             "Mũ bucket unisex",
      sku:              "MU-003",
      price:            120000,
      stock:            25,
      description:      "Mũ bucket thời trang unisex, chất liệu canvas",
      category:         "Phụ kiện",
      brand:            "ANV Fashion",
      images:           "",
      color:            "",
      size:             "",
      material_variant: "",
      pattern:          "",
      fit:              "",
    },
  ];

  samples.forEach((data) => ws.addRow(data));

  /* ── Style data rows ── */
  const ROW_FILLS = ["FFFFFFFF", "FFF0F4FF", "FFFFFFFF"];
  for (let r = 2; r <= 4; r++) {
    const row = ws.getRow(r);
    row.height = 22;
    const fill = ROW_FILLS[r - 2];
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        right:  { style: "thin", color: { argb: "FFEEEEEE" } },
      };
      cell.alignment = { vertical: "middle", wrapText: false };
      if (fill !== "FFFFFFFF") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      }
    });
    // Ensure price cells show number format
    const priceCell = row.getCell("price");
    priceCell.numFmt = "#,##0";
  }

  /* ── Alternating row shading for input rows 5–50 ── */
  // Only set fill on even rows; odd rows left transparent (default white)
  for (let r = 5; r <= 50; r += 2) {
    for (let c = 1; c <= cols.length; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F9FA" } };
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     Sheet 2 — Hướng dẫn
  ═══════════════════════════════════════════════════════════════ */
  const wsInfo = wb.addWorksheet("Hướng dẫn");
  wsInfo.views = [{ showGridLines: false }];
  wsInfo.getColumn(1).width = 28;
  wsInfo.getColumn(2).width = 72;

  const sections = [
    // Title
    { cells: ["HƯỚNG DẪN NHẬP SẢN PHẨM BẰNG EXCEL", ""], isTitleRow: true },
    { cells: ["", ""], isBlank: true },

    // Column table header
    { cells: ["Tên cột", "Mô tả & Quy tắc"], isTableHead: true },

    // Required columns
    { cells: ["name  ★ bắt buộc",    "Tên sản phẩm — tối đa 200 ký tự. Không được để trống."],           isRequired: true },
    { cells: ["sku  ★ bắt buộc",     "Mã SKU sản phẩm — phải duy nhất trong toàn bộ file."],               isRequired: true },
    { cells: ["price  ★ bắt buộc",   "Giá bán (VND) — số nguyên dương, không dùng dấu phân cách."],        isRequired: true },
    { cells: ["stock  ★ bắt buộc",   "Tổng tồn kho — số nguyên >= 0. Được chia đều cho các biến thể."],    isRequired: true },

    // Optional columns
    { cells: ["description",          "Mô tả chi tiết sản phẩm (tùy chọn)."] },
    { cells: ["category",             "Tên danh mục. Tự động tạo mới nếu chưa tồn tại. Bỏ trống → 'Chưa phân loại'."] },
    { cells: ["brand",                "Tên thương hiệu. Tự động tạo mới nếu chưa tồn tại (tùy chọn)."] },
    { cells: ["images",               "URL ảnh sản phẩm. Nhiều ảnh cách nhau bằng dấu phẩy (tùy chọn)."] },
    { cells: ["color",                "Danh sách màu sắc, cách nhau bằng dấu phẩy.  Ví dụ: Đỏ,Xanh,Đen"] },
    { cells: ["size",                 "Danh sách kích cỡ, cách nhau bằng dấu phẩy.  Ví dụ: S,M,L,XL  hoặc  28,30,32"] },
    { cells: ["material_variant",     "Biến thể chất liệu, cách nhau bằng dấu phẩy.  Ví dụ: Cotton,Linen,Polyester"] },
    { cells: ["pattern",              "Biến thể họa tiết, cách nhau bằng dấu phẩy.  Ví dụ: Trơn,Kẻ sọc,Hoa văn"] },
    { cells: ["fit",                  "Biến thể dáng, cách nhau bằng dấu phẩy.  Ví dụ: Slim fit,Regular fit,Oversize"] },

    { cells: ["", ""], isBlank: true },

    // Notes section
    { cells: ["LƯU Ý QUAN TRỌNG", ""], isNoteHead: true },
    { cells: ["Cột màu đỏ",       "Bắt buộc — không được để trống"] },
    { cells: ["Cột màu xanh",     "Tùy chọn — có thể bỏ qua"] },
    { cells: ["Biến thể",         "Hệ thống tự tạo TẤT CẢ tổ hợp. Ví dụ: 3 màu × 4 size = 12 biến thể"] },
    { cells: ["Phân bổ tồn kho",  "Giá trị 'stock' được chia đều cho tất cả biến thể"] },
    { cells: ["SKU biến thể",     "Biến thể 1 dùng SKU gốc, biến thể 2+ thêm hậu tố -v2, -v3, ..."] },
    { cells: ["Trạng thái",       "Sản phẩm mới tạo ở trạng thái 'Chờ duyệt'"] },
    { cells: ["Mỗi dòng",         "= 1 sản phẩm"] },
  ];

  sections.forEach(({ cells, isTitleRow, isTableHead, isRequired, isNoteHead, isBlank }) => {
    if (isBlank) { wsInfo.addRow([""]); return; }
    const wsRow = wsInfo.addRow(cells);
    wsRow.height = 22;

    if (isTitleRow) {
      wsInfo.mergeCells(`A${wsRow.number}:B${wsRow.number}`);
      wsRow.getCell(1).font      = { bold: true, size: 14, color: { argb: "FF1E1B4B" } };
      wsRow.getCell(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
      wsRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      wsRow.height = 32;
    } else if (isTableHead) {
      [1, 2].forEach(c => {
        wsRow.getCell(c).font      = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
        wsRow.getCell(c).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
        wsRow.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
        wsRow.getCell(c).border    = { bottom: { style: "medium", color: { argb: "FF3730A3" } } };
      });
    } else if (isRequired) {
      wsRow.getCell(1).font = { bold: true, color: { argb: "FFDC2626" } };
      wsRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
      wsRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
    } else if (isNoteHead) {
      wsInfo.mergeCells(`A${wsRow.number}:B${wsRow.number}`);
      wsRow.getCell(1).font      = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      wsRow.getCell(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
      wsRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    } else {
      // Alternating light fill for readability
      const isEven = wsRow.number % 2 === 0;
      if (isEven) {
        wsRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        wsRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }
    }

    [1, 2].forEach(c => {
      const cell = wsRow.getCell(c);
      if (!cell.alignment) cell.alignment = {};
      cell.alignment = { ...cell.alignment, vertical: "middle", wrapText: c === 2 };
    });
  });

  return wb;
};

/* ── Cartesian product of arrays ────────────────────────────────── */
function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap(combo => arr.map(val => [...combo, val])),
    [[]]
  );
}
