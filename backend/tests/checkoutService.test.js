const checkoutService = require("../src/services/checkoutService");
const Address = require("../src/models/Address");
const Order = require("../src/models/Order");
const Cart = require("../src/models/Cart");
const Voucher = require("../src/models/Voucher");
const ShopCredit = require("../src/models/ShopCredit");
const ProductVariant = require("../src/models/ProductVariant");
const Product = require("../src/models/Product");

// Mock Services
jest.mock("../src/services/notificationService", () => ({ send: jest.fn().mockResolvedValue(true) }));
jest.mock("../src/services/dbNotificationService", () => ({ orderPlaced: jest.fn().mockResolvedValue(true) }));
jest.mock("../src/services/shippingService", () => ({ calculate: jest.fn().mockResolvedValue(0) }));

// Mock Models
jest.mock("../src/models/Address");
jest.mock("../src/models/Order");
jest.mock("../src/models/Cart");
jest.mock("../src/models/Voucher");
jest.mock("../src/models/ShopCredit");
jest.mock("../src/models/ProductVariant");
jest.mock("../src/models/Product");

describe("checkoutService.confirm", () => {

    beforeEach(() => {
        jest.clearAllMocks();

        // Default Cart Mock (handles .lean() chaining)
        Cart.findOne.mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue({ items: [], user_id: "u1" })
        }));

        // Default Voucher Mock (prevents immediate crash if code looks for any voucher)
        Voucher.findOne.mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(null)
        }));
    });

    const mockAddressSuccess = () => {
        Address.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                _id: "addr-1", name: "Test User", city: "Hanoi", phone: "123"
            })
        });
    };

    const mockProductChain = (vId, pId, sId, stock = 10, price = 100) => {
        ProductVariant.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({ _id: vId, product_id: pId, stock, price })
        });
        Product.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({ _id: pId, shop_id: sId })
        });
    };

    // --- TESTS 1-5 (Validation & Stock) ---
    it("should throw 401 if userId is missing", async () => {
        await expect(checkoutService.confirm({ userId: null })).rejects.toMatchObject({ status: 401 });
    });

    it("should throw 400 if address_id is missing", async () => {
        await expect(checkoutService.confirm({ userId: "u1", address_id: null })).rejects.toMatchObject({ status: 400 });
    });

    it("should throw 400 for invalid payment method", async () => {
        await expect(checkoutService.confirm({ userId: "u1", address_id: "a1", payment_method: "FAKE" })).rejects.toMatchObject({ status: 400 });
    });

    it("should throw 400 if address is not found", async () => {
        Address.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
        await expect(checkoutService.confirm({ userId: "u1", address_id: "a1" })).rejects.toMatchObject({ status: 400 });
    });

    it("should throw if resolveItems fails (out of stock)", async () => {
        mockAddressSuccess();
        mockProductChain("v1", "p1", "s1", 2);
        await expect(checkoutService.confirm({
            userId: "u1", address_id: "addr-1", buy_now_items: [{ productId: "p1", variantId: "v1", quantity: 5 }]
        })).rejects.toThrow(/không đủ tồn kho/);
    });

    // --- TEST 6 (The Voucher Fix) ---
    it("should throw if voucher is invalid", async () => {
        mockAddressSuccess();
        mockProductChain("v1", "p1", "s1");

        // Mock Voucher.findOne to return null (simulating "not found")
        // We mock it without .lean() because your applyVoucher code doesn't use it
        Voucher.findOne.mockResolvedValue(null);

        // If your checkoutService.js expects an error thrown when applyVoucher returns an error:
        await expect(checkoutService.confirm({
            userId: "u1",
            address_id: "addr-1",
            voucher_code: "INVALID",
            buy_now_items: [{ variantId: "v1", productId: "p1" }]
        })).rejects.toMatchObject({ status: 400 });
    });

    // --- TEST 7 (Single Shop Success) ---
    it("should create single shop order successfully", async () => {
        mockAddressSuccess();
        mockProductChain("v1", "p1", "s1");

        // Explicitly return an object that HAS an _id property
        Order.create.mockImplementation(async (data) => {
            // If the service passes an array, we return an array. 
            // If it passes an object (which it does in your loop), we return the object + _id.
            return {
                ...data,
                _id: "mock-id",
                order_code: data.order_code || "ORD-MOCK"
            };
        });

        const result = await checkoutService.confirm({
            userId: "u1",
            address_id: "addr-1",
            buy_now_items: [{ variantId: "v1", productId: "p1" }]
        });

        // Verification
        expect(result).toBeDefined();
        expect(result.orders[0].order_id).toBe("mock-id"); // Check inside the array first
        expect(result.order_id).toBe("mock-id");          // Then check the top-level
    });

    // --- TEST 8 (Multi-Shop) ---
    it("should create multiple orders for multiple shops", async () => {
        mockAddressSuccess();

        // 1. Mock Variants: Return specific data based on the ID passed
        ProductVariant.findById.mockImplementation((id) => ({
            lean: jest.fn().mockResolvedValue({
                _id: id,
                product_id: id === "v1" ? "p1" : "p2",
                stock: 10,
                price: 100
            })
        }));

        // 2. Mock Products: THIS IS THE KEY. We must return DIFFERENT shop_ids.
        Product.findById.mockImplementation((id) => ({
            lean: jest.fn().mockResolvedValue({
                _id: id,
                shop_id: id === "p1" ? "SHOP_A" : "SHOP_B"
            })
        }));

        // 3. Mock Order.create: It should return whatever array of objects it receives
        Order.create.mockImplementation((data) => {
            const orders = Array.isArray(data) ? data : [data];
            return Promise.resolve(orders.map((o, i) => ({ ...o, _id: `mock-id-${i}` })));
        });

        // 4. Execute
        const result = await checkoutService.confirm({
            userId: "u1",
            address_id: "addr-1",
            buy_now_items: [
                { variantId: "v1", productId: "p1", quantity: 1 },
                { variantId: "v2", productId: "p2", quantity: 1 }
            ]
        });

        // 5. Verification
        expect(result.orders.length).toBe(2);
        expect(result.orders[0].shop_id).not.toBe(result.orders[1].shop_id);
    });

    // --- TEST 9 (Credit Capping) ---
    it("should cap credit usage to balance", async () => {
        mockAddressSuccess();
        // 1000 VND product, 1 quantity
        mockProductChain("v1", "p1", "s1", 10, 1000);

        // Mock the user's credit balance to be 200
        ShopCredit.findOne.mockResolvedValue({ balance: 200 });

        // IMPORTANT: The mock must return the data it receives!
        Order.create.mockImplementation(async (orderData) => {
            return {
                ...orderData, // This ensures credits_used and total_price are returned
                _id: "mock-order-id"
            };
        });

        const result = await checkoutService.confirm({
            userId: "u1",
            address_id: "addr-1",
            buy_now_items: [{ variantId: "v1", productId: "p1" }],
            credits_to_use: { "s1": 500 } // User tries to use 500
        });

        // Verification
        expect(result.orders).toBeDefined();
        expect(result.orders[0].credits_used).toBe(200); // Should be capped at 200
        expect(result.orders[0].total_price).toBe(800);  // 1000 - 200 = 800
    });

    // --- TEST 10 (Cart Save logic) ---
    it("should remove purchased items from cart after successful checkout", async () => {
        // ... setup IDs and mockAddressSuccess as before ...

        const mockSave = jest.fn().mockResolvedValue(true);
        const mockCart = {
            user_id: "u-999",
            items: [
                { _id: "item-123", variant_id: "v1", product_id: "p1", qty: 1, price: 100 },
                { _id: "item-456", variant_id: "v2", product_id: "p2", qty: 1, price: 200 }
            ],
            save: mockSave
        };

        // 1. FIXED MOCK: Chain findOne() and lean()
        // We mock findOne to return an object that HAS a lean method
        Cart.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockCart)
        });

        // 2. IMPORTANT: Your service also calls Cart.findOne LATER to clear the cart
        // Since the first call is used by resolveItems (with lean), 
        // and the second call (without lean) is used to clear the cart,
        // we should use mockReturnValueOnce for the first and mockResolvedValue for the rest.

        Cart.findOne
            .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(mockCart) }) // For resolveItems
            .mockResolvedValue(mockCart); // For the cart clearing at the end

        // ... rest of the mocks (Product, Variant, Order) ...

        const result = await checkoutService.confirm({
            userId: "u-999",
            address_id: "addr-1",
            selected_item_ids: ["item-123"]
        });

        expect(mockSave).toHaveBeenCalled();
        expect(mockCart.items.length).toBe(1);
    });
});