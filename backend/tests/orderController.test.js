const orderController = require("../src/controllers/orderController");
const Order = require("../src/models/Order");
const Shop = require("../src/models/Shop");
const refundSvc = require("../src/services/refundService");
const notif = require("../src/services/notificationService");

// 1. Consolidated Mocks
jest.mock("../src/models/Order");
jest.mock("../src/models/Shop");
jest.mock("../src/services/refundService");

// This factory function ensures the dynamic "safe" helpers are visible to Jest
jest.mock("../src/services/notificationService", () => ({
    orderCancelled: jest.fn().mockResolvedValue({ _id: "notif1" }),
    walletRefunded: jest.fn().mockResolvedValue({ _id: "notif2" }),
    create: jest.fn(),
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    deleteNotification: jest.fn(),
}));

describe("orderController.cancel", () => {
    let req, res, next, mockOrder;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup request/response mocks
        req = {
            userId: "user_123",
            params: { id: "ORD_999" },
            body: { reason: "Tôi muốn đổi sản phẩm" }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();

        // Setup a fake Mongoose Order object
        mockOrder = {
            _id: "654321",
            order_code: "ORD_999",
            user_id: "user_123",
            status: "order_created", // A cancellable status
            total_price: 150000,
            shop_id: "shop_456",
            status_history: [],
            save: jest.fn().mockResolvedValue(true),
            toObject: jest.fn().mockReturnThis()
        };
    });

    it("should successfully cancel and process a refund for prepaid orders", async () => {
        // 1. Mock Order found
        Order.findOne.mockResolvedValue(mockOrder);

        // 2. Mock Refund Service: Order is refundable
        refundSvc.isRefundable.mockReturnValue(true);

        // 3. Mock Shop lookup
        Shop.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({ owner_id: "owner_789" })
        });

        // 4. Mock Auto-Refund success
        refundSvc.processAutoRefund.mockResolvedValue({ customerTxn: {}, shopTxn: {} });

        await orderController.cancel(req, res, next);

        expect(mockOrder.status).toBe("canceled_by_customer");
        expect(mockOrder.payment_status).toBe("refunded");

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
                wallet_credited: 150000,
                status: "canceled_by_customer"
            })
        }));

    });

    it("should cancel but NOT refund if order is not refundable (e.g. COD)", async () => {
        Order.findOne.mockResolvedValue(mockOrder);

        // Mock Refund Service: Not refundable
        refundSvc.isRefundable.mockReturnValue(false);

        await orderController.cancel(req, res, next);

        expect(mockOrder.status).toBe("canceled_by_customer");
        expect(mockOrder.payment_status).not.toBe("refunded"); // Should remain original
        expect(mockOrder.save).toHaveBeenCalledTimes(1); // Only saved once

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ wallet_credited: 0 })
        }));
    });

    it("should return 400 if order is in a non-cancellable state (e.g. shipping)", async () => {
        mockOrder.status = "shipping"; // Not in the CUSTOMER_CANCELLABLE Set
        Order.findOne.mockResolvedValue(mockOrder);

        await orderController.cancel(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Đơn hàng không thể hủy ở trạng thái hiện tại."
        }));
    });

    it("should return 404 if order is not found for this user", async () => {
        Order.findOne.mockResolvedValue(null);

        await orderController.cancel(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Không tìm thấy đơn"
        }));
    });
});