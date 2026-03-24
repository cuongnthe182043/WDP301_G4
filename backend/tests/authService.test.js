const authService = require("../src/services/authService");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const bcrypt = require("bcryptjs");
const jwtUtils = require("../src/utils/jwt");

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
jest.mock("google-auth-library", () => {
    return {
        OAuth2Client: jest.fn().mockImplementation(() => ({
            verifyIdToken: jest.fn().mockResolvedValue({
                getPayload: () => ({
                    email: "google-user@gmail.com",
                    name: "Google User",
                    picture: "https://avatar.url",
                    email_verified: true,
                }),
            }),
        })),
    };
});

describe("Auth Service Tests", () => {
    let mockUser;

    beforeEach(() => {
        jest.clearAllMocks();

        // 2. Explicitly mock User.create (Mongoose models need this in Jest)
        User.create = jest.fn();

        // 3. Define a fresh mockUser for every test
        mockUser = {
            _id: "u123",
            password_hash: "hashed_secret",
            role_id: "r123",
            save: jest.fn().mockResolvedValue(true),
            toObject: jest.fn().mockReturnValue({
                _id: "u123",
                password_hash: "hashed_secret",
                refresh_token: "old-token",
                wishlist: [],
                recently_viewed: [],
                violation_history: []
            })
        };

        // Default Success Behaviors
        bcrypt.compare.mockResolvedValue(true);
        jwtUtils.generateAccessToken.mockResolvedValue("access-token");
        jwtUtils.generateRefreshToken.mockResolvedValue("refresh-token");

        // Mock for Role lookups
        Role.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({ name: "customer", permissions: [] })
        });
        Role.findOne.mockResolvedValue({ _id: "role-id", name: "customer" });
    });

    describe("login()", () => {
        it("1. should login successfully (Happy Path)", async () => {
            User.findOne.mockResolvedValue(mockUser);
            const result = await authService.login("test@test.com", "password");
            expect(result.accessToken).toBe("access-token");
            expect(mockUser.save).toHaveBeenCalled();
        });

        it("2. should throw error if user not found", async () => {
            User.findOne.mockResolvedValue(null);
            await expect(authService.login("bad@test.com", "pass"))
                .rejects.toThrow("Tài khoản không tồn tại");
        });

        it("3. should throw error if password is wrong", async () => {
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);
            await expect(authService.login("test@test.com", "wrong"))
                .rejects.toThrow("Sai mật khẩu");
        });

        it("4. should search by identifier fields", async () => {
            User.findOne.mockResolvedValue(mockUser);
            await authService.login("MY_ID", "pass");
            expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
                $or: expect.arrayContaining([{ email: "my_id" }])
            }));
        });

        it("5.should trim and lowercase the identifier if the service is updated", async () => {
            User.findOne.mockResolvedValue(mockUser);

            // This test forces you to fix the bug in your service!
            const rawInput = "  USER@Gmail.com  ";
            const cleanedInput = "user@gmail.com";

            await authService.login(rawInput, "pass");

            expect(User.findOne).toHaveBeenCalledWith({
                $or: [
                    { email: cleanedInput },
                    { username: cleanedInput },
                    { phone: cleanedInput }
                ]
            });
        });

        it("6. should scrub sensitive fields from the user object", async () => {
            User.findOne.mockResolvedValue(mockUser);
            const result = await authService.login("test@test.com", "pass");
            expect(result.user.password_hash).toBeUndefined();
            expect(result.user.refresh_token).toBeUndefined();
        });

        it("7. should handle missing role gracefully", async () => {
            User.findOne.mockResolvedValue(mockUser);
            Role.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
            const result = await authService.login("test@test.com", "pass");
            expect(result.user.role_name).toBeNull();
        });

        it("8. should update last_login date", async () => {
            User.findOne.mockResolvedValue(mockUser);
            await authService.login("test@test.com", "pass");
            expect(mockUser.last_login).toBeInstanceOf(Date);
        });
    });

    describe("googleLogin()", () => {
        it("9. should create a new user if email does not exist", async () => {
            User.findOne.mockResolvedValueOnce(null); // No user by email
            User.findOne.mockResolvedValueOnce(null); // No username collision
            User.create.mockResolvedValue(mockUser);

            const result = await authService.googleLogin("mock-google-token");

            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
                email: "google-user@gmail.com",
                role_id: "role-id"
            }));
            expect(result.accessToken).toBe("access-token");
        });

        it("10. should increment username if the base username is already taken", async () => {
            User.findOne.mockResolvedValueOnce(null); // No user by email

            // Simulate: 'google-user' exists, 'google-user1' is free
            User.findOne
                .mockResolvedValueOnce({ username: "google-user" })
                .mockResolvedValueOnce(null);

            User.create.mockResolvedValue(mockUser);

            await authService.googleLogin("mock-google-token");

            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
                username: "google-user1"
            }));
        });
    });
});