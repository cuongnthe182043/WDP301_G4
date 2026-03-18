const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const { requireShopOwner } = require("../middlewares/shopMiddleware");
const ctrl = require("../controllers/productAdminController");
const { uploadImagesMw, uploadVideoMw, uploadAnySingle } = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Shared auth + role middleware array (no shop check)
const auth = [verifyToken, ...requireAnyRole("shop_owner", "sales", "system_admin")];
// Auth + shop check for shop-scoped operations
const authShop = [...auth, requireShopOwner];

// ── Catalog reads (no shop required) ──────────────────────────────
router.get("/categories",        ...auth, ctrl.listCategories);
router.get("/categories/tree",   ...auth, ctrl.categoryTree);
router.post("/categories",       ...auth, ctrl.createCategory);
router.put("/categories/:id",    ...auth, ctrl.updateCategory);
router.delete("/categories/:id", ...auth, ctrl.deleteCategory);

router.get("/attributes",        ...auth, ctrl.listAttributes);
router.post("/attributes",       ...auth, ctrl.createAttribute);
router.put("/attributes/:id",    ...auth, ctrl.updateAttribute);
router.delete("/attributes/:id", ...auth, ctrl.deleteAttribute);

router.get("/brands",            ...auth, ctrl.listBrands);
router.post("/brands",           ...auth, ctrl.createBrand);
router.put("/brands/:id",        ...auth, ctrl.updateBrand);
router.delete("/brands/:id",     ...auth, ctrl.deleteBrand);

// ── Inventory (shop required) ──────────────────────────────────────
router.get("/inventory/low-stock", ...authShop, ctrl.lowStock);

// ── Products (shop required) ───────────────────────────────────────
router.get("/products/import/template",      ...auth,     ctrl.downloadTemplate);
router.post("/products/import",              ...authShop, uploadAnySingle, ctrl.importExcel);
router.post("/products/:id/variants/bulk",   ...authShop, ctrl.createVariantsBulk);
router.post("/products/:id/variants",        ...authShop, ctrl.createVariant);
router.get("/products/:id/variants",         ...authShop, ctrl.listVariants);
router.get("/products/:id",                  ...authShop, ctrl.getProduct);
router.put("/products/:id",                  ...authShop, ctrl.updateProduct);
router.delete("/products/:id",               ...authShop, ctrl.deleteProduct);
router.get("/products",                      ...authShop, ctrl.listProducts);
router.post("/products",                     ...authShop, ctrl.createProduct);

// ── Variants (shop required) ───────────────────────────────────────
router.put("/variants/:variantId",           ...authShop, ctrl.updateVariant);
router.delete("/variants/:variantId",        ...authShop, ctrl.deleteVariant);

// ── Media (shop required) ──────────────────────────────────────────
router.post("/media/images", ...authShop, uploadImagesMw, ctrl.uploadImages);
router.post("/media/video",  ...authShop, uploadVideoMw,  ctrl.uploadVideo);

module.exports = router;
