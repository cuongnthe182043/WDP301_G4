const productAdminService = require("../src/services/productAdminService");
const Product = require("../src/models/Product");
const ProductVariant = require("../src/models/ProductVariant");
const Category = require("../src/models/Category");

jest.mock("../src/models/Product");
jest.mock("../src/models/ProductVariant");
jest.mock("../src/models/Category");

describe("Product Service", () => {

    describe("createProduct", () => {
        let mockPayload;
        const shopId = "shop_123";

        beforeEach(() => {
            jest.clearAllMocks();
            mockPayload = {
                name: "Vintage Denim Jacket",
                base_price: 550000,
                category_id: "cat_outerwear",
                detail_info: {
                    origin_country: "Vietnam",
                    materials: ["Cotton", "Elastane"],
                    seasons: ["autumn", "winter"]
                },
                status: "active", // Should be ignored
                rejection_reason: "Should be cleared" // Should be ignored
            };
        });

        it("should create a product with correct status and shop_id", async () => {
            Product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
            Category.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

            await productAdminService.createProduct(mockPayload, shopId);

            expect(Product.create).toHaveBeenCalledWith(expect.objectContaining({
                shop_id: shopId,
                status: "pending",
                rejection_reason: "",
                base_price: 550000
            }));
        });

        it("should handle slug collision by appending a timestamp", async () => {
            // Mock that the slug "vintage-denim-jacket" already exists
            Product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "p_old" }) });

            const fixedTime = 1711234567890;
            jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

            await productAdminService.createProduct(mockPayload, shopId);

            expect(Product.create).toHaveBeenCalledWith(expect.objectContaining({
                slug: `vintage-denim-jacket-${fixedTime}`
            }));

            jest.restoreAllMocks();
        });

        it("should inherit and build category_path correctly", async () => {
            const mockCategory = {
                slug: "denim",
                path: ["fashion", "men"]
            };

            Product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
            Category.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockCategory) });

            await productAdminService.createProduct(mockPayload, shopId);

            expect(Product.create).toHaveBeenCalledWith(expect.objectContaining({
                category_path: ["fashion", "men", "denim"]
            }));
        });

        it("should maintain detail_info provided in the payload", async () => {
            Product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
            Category.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

            await productAdminService.createProduct(mockPayload, shopId);

            expect(Product.create).toHaveBeenCalledWith(expect.objectContaining({
                detail_info: {
                    origin_country: "Vietnam",
                    materials: ["Cotton", "Elastane"],
                    seasons: ["autumn", "winter"]
                }
            }));
        });
    });
});

describe("productAdminService.deleteProduct (Soft Delete)", () => {
    const productId = "prod-123";
    const shopId = "shop-999";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should deactivate variants and set product status to inactive", async () => {
        Product.findOneAndUpdate.mockResolvedValue({ _id: productId, status: "inactive" });

        await productAdminService.deleteProduct(productId, shopId);

        // Verify variants are deactivated, NOT deleted
        expect(ProductVariant.updateMany).toHaveBeenCalledWith(
            { product_id: productId, shop_id: shopId },
            { $set: { is_active: false, stock: 0 } }
        );

        // Verify product is marked inactive, NOT deleted
        expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: productId, shop_id: shopId },
            { $set: { status: "inactive" } },
            { new: true }
        );

        // Safety check: ensure hard delete methods were NOT called
        expect(Product.findOneAndDelete).not.toHaveBeenCalled();
        expect(ProductVariant.deleteMany).not.toHaveBeenCalled();
    });
});

describe("productAdminService.updateProduct", () => {
    const shopId = "shop_123";
    const productId = "prod_456";

    beforeEach(() => {
        jest.clearAllMocks();

        // Default: no variants, no slug conflict
        ProductVariant.countDocuments.mockResolvedValue(0);
        Product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: productId, name: "Updated" }) });
    });

    it("should strip forbidden fields from the update payload", async () => {
        const payload = {
            name: "New Name",
            rating_avg: 5,         // Forbidden
            shop_id: "HACKER_SHOP", // Forbidden
            sold_count: 1000       // Forbidden
        };

        await productAdminService.updateProduct(productId, payload, shopId);

        // Use objectContaining to ignore the auto-generated slug
        expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: productId, shop_id: shopId },
            {
                $set: expect.objectContaining({
                    name: "New Name"
                })
            },
            { new: true }
        );

        // verify the forbidden fields were NOT included in the $set call
        const lastCall = Product.findOneAndUpdate.mock.calls[0][1].$set;
        expect(lastCall.rating_avg).toBeUndefined();
        expect(lastCall.shop_id).toBeUndefined();
        expect(lastCall.sold_count).toBeUndefined();
    });

    it("should only allow status updates to 'active' or 'inactive'", async () => {
        // Attempting to set status to 'pending' (not allowed in this function)
        const payload = { status: "pending", name: "Test" };

        await productAdminService.updateProduct(productId, payload, shopId);

        const updateArgument = Product.findOneAndUpdate.mock.calls[0][1].$set;
        expect(updateArgument.status).toBeUndefined();
        expect(updateArgument.name).toBe("Test");

        // Attempting to set status to 'active' (allowed)
        await productAdminService.updateProduct(productId, { status: "active" }, shopId);
        expect(Product.findOneAndUpdate.mock.calls[1][1].$set.status).toBe("active");
    });

    it("should handle slug updates and exclude current ID from conflict check", async () => {
        const payload = { name: "New Phone" };
        // Mock that 'new-phone' is already taken by a DIFFERENT product
        Product.findOne.mockImplementation((query) => {
            if (query.slug === "new-phone" && query._id?.$ne === productId) {
                return { lean: jest.fn().mockResolvedValue({ _id: "other_prod" }) };
            }
            return { lean: jest.fn().mockResolvedValue(null) };
        });

        const fixedTime = 99999;
        jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

        await productAdminService.updateProduct(productId, payload, shopId);

        expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                $set: expect.objectContaining({ slug: `new-phone-${fixedTime}` })
            }),
            expect.any(Object)
        );
    });

    it("should trigger recomputeStockTotal if variants exist", async () => {
        ProductVariant.countDocuments.mockResolvedValue(5); // 5 variants found
        // We must spy on the export because updateProduct calls it via 'exports'
        const recomputeSpy = jest.spyOn(productAdminService, "recomputeStockTotal").mockResolvedValue(true);

        await productAdminService.updateProduct(productId, { name: "Update" }, shopId);

        expect(recomputeSpy).toHaveBeenCalledWith(productId, shopId);
        recomputeSpy.mockRestore();
    });
});