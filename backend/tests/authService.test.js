const authService = require("../src/services/authService");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const bcrypt = require("bcryptjs");
const jwtUtils = require("../src/utils/jwt");
const { OAuth2Client } = require('google-auth-library');

// 1. Mock all dependencies
jest.mock("../src/models/User");
jest.mock("../src/models/Role");
jest.mock("bcryptjs");
jest.mock("../src/utils/jwt");
jest.mock("../src/config/redis", () => ({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
}));
jest.mock('google-auth-library');

describe("Auth Service - Test Case Specification", () => {
    let mockUser;
    const TEST_EMAIL = "user@example.com";

    beforeEach(() => {
        jest.clearAllMocks();
        User.create = jest.fn();

        // The mock user object needs to mimic a Mongoose document
        mockUser = {
            _id: "u123",
            email: TEST_EMAIL,
            password_hash: "hashed_secret",
            role_id: "r123",
            save: jest.fn().mockResolvedValue(true),
            toObject: jest.fn().mockReturnValue({
                _id: "u123",
                email: TEST_EMAIL,
                password_hash: "hashed_secret",
                refresh_token: "old-token",
                wishlist: [],
                recently_viewed: [],
                violation_history: []
            })
        };

        bcrypt.compare.mockResolvedValue(true);
        jwtUtils.generateAccessToken.mockResolvedValue("access-token");
        jwtUtils.generateRefreshToken.mockResolvedValue("refresh-token");

        // Mock Role lookup to return permissions array as per your logic
        Role.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({ name: "customer", permissions: ["read:products"] })
        });
    });

    // ==========================================
    // CONDITION: login()
    // ==========================================
    describe("Condition: login()", () => {

        // --- NORMAL (N) ---
        describe("Precondition: Can connect with server, Valid Credentials", () => {
            it("Confirm: Return T, Data: Tokens & Safe User | Type: N", async () => {
                // Email: Registered Email
                User.findOne.mockResolvedValue(mockUser);

                const result = await authService.login(TEST_EMAIL, "password123");

                // Confirm Returns
                expect(result.accessToken).toBe("access-token");
                expect(result.refreshToken).toBe("refresh-token");

                // Confirm Security (Scrubbed fields)
                expect(result.user.password_hash).toBeUndefined();
                expect(result.user.refresh_token).toBeUndefined();
                expect(result.user.wishlist).toBeUndefined();

                // Confirm Role Enrichment
                expect(result.user.role_name).toBe("customer");
                expect(result.user.permissions).toContain("read:products");
            });
        });

        // --- ABNORMAL (A) ---
        describe("Precondition: Can connect with server, User not found", () => {
            it("Confirm: Return F, Exception: 'Tài khoản không tồn tại' | Type: A", async () => {
                // Scenario: Identifier doesn't match email, username, or phone
                User.findOne.mockResolvedValue(null);

                await expect(authService.login("unknown@email.com", "pass"))
                    .rejects.toThrow("Tài khoản không tồn tại");
            });
        });

        describe("Precondition: Valid User found, Incorrect Password", () => {
            it("Confirm: Return F, Exception: 'Sai mật khẩu' | Type: A", async () => {
                // Scenario: bcrypt.compare returns false
                User.findOne.mockResolvedValue(mockUser);
                bcrypt.compare.mockResolvedValue(false);

                await expect(authService.login(TEST_EMAIL, "wrongpassword"))
                    .rejects.toThrow("Sai mật khẩu");
            });
        });

        // --- BOUNDARY (B) ---
        describe("Precondition: Can connect with server, Messy Input", () => {
            it("Confirm: Return T, Log: Successfully handled cleaning | Type: B", async () => {
                // Scenario: Input has spaces and uppercase "  USER@Example.com  "
                User.findOne.mockResolvedValue(mockUser);

                await authService.login("  USER@Example.com  ", "password123");

                // Verify the $or query used the cleaned string "user@example.com"
                expect(User.findOne).toHaveBeenCalledWith({
                    $or: [
                        { email: "user@example.com" },
                        { username: "user@example.com" },
                        { phone: "user@example.com" }
                    ]
                });
            });
        });
    });

    // ==========================================
    // CONDITION: googleLogin()
    // ==========================================
    describe("authService.googleLogin()", () => {
        const mockGooglePayload = {
            email: "test-user@gmail.com",
            name: "Test User",
            picture: "https://avatar.url",
        };

        const mockRole = { _id: "role-123", name: "customer", permissions: ["read"] };
        let mockVerifyIdToken;

        beforeEach(() => {
            jest.clearAllMocks();

            // 1. Setup the mock function to return a "ticket" object
            // This "ticket" object MUST have the getPayload method
            mockVerifyIdToken = jest.fn().mockResolvedValue({
                getPayload: () => mockGooglePayload
            });

            // 2. Apply the mock to the OAuth2Client prototype or instance
            OAuth2Client.prototype.verifyIdToken = mockVerifyIdToken;
        });

        describe("Scenario: New Google User", () => {
            it("Confirm: Return T, Data: New Account Created | Type: N", async () => {
                // --- PRECONDITION ---
                User.findOne.mockResolvedValueOnce(null); // No user by email
                Role.findOne.mockResolvedValue(mockRole); // Role exists

                // Mocking the Role lookup chain for the final return
                Role.findById.mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockRole)
                });

                // Mocking username uniqueness check loop
                User.findOne.mockResolvedValueOnce(null);

                const savedUser = {
                    ...mockGooglePayload,
                    _id: "new-user-id",
                    role_id: mockRole._id,
                    status: "active",
                    toObject: jest.fn().mockReturnValue({ email: mockGooglePayload.email }),
                    save: jest.fn().mockResolvedValue(true)
                };
                User.create.mockResolvedValue(savedUser);

                // --- EXECUTE ---
                const result = await authService.googleLogin("mock-google-token");

                // --- CONFIRM ---
                expect(mockVerifyIdToken).toHaveBeenCalled();
                expect(User.create).toHaveBeenCalled();
                expect(result).toHaveProperty("accessToken");
            });

            describe("Scenario: Existing Google User", () => {
                it("Confirm: Return T, Data: Existing User Login | Type: N", async () => {
                    const existingUser = {
                        _id: "existing-id",
                        email: "test-user@gmail.com",
                        role_id: "role-123",
                        status: "active",
                        toObject: jest.fn().mockReturnValue({ email: "test-user@gmail.com" }),
                        save: jest.fn().mockResolvedValue(true)
                    };

                    User.findOne.mockResolvedValue(existingUser);
                    Role.findById.mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockRole)
                    });

                    const result = await authService.googleLogin("mock-token");

                    expect(User.create).not.toHaveBeenCalled();
                    expect(result.user.email).toBe("test-user@gmail.com");
                });
            });
        });
        it("11. should login existing user without creating a new one (Normal Path)", async () => {
            // Condition: User already exists in the database
            User.findOne.mockResolvedValue(mockUser);

            const result = await authService.googleLogin("mock-google-token");

            // Confirmation: User.create should NOT be called
            expect(User.create).not.toHaveBeenCalled();

            // Confirmation: Returns tokens for the existing user
            expect(result.accessToken).toBe("access-token");
            expect(mockUser.save).toHaveBeenCalled(); // Should still update refresh token/last login
        });
    });
});