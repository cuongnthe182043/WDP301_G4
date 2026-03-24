const userService = require("../src/services/userService");
const User = require("../src/models/User");
const Shop = require("../src/models/Shop");
const Address = require("../src/models/Address");

jest.mock("../src/models/User");
jest.mock("../src/models/Shop");
jest.mock("../src/models/Address");

describe("userService.registerShop", () => {
    let mockUser, mockPayload, mockAddr;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUser = {
            _id: "user_123",
            avatar_url: "logo.png",
            phone: "0901112222",
            email: "user@test.com"
        };

        mockAddr = {
            _id: "addr_999",
            user_id: "user_123",
            phone: "0903334444"
        };

        mockPayload = {
            shop_name: "Test Shop",
            slug: "test-shop",
            address_id: "addr_999",
            phone: "0905556666",
            email: "shop@test.com"
        };

        // Default mocks
        User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockUser) });
        Address.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockAddr) });
        Shop.findOne.mockResolvedValue(null); // No existing shop, slug is free
    });

    it("should successfully create a shop using payload contact info", async () => {
        Shop.create.mockResolvedValue({
            toObject: () => ({ shop_name: "Test Shop", phone: "0905556666" })
        });

        const result = await userService.registerShop("user_123", mockPayload);

        expect(Shop.create).toHaveBeenCalledWith(expect.objectContaining({
            phone: "0905556666",
            email: "shop@test.com"
        }));
    });

    it("should fallback to user email if payload email is missing", async () => {
        const payload = { ...mockPayload, email: "" };
        Shop.create.mockResolvedValue({ toObject: () => ({}) });

        await userService.registerShop("user_123", payload);

        expect(Shop.create).toHaveBeenCalledWith(expect.objectContaining({
            email: "user@test.com"
        }));
    });

    it("should throw 400 if user email is missing and no email in payload", async () => {
        User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ ...mockUser, email: "" }) });
        const payload = { ...mockPayload, email: "" };

        await expect(userService.registerShop("user_123", payload))
            .rejects.toThrow("User does not have an email address");
    });

    it("should fallback to addr.phone if payload and user phone are missing", async () => {
        const payload = { ...mockPayload, phone: "" };
        User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ ...mockUser, phone: "" }) });
        Shop.create.mockResolvedValue({ toObject: () => ({}) });

        await userService.registerShop("user_123", payload);

        expect(Shop.create).toHaveBeenCalledWith(expect.objectContaining({
            phone: "0903334444" // Taken from mockAddr
        }));
    });

    it("should throw 400 if no phone is found in payload, user, OR address", async () => {
        const payload = { ...mockPayload, phone: "" };
        User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ ...mockUser, phone: "" }) });
        Address.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ ...mockAddr, phone: "" }) });

        await expect(userService.registerShop("user_123", payload))
            .rejects.toThrow("No valid phone number available");
    });

    it("should check if slug exists using the correct field 'shop_slug'", async () => {
        // 1st call: check existing shop for user (Step 2) -> returns null
        Shop.findOne.mockResolvedValueOnce(null);
        // 2nd call: check slug availability (Step 4) -> returns a shop
        Shop.findOne.mockResolvedValueOnce({ _id: "other_shop" });

        await expect(userService.registerShop("user_123", mockPayload))
            .rejects.toThrow("Shop slug already exists");

        expect(Shop.findOne).toHaveBeenNthCalledWith(2, { shop_slug: mockPayload.slug });
    });

    it("should throw 404 if user is not found", async () => {
        User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

        try {
            await userService.registerShop("user_123", mockPayload);
        } catch (e) {
            expect(e.status).toBe(404);
            expect(e.message).toBe("User not found");
        }
    });
});