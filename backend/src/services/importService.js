const ExcelJS = require("exceljs");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const { v4: uuidv4 } = require("uuid");

/**
 * Expected columns (Sheet "Sản phẩm"):
 * name* | sku* | price* | stock* | description | category | brand | images(csv) | color | size | material_variant | pattern | fit
 * - images: comma-separated URLs (optional)
 * - color/size/…: variant dimension values, comma-separated (e.g. "Đỏ,Xanh,Đen")
 */
exports.importProductsFromExcel = async (buffer, shopId) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("File Excel không có dữ liệu");

  // Map header name → column index
  const header = {};
  ws.getRow(1).eachCell((cell, col) => {
    const key = cell.value?.toString().trim().toLowerCase();
    if (key) header[key] = col;
  });

  const required = ["name", "sku", "price", "stock"];
  for (const k of required) {
    if (!header[k]) throw new Error(`Thiếu cột bắt buộc: "${k}". Hãy tải template để xem định dạng đúng.`);
  }

  const VARIANT_DIMS = ["color", "size", "material_variant", "pattern", "fit"];
  const errors = [];
  const created = [];

  for (let r = 2; r <= ws.actualRowCount; r++) {
    const row = ws.getRow(r);
    const name = row.getCell(header["name"]).value?.toString().trim();
    if (!name) continue; // skip empty rows

    const sku   = row.getCell(header["sku"])?.value?.toString().trim() || `sku-${uuidv4().slice(0, 8)}`;
    const price = Number(row.getCell(header["price"])?.value || 0);
    const stock = Number(row.getCell(header["stock"])?.value || 0);

    if (price <= 0) {
      errors.push(`Dòng ${r}: Giá không hợp lệ (${price})`);
      continue;
    }

    const description = header["description"] ? row.getCell(header["description"])?.value?.toString().trim() || "" : "";
    const catName     = header["category"]    ? row.getCell(header["category"])?.value?.toString().trim()    : null;
    const brandName   = header["brand"]       ? row.getCell(header["brand"])?.value?.toString().trim()       : null;
    const imagesCsv   = header["images"]      ? row.getCell(header["images"])?.value?.toString().trim()      : "";

    // Resolve category (upsert by name)
    let category_id;
    if (catName) {
      const c = await Category.findOneAndUpdate(
        { name: catName },
        { $setOnInsert: { name: catName, is_active: true } },
        { upsert: true, new: true }
      );
      category_id = c._id;
    }

    // Resolve brand (upsert by name)
    let brand_id;
    if (brandName) {
      const b = await Brand.findOneAndUpdate(
        { name: brandName },
        { $setOnInsert: { name: brandName, is_active: true, country: "unknown" } },
        { upsert: true, new: true }
      );
      brand_id = b._id;
    }

    const images = imagesCsv ? imagesCsv.split(",").map(s => s.trim()).filter(Boolean) : [];

    // Collect variant dimension values per dim
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

    // Generate unique slug
    let baseSlug = name.toLowerCase()
      .replace(/[àáâãäå]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i")
      .replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let slug = `${baseSlug}-${Date.now()}`;
    let conflict = await Product.findOne({ slug });
    let attempt = 0;
    while (conflict) {
      slug = `${baseSlug}-${Date.now()}-${++attempt}`;
      conflict = await Product.findOne({ slug });
    }

    const prod = await Product.create({
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

    // Auto-create variants from cartesian product of dimension values
    if (variantDims.length > 0) {
      const dimEntries = variantDims.map(d => variantValuesMap[d]);
      const combos = cartesian(dimEntries);
      const variantRows = combos.map((combo, i) => {
        const attrs = {};
        variantDims.forEach((d, j) => { attrs[d] = combo[j]; });
        return {
          product_id: prod._id,
          shop_id: shopId,
          sku: i === 0 ? sku : `${sku}-${i + 1}`,
          price,
          stock: i === 0 ? stock : 0,
          variant_attributes: attrs,
          is_active: true,
        };
      });
      await ProductVariant.insertMany(variantRows);
      await Product.findByIdAndUpdate(prod._id, { stock_total: stock });
    } else {
      // Single variant (no dimensions)
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
    }

    created.push({ product_id: prod._id, name, sku });
  }

  return { inserted: created.length, errors, items: created };
};

/** Generate downloadable Excel template */
exports.generateTemplate = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Web-Ecommerces-AI";

  const ws = wb.addWorksheet("Sản phẩm");

  // Define columns
  ws.columns = [
    { header: "name",             key: "name",             width: 30 },
    { header: "sku",              key: "sku",              width: 20 },
    { header: "price",            key: "price",            width: 15 },
    { header: "stock",            key: "stock",            width: 12 },
    { header: "description",      key: "description",      width: 40 },
    { header: "category",         key: "category",         width: 20 },
    { header: "brand",            key: "brand",            width: 20 },
    { header: "images",           key: "images",           width: 50 },
    { header: "color",            key: "color",            width: 25 },
    { header: "size",             key: "size",             width: 20 },
    { header: "material_variant", key: "material_variant", width: 25 },
    { header: "pattern",          key: "pattern",          width: 25 },
    { header: "fit",              key: "fit",              width: 20 },
  ];

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell, col) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
    // Mark required columns with *
    if (["name", "sku", "price", "stock"].includes(cell.value)) {
      cell.value = `${cell.value} *`;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
    }
  });
  headerRow.height = 28;

  // Sample row 1 — product with color + size variants
  ws.addRow({
    name:             "Áo thun nam basic",
    sku:              "ATN-001",
    price:            199000,
    stock:            50,
    description:      "Áo thun nam cổ tròn chất liệu cotton 100%",
    category:         "Áo thun",
    brand:            "Anh Việt Store",
    images:           "https://example.com/img1.jpg,https://example.com/img2.jpg",
    color:            "Trắng,Đen,Xám",
    size:             "S,M,L,XL",
    material_variant: "",
    pattern:          "",
    fit:              "",
  });

  // Sample row 2 — simple product, no variants
  ws.addRow({
    name:             "Quần jeans slim fit",
    sku:              "QJ-002",
    price:            450000,
    stock:            30,
    description:      "Quần jeans nam form slim fit, co giãn 4 chiều",
    category:         "Quần jeans",
    brand:            "Anh Việt Store",
    images:           "https://example.com/jeans1.jpg",
    color:            "Xanh đậm,Đen",
    size:             "28,30,32,34",
    material_variant: "",
    pattern:          "",
    fit:              "Slim fit,Regular fit",
  });

  // Style data rows
  for (let r = 2; r <= 3; r++) {
    const row = ws.getRow(r);
    row.height = 22;
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFEEEEEE" } },
      };
      cell.alignment = { vertical: "middle" };
    });
    // Alternate row color
    if (r % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      });
    }
  }

  // Add instructions sheet
  const wsInfo = wb.addWorksheet("Hướng dẫn");
  wsInfo.getColumn(1).width = 60;
  wsInfo.getColumn(2).width = 60;

  const instructions = [
    ["Cột", "Mô tả"],
    ["name *", "Tên sản phẩm (bắt buộc)"],
    ["sku *", "Mã SKU sản phẩm (bắt buộc, duy nhất)"],
    ["price *", "Giá bán (VND, số nguyên dương, bắt buộc)"],
    ["stock *", "Số lượng tồn kho (bắt buộc)"],
    ["description", "Mô tả sản phẩm (tùy chọn)"],
    ["category", "Tên danh mục (tùy chọn, tự động tạo nếu chưa tồn tại)"],
    ["brand", "Tên thương hiệu (tùy chọn, tự động tạo nếu chưa tồn tại)"],
    ["images", "Danh sách URL ảnh, cách nhau bằng dấu phẩy (tùy chọn)"],
    ["color", "Giá trị màu sắc, cách nhau bằng dấu phẩy (vd: Đỏ,Xanh,Đen)"],
    ["size", "Giá trị kích cỡ, cách nhau bằng dấu phẩy (vd: S,M,L,XL)"],
    ["material_variant", "Giá trị biến thể chất liệu, cách nhau bằng dấu phẩy"],
    ["pattern", "Giá trị họa tiết, cách nhau bằng dấu phẩy"],
    ["fit", "Giá trị kiểu dáng, cách nhau bằng dấu phẩy"],
    ["", ""],
    ["Lưu ý:", "- Các cột đánh dấu * là bắt buộc"],
    ["", "- Nếu có biến thể (color/size/…), hệ thống tự tạo tất cả tổ hợp"],
    ["", "- Sản phẩm được tạo ở trạng thái 'Chờ duyệt'"],
    ["", "- Mỗi dòng = 1 sản phẩm"],
  ];

  instructions.forEach((row, i) => {
    const wsRow = wsInfo.addRow(row);
    if (i === 0) {
      wsRow.font = { bold: true };
      wsRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      wsRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      wsRow.getCell(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
    }
    wsRow.height = 20;
  });

  return wb;
};

// Cartesian product of arrays
function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap(combo => arr.map(val => [...combo, val])),
    [[]]
  );
}
