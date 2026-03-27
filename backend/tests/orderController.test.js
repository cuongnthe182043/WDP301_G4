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

describe("Order Controller - Test Case Specification", () => {
    let mockReq, mockRes, mockNext, mockOrder;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();

        // Base mock order object
        mockOrder = {
            _id: "ord_123",
            order_code: "ORD-ABC",
            user_id: "u1",
            status: "pending",
            total_price: 100000,
            status_history: [],
            save: jest.fn().mockResolvedValue(true)
        };

        Order.findOne = jest.fn();
        Shop.findById = jest.fn();
        refundSvc.isRefundable = jest.fn().mockReturnValue(false); // Default: not refundable
        refundSvc.processAutoRefund = jest.fn();
    });

    // ==========================================
    // CONDITION: cancel()
    // ==========================================
    describe("Condition: cancel()", () => {

        // --- NORMAL (N) ---
        describe("Precondition: Order Status Eligible, Payment Method: COD", () => {
            it("Confirm: Return T, wallet_credited: 0 | Type: N", async () => {
                // CONDITION:
                mockOrder.payment_method = "COD";
                mockOrder.total_price = 100000;
                Order.findOne.mockResolvedValue(mockOrder);

                // Logic: refundSvc.isRefundable should return false for COD
                refundSvc.isRefundable.mockReturnValue(false);

                mockReq = { userId: "u1", params: { id: "ord_123" } };

                // EXECUTE:
                await orderController.cancel(mockReq, mockRes, mockNext);

                // CONFIRM:
                expect(refundSvc.processAutoRefund).not.toHaveBeenCalled();
                expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                    data: expect.objectContaining({
                        wallet_credited: 0, // No money back for COD
                        status: "canceled_by_customer"
                    })
                }));
            });
        });

        describe("Precondition: Order Status Eligible, Payment Method: WALLET", () => {
            it("Confirm: Return T, wallet_credited: 100000 | Type: N", async () => {
                // CONDITION:
                mockOrder.payment_method = "WALLET";
                mockOrder.total_price = 100000;
                Order.findOne.mockResolvedValue(mockOrder);

                // Logic: refundSvc.isRefundable returns true for Wallet
                refundSvc.isRefundable.mockReturnValue(true);
                refundSvc.processAutoRefund.mockResolvedValue(true);

                mockReq = { userId: "u1", params: { id: "ord_123" } };

                // EXECUTE:
                await orderController.cancel(mockReq, mockRes, mockNext);

                // CONFIRM:
                expect(refundSvc.processAutoRefund).toHaveBeenCalled();
                expect(mockOrder.payment_status).toBe("refunded");
                expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                    data: expect.objectContaining({
                        wallet_credited: 100000 // Full refund for Wallet
                    })
                }));
            });
        });

        // --- ABNORMAL (A) ---
        describe("Precondition: Connection OK, Order Query Failure", () => {

            it("Confirm: Return F, Status: 404, Message: 'Không tìm thấy đơn' | Type: A", async () => {
                // Condition: Database returns null
                Order.findOne.mockResolvedValue(null);
                mockReq = { userId: "u1", params: { id: "invalid_id" } };

                await orderController.cancel(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(404);
                expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                    message: "Không tìm thấy đơn"
                }));
            });
        });

        describe("Precondition: Order exists, Ineligible Status", () => {

            it("Confirm: Return F, Status: 400, Message: 'không thể hủy ở trạng thái hiện tại' | Type: A", async () => {
                // Condition: Status is 'shipping' (NOT in CUSTOMER_CANCELLABLE set)
                mockOrder.status = "shipping";
                Order.findOne.mockResolvedValue(mockOrder);
                mockReq = { userId: "u1", params: { id: "ord_123" } };

                await orderController.cancel(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                    message: "Đơn hàng không thể hủy ở trạng thái hiện tại."
                }));
            });
        });
    });
});