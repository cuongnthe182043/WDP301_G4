const cartService = require("../src/services/cartService");
const Cart = require("../src/models/Cart");
const Product = require("../src/models/Product");
const ProductVariant = require("../src/models/ProductVariant");
const { v4: uuidv4 } = require("uuid");

jest.mock("../src/models/Cart");
jest.mock("../src/models/Product");
jest.mock("../src/models/ProductVariant");
jest.mock("uuid");

describe("cartService.getCart", () => {
    let mockCart;

    beforeEach(() => {
        jest.clearAllMocks();

        // 1. Setup Mock Cart Data
        mockCart = {
            _id: "cart_123",
            user_id: "user_123",
            total_price: 5000,
            items: [
                {
                    product_id: "p_1",
                    variant_id: "v_1",
                    qty: 1,
                    toObject: jest.fn().mockReturnValue({ product_id: "p_1", variant_id: "v_1", qty: 1 })
                }
            ]
        };

        // 2. Setup Model call chains
        Cart.findOne.mockResolvedValue(mockCart);

        Product.find.mockResolvedValue([
            { _id: "p_1", name: "Laptop", slug: "laptop-slug", images: ["p1.jpg"] }
        ]);

        ProductVariant.find.mockResolvedValue([
            {
                _id: "v_1",
                product_id: "p_1",
                price: 5000,
                stock: 10,
                attributes: { size: "15 inch" },
                images: ["v1.jpg"]
            },
            {
                _id: "v_2",
                product_id: "p_1",
                price: 5500,
                stock: 5,
                attributes: { size: "17 inch" },
                images: ["v2.jpg"]
            }
        ]);
    });

    it("should return an enriched cart with products and available variants", async () => {
        const result = await cartService.getCart("user_123");

        // Verify the structure
        expect(result).toHaveProperty("items");
        expect(result.items[0]).toHaveProperty("product");
        expect(result.items[0]).toHaveProperty("available_variants");

        // Verify available_variants enrichment
        const variants = result.items[0].available_variants;
        expect(variants).toHaveLength(2);

        // Verify attrLabel logic (alphabetical sorting of attributes)
        expect(variants[0].label).toBe("size: 15 inch");
    });

    it("should create a new cart if one does not exist (getOrCreateCart logic)", async () => {
        // Simulate no cart found initially
        Cart.findOne.mockResolvedValue(null);
        Cart.create.mockResolvedValue({ _id: "new_cart", user_id: "user_123", items: [] });

        // Mock empty product/variant returns for an empty cart
        Product.find.mockResolvedValue([]);
        ProductVariant.find.mockResolvedValue([]);

        const result = await cartService.getCart("user_123");

        expect(Cart.create).toHaveBeenCalledWith({ user_id: "user_123", items: [] });
        expect(result._id).toBe("new_cart");
        expect(result.items).toHaveLength(0);
    });
    it("should handle orphaned items (product deleted from DB but stays in cart)", async () => {
        // Mocking: Product.find returns empty even though cart has an item
        Product.find.mockResolvedValue([]);
        ProductVariant.find.mockResolvedValue([]);

        const result = await cartService.getCart("user_123");

        // The product field should be null as per your logic: productMap[it.product_id] || null
        expect(result.items[0].product).toBeNull();
        expect(result.items[0].available_variants).toEqual([]);
    });

    it("should correctly sort and format labels in attrLabel", async () => {
        Product.find.mockResolvedValue([{ _id: "p_1", name: "Shirt" }]);

        // Mock variant with unsorted attributes
        ProductVariant.find.mockResolvedValue([
            {
                _id: "v_1",
                product_id: "p_1",
                attributes: { size: "XL", color: "Blue", material: "Cotton" }
            }
        ]);

        const result = await cartService.getCart("user_123");
        const variant = result.items[0].available_variants[0];

        // attrLabel uses .sort(), so it should be alphabetical: color, material, size
        expect(variant.label).toBe("color: Blue, material: Cotton, size: XL");
    });

    it("should handle variants with no attributes gracefully", async () => {
        Product.find.mockResolvedValue([{ _id: "p_1", name: "Basic Item" }]);
        ProductVariant.find.mockResolvedValue([
            { _id: "v_1", product_id: "p_1", attributes: null } // testing the || {} fallback
        ]);

        const result = await cartService.getCart("user_123");

        expect(result.items[0].available_variants[0].label).toBe("");
    });

    it("should handle multiple items from different products", async () => {
        mockCart.items = [
            { product_id: "p_1", variant_id: "v_1", toObject: () => ({ product_id: "p_1" }) },
            { product_id: "p_2", variant_id: "v_2", toObject: () => ({ product_id: "p_2" }) }
        ];

        Product.find.mockResolvedValue([
            { _id: "p_1", name: "Prod 1" },
            { _id: "p_2", name: "Prod 2" }
        ]);

        ProductVariant.find.mockResolvedValue([
            { _id: "v_1", product_id: "p_1" },
            { _id: "v_2", product_id: "p_2" }
        ]);

        const result = await cartService.getCart("user_123");

        expect(result.items).toHaveLength(2);
        expect(result.items[0].product._id).toBe("p_1");
        expect(result.items[1].product._id).toBe("p_2");
    });
});

describe("cartService.addItem", () => {
    let mockCart, mockProduct, mockVariant;

    // Helper to simulate Mongoose behavior
    const wrapItem = (item) => ({
        ...item,
        toObject: function () {
            const { toObject, ...rest } = this;
            return rest;
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        uuidv4.mockReturnValue("mock-uuid");

        mockProduct = {
            _id: "p_1",
            name: "Test Product",
            images: ["prod-img.jpg"]
        };

        mockVariant = {
            _id: "v_1",
            product_id: "p_1",
            price: 100,
            stock: 10,
            images: ["var-img.jpg"],
            attributes: { color: "Red" }
        };

        // Initialize mockCart with an items array that mimics Mongoose's push
        mockCart = {
            _id: "cart_123",
            items: [],
            save: jest.fn().mockImplementation(function () {
                // When the real code calls cart.items.push({...}), 
                // we need to make sure those new items also have toObject()
                this.items = this.items.map(item =>
                    item.toObject ? item : wrapItem(item)
                );
                return Promise.resolve(true);
            })
        };

        ProductVariant.findById.mockResolvedValue(mockVariant);
        Product.findById.mockResolvedValue(mockProduct);
        Cart.findOne.mockResolvedValue(mockCart);

        // Mocks for the getCart enrichment logic
        Product.find.mockResolvedValue([mockProduct]);
        ProductVariant.find.mockResolvedValue([mockVariant]);
    });

    it("should successfully add a brand new item to the cart", async () => {
        // We execute the service
        await cartService.addItem("user_123", {
            product_id: "p_1",
            variant_id: "v_1",
            qty: 2
        });

        // Verify the internal state of the items before getCart runs
        expect(mockCart.items).toHaveLength(1);
        expect(mockCart.items[0].product_id).toBe("p_1");
        expect(mockCart.items[0].qty).toBe(2);
        expect(mockCart.save).toHaveBeenCalled();
    });

    it("should merge quantities if the same variant is added again", async () => {
        // Start with item already in cart
        mockCart.items = [{
            variant_id: "v_1",
            qty: 1,
            price: 100
        }];

        await cartService.addItem("user_123", {
            product_id: "p_1",
            variant_id: "v_1",
            qty: 3
        });

        expect(mockCart.items).toHaveLength(1);
        expect(mockCart.items[0].qty).toBe(4);
    });

    it("should throw error if variant stock is 0", async () => {
        mockVariant.stock = 0;

        await expect(cartService.addItem("user_123", {
            product_id: "p_1",
            variant_id: "v_1",
            qty: 1
        })).rejects.toThrow("Sản phẩm đã bán hết");
    });

    it("should throw error if requested qty exceeds stock", async () => {
        mockVariant.stock = 5;

        await expect(cartService.addItem("user_123", {
            product_id: "p_1",
            variant_id: "v_1",
            qty: 10
        })).rejects.toThrow("Không đủ tồn kho");
    });

    it("should throw error if merged qty (existing + new) exceeds stock", async () => {
        mockVariant.stock = 5;
        mockCart.items = [{ variant_id: "v_1", qty: 4 }];

        await expect(cartService.addItem("user_123", {
            product_id: "p_1",
            variant_id: "v_1",
            qty: 2
        })).rejects.toThrow("Không đủ tồn kho");
    });

    it("should throw error if product_id does not match the variant's product_id", async () => {
        await expect(cartService.addItem("user_123", {
            product_id: "WRONG_ID",
            variant_id: "v_1",
            qty: 1
        })).rejects.toThrow("Biến thể không khớp sản phẩm");
    });

    it("should cap qty at 1 if input qty is less than 1", async () => {
        await cartService.addItem("user_123", {
            product_id: "p_1",
            variant_id: "v_1",
            qty: -10
        });

        expect(mockCart.items[0].qty).toBe(1);
    });
});

describe("cartService.updateItem", () => {
    let mockCart, mockProduct, mockVariant1, mockVariant2;

    // Helper to fix the toObject issue we saw earlier
    const wrapItem = (item) => ({
        ...item,
        toObject: function () {
            const { toObject, ...rest } = this;
            return rest;
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockVariant1 = { _id: "v_1", product_id: "p_1", price: 100, stock: 10, attributes: { color: "Red" } };
        mockVariant2 = { _id: "v_2", product_id: "p_1", price: 120, stock: 5, attributes: { color: "Blue" }, images: ["blue.jpg"] };
        mockProduct = { _id: "p_1", name: "Test Product" };

        mockCart = {
            _id: "cart_123",
            items: [
                wrapItem({ _id: "item_999", product_id: "p_1", variant_id: "v_1", qty: 2, price: 100 })
            ],
            save: jest.fn().mockResolvedValue(true)
        };

        Cart.findOne.mockResolvedValue(mockCart);
        ProductVariant.findById.mockImplementation((id) => {
            if (id === "v_1") return Promise.resolve(mockVariant1);
            if (id === "v_2") return Promise.resolve(mockVariant2);
            return Promise.resolve(null);
        });
        Product.findById.mockResolvedValue(mockProduct);

        // Mocks for getCart enrichment
        Product.find.mockResolvedValue([mockProduct]);
        ProductVariant.find.mockResolvedValue([mockVariant1, mockVariant2]);
    });

    it("should successfully update quantity only", async () => {
        const result = await cartService.updateItem("user_123", "item_999", { qty: 5 });

        expect(mockCart.items[0].qty).toBe(5);
        expect(mockCart.save).toHaveBeenCalled();
    });

    it("should successfully change variant and update price/attributes", async () => {
        const result = await cartService.updateItem("user_123", "item_999", {
            variant_id: "v_2",
            qty: 1
        });

        const updatedItem = mockCart.items[0];
        expect(updatedItem.variant_id).toBe("v_2");
        expect(updatedItem.price).toBe(120);
        expect(updatedItem.qty).toBe(1);
        expect(updatedItem.image).toBe("blue.jpg");
    });

    it("should throw error if item_id does not exist in cart", async () => {
        await expect(cartService.updateItem("user_123", "NON_EXISTENT", { qty: 1 }))
            .rejects.toThrow("Mục giỏ hàng không tồn tại");
    });

    it("should throw error if new quantity exceeds variant stock", async () => {
        await expect(cartService.updateItem("user_123", "item_999", { qty: 99 }))
            .rejects.toThrow("Không đủ tồn kho");
    });

    it("should throw error if new variant does not belong to the same product", async () => {
        // Mock a variant that belongs to a different product
        const rogueVariant = { _id: "v_rogue", product_id: "DIFFERENT_PROD", stock: 10 };
        ProductVariant.findById.mockResolvedValueOnce(rogueVariant);
        Product.findById.mockResolvedValueOnce({ _id: "DIFFERENT_PROD" });

        await expect(cartService.updateItem("user_123", "item_999", { variant_id: "v_rogue" }))
            .rejects.toThrow("Biến thể không thuộc sản phẩm này");
    });

    it("should cap quantity at 1 if updated with a value less than 1", async () => {
        await cartService.updateItem("user_123", "item_999", { qty: -10 });
        expect(mockCart.items[0].qty).toBe(1);
    });

    it("should keep existing quantity if only variant_id is provided", async () => {
        // Current qty is 2
        await cartService.updateItem("user_123", "item_999", { variant_id: "v_2" });
        expect(mockCart.items[0].qty).toBe(2);
        expect(mockCart.items[0].variant_id).toBe("v_2");
    });
});

describe("cartService.removeItem", () => {
    let mockCart, mockProduct, mockVariant;

    const wrapItem = (item) => ({
        ...item,
        toObject: function () {
            const { toObject, ...rest } = this;
            return rest;
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockProduct = { _id: "p_1", name: "Test Product" };
        mockVariant = { _id: "v_1", product_id: "p_1", price: 100 };

        mockCart = {
            _id: "cart_123",
            user_id: "user_123",
            items: [
                wrapItem({ _id: "item_A", product_id: "p_1", variant_id: "v_1" }),
                wrapItem({ _id: "item_B", product_id: "p_1", variant_id: "v_2" })
            ],
            save: jest.fn().mockResolvedValue(true)
        };

        Cart.findOne.mockResolvedValue(mockCart);

        // Mocks for getCart enrichment (used in the return statement)
        Product.find.mockResolvedValue([mockProduct]);
        ProductVariant.find.mockResolvedValue([mockVariant]);
    });

    it("should successfully remove an item from the cart", async () => {
        const result = await cartService.removeItem("user_123", "item_A");

        // Verify internal array was filtered
        expect(mockCart.items).toHaveLength(1);
        expect(mockCart.items[0]._id).toBe("item_B");

        // Verify persistence
        expect(mockCart.save).toHaveBeenCalled();

        // Verify result comes from getCart logic
        expect(result.items).toHaveLength(1);
        expect(result._id).toBe("cart_123");
    });

    it("should throw error if the itemId does not exist in the cart", async () => {
        await expect(cartService.removeItem("user_123", "item_NON_EXISTENT"))
            .rejects.toThrow("Mục giỏ hàng không tồn tại");

        // Ensure save was NEVER called because nothing changed
        expect(mockCart.save).not.toHaveBeenCalled();
    });

    it("should handle removing the last item in the cart", async () => {
        // Start with only one item
        mockCart.items = [wrapItem({ _id: "item_Z", product_id: "p_1" })];

        const result = await cartService.removeItem("user_123", "item_Z");

        expect(mockCart.items).toHaveLength(0);
        expect(result.items).toHaveLength(0);
        expect(mockCart.save).toHaveBeenCalled();
    });
});