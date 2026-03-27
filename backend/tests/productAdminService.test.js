const mongoose = require("mongoose");

describe("Product Admin Service - createProduct", () => {
    let productAdminService;
    let Product;
    let Category;
    let Shop;
    let dbNotif; // This is the actual source of the helpers
    let moderationSvc;

    const shopId = "60d0fe4f5311236168a109ca";
    const ownerId = "60d0fe4f5311236168a109cb";

    beforeEach(() => {
        // 1. Wipe the cache so the internal 'require' calls get the mocks
        jest.resetModules();

        // 2. Mock the DB Notification Service directly
        // This stops the "Operation notifications.insertOne() buffering timed out" error
        jest.doMock("../src/services/dbNotificationService", () => ({
            productApproved: jest.fn().mockResolvedValue({}),
            productRejected: jest.fn().mockResolvedValue({}),
            productFlagged: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
        }));

        // 3. Mock the other dependencies
        jest.doMock("../src/models/Product", () => ({
            findOne: jest.fn(),
            create: jest.fn(),
        }));
        jest.doMock("../src/models/Category", () => ({
            findById: jest.fn(),
        }));
        jest.doMock("../src/models/Shop", () => ({
            findById: jest.fn(),
        }));
        jest.doMock("../src/services/productModerationService", () => ({
            moderateProduct: jest.fn(),
        }));

        // 4. Re-require everything inside the beforeEach
        Product = require("../src/models/Product");
        Category = require("../src/models/Category");
        Shop = require("../src/models/Shop");
        dbNotif = require("../src/services/dbNotificationService");
        moderationSvc = require("../src/services/productModerationService");

        // REQUIRE THE SERVICE LAST
        productAdminService = require("../src/services/productAdminService");
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    const mockChain = (data) => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(data),
    });

    it("should auto-approve and notify via dbNotificationService", async () => {
        // Setup Shop lookup
        Shop.findById.mockReturnValue(mockChain({ owner_id: ownerId }));

        // Setup generic behaviors
        Category.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
        Product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
        Product.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: "p1" }));

        // Setup Moderation
        moderationSvc.moderateProduct.mockReturnValue({
            decision: "approved",
            score: 0,
            flags: [],
            summary: ""
        });

        const payload = { name: "Vintage Blue Denim" };
        const result = await productAdminService.createProduct(payload, shopId);

        // Assertions
        expect(result.status).toBe("active");

        // This should now have 1 call because we mocked the correct file!
        expect(dbNotif.productApproved).toHaveBeenCalledWith(ownerId, "Vintage Blue Denim");
    });

    it("should auto-reject and notify with reason", async () => {
        Shop.findById.mockReturnValue(mockChain({ owner_id: ownerId }));
        Product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
        Product.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: "p2" }));

        moderationSvc.moderateProduct.mockReturnValue({
            decision: "rejected",
            score: 100,
            flags: [],
            summary: "Restricted content"
        });

        const payload = { name: "Banned Item" };
        await productAdminService.createProduct(payload, shopId);

        expect(dbNotif.productRejected).toHaveBeenCalledWith(ownerId, "Banned Item", "Restricted content");
    });
});

describe("Product Admin Service - deleteProduct", () => {
    let productAdminService;
    let Product;
    let ProductVariant;

    const productId = "prod_delete_789";
    const shopId = "shop_123";

    beforeEach(() => {
        jest.resetModules();

        // 1. Mock the Models
        jest.doMock("../src/models/Product", () => ({
            findOneAndUpdate: jest.fn(),
        }));
        jest.doMock("../src/models/ProductVariant", () => ({
            updateMany: jest.fn(),
        }));

        // 2. Re-require
        Product = require("../src/models/Product");
        ProductVariant = require("../src/models/ProductVariant");
        productAdminService = require("../src/services/productAdminService");
    });

    it("should perform a soft delete by deactivating variants and updating product status", async () => {
        // Setup Mock Returns
        // updateMany usually returns an object like { acknowledged: true, modifiedCount: 5 }
        ProductVariant.updateMany.mockResolvedValue({ modifiedCount: 5 });

        // findOneAndUpdate returns the updated document
        Product.findOneAndUpdate.mockResolvedValue({
            _id: productId,
            status: "inactive"
        });

        const result = await productAdminService.deleteProduct(productId, shopId);

        // 1. Verify Variants were deactivated and stock set to 0
        expect(ProductVariant.updateMany).toHaveBeenCalledWith(
            { product_id: productId, shop_id: shopId },
            { $set: { is_active: false, stock: 0 } }
        );

        // 2. Verify Product status was set to inactive
        expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: productId, shop_id: shopId },
            { $set: { status: "inactive" } },
            { new: true }
        );

        // 3. Verify the returned result
        expect(result.status).toBe("inactive");
    });

    it("should return null if the product to delete is not found", async () => {
        // If findOneAndUpdate finds nothing, it returns null
        Product.findOneAndUpdate.mockResolvedValue(null);
        ProductVariant.updateMany.mockResolvedValue({});

        const result = await productAdminService.deleteProduct("non_existent", shopId);

        expect(result).toBeNull();
    });
});

describe("Product Admin Service - updateProduct", () => {
    let productAdminService;
    let Product;
    let Category;
    let Shop;
    let ProductVariant;
    let dbNotif;
    let moderationSvc;

    const shopId = "60d0fe4f5311236168a109ca";
    const ownerId = "60d0fe4f5311236168a109cb";
    const productId = "60d0fe4f5311236168a109cc";

    beforeEach(() => {
        jest.resetModules();

        jest.doMock("../src/models/Product", () => ({
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
        }));
        jest.doMock("../src/models/Category", () => ({
            findById: jest.fn(),
        }));
        jest.doMock("../src/models/Shop", () => ({
            findById: jest.fn(),
        }));
        jest.doMock("../src/models/ProductVariant", () => ({
            countDocuments: jest.fn(),
        }));
        jest.doMock("../src/services/productModerationService", () => ({
            moderateProduct: jest.fn(),
        }));
        jest.doMock("../src/services/dbNotificationService", () => ({
            productRejected: jest.fn().mockResolvedValue({}),
            productFlagged: jest.fn().mockResolvedValue({}),
        }));

        Product = require("../src/models/Product");
        Category = require("../src/models/Category");
        Shop = require("../src/models/Shop");
        ProductVariant = require("../src/models/ProductVariant");
        dbNotif = require("../src/services/dbNotificationService");
        moderationSvc = require("../src/services/productModerationService");
        productAdminService = require("../src/services/productAdminService");

        // Default moderation pass
        moderationSvc.moderateProduct.mockReturnValue({
            decision: "approved",
            score: 0,
            flags: [],
            summary: ""
        });
    });

    const mockChain = (data) => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(data),
    });

    describe("Field Stripping & Status Toggle", () => {
        it("should strip sensitive fields and return the updated product", async () => {
            /**
             * FIX: Use mockImplementation to handle multiple findOne calls.
             * 1. The merge check: findOne({ _id: id, shop_id: shopId })
             * 2. The final return: findOne({ _id: id, shop_id: shopId })
             */
            Product.findOne.mockImplementation((query) => {
                // If it's a slug check (has $ne), return null (no conflict)
                if (query.slug) return mockChain(null);
                // Otherwise, return a valid product object
                return mockChain({ _id: productId, name: "Updated Name", status: "active" });
            });

            Product.findOneAndUpdate.mockResolvedValue({});
            ProductVariant.countDocuments.mockResolvedValue(0);

            const payload = {
                name: "Updated Name",
                rating_avg: 5,   // Should be stripped
                status: "active"
            };

            const result = await productAdminService.updateProduct(productId, payload, shopId);

            // Verify final return is defined
            expect(result).toBeDefined();
            expect(result.name).toBe("Updated Name");

            // Verify the update call stripped the fields
            const patch = Product.findOneAndUpdate.mock.calls[0][1].$set;
            expect(patch.rating_avg).toBeUndefined();
            expect(patch.status).toBe("active");
        });
    });

    describe("Re-moderation & Notifications", () => {
        it("should notify when re-moderation rejects changes", async () => {
            // Mock findOne for the merge-check and return-check
            Product.findOne.mockImplementation(() => mockChain({ _id: productId, name: "Old Name" }));

            moderationSvc.moderateProduct.mockReturnValue({
                decision: "rejected",
                score: 100,
                flags: [],
                summary: "Banned"
            });

            Shop.findById.mockReturnValue(mockChain({ owner_id: ownerId }));
            Product.findOneAndUpdate.mockResolvedValue({});
            ProductVariant.countDocuments.mockResolvedValue(0);

            await productAdminService.updateProduct(productId, { description: "bad words" }, shopId);

            expect(dbNotif.productRejected).toHaveBeenCalledWith(ownerId, "Old Name", "Banned");
        });
    });

    describe("Stock Logic", () => {
        it("should trigger recomputeStockTotal if variants exist", async () => {
            Product.findOne.mockImplementation(() => mockChain({ _id: productId }));
            Product.findOneAndUpdate.mockResolvedValue({});
            ProductVariant.countDocuments.mockResolvedValue(5);

            const recomputeSpy = jest.spyOn(productAdminService, "recomputeStockTotal").mockResolvedValue(true);

            await productAdminService.updateProduct(productId, { status: "active" }, shopId);

            expect(recomputeSpy).toHaveBeenCalledWith(productId, shopId);
            recomputeSpy.mockRestore();
        });
    });
});
