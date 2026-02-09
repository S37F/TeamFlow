import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

// Must set env vars before importing the auth module
const TEST_ACCESS_SECRET = "test_jwt_access_secret_that_is_at_least_32_characters_long";
const TEST_REFRESH_SECRET = "test_jwt_refresh_secret_that_is_at_least_32_characters_long";

// Mock the database module
vi.mock("../db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock logger
vi.mock("../logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  generateAccessToken,
  generateRefreshTokenValue,
  authenticateToken,
  requireRole,
  getAccessSecret,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
  type JwtPayload,
} from "./auth";

import type { Request, Response, NextFunction } from "express";

function createMockUser() {
  return {
    id: 1,
    username: "testuser",
    password: "hashed",
    role: "owner" as const,
    organizationId: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockReqRes() {
  const req = {
    headers: {},
    cookies: {},
  } as unknown as Request;
  
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    sendStatus: vi.fn(),
  } as unknown as Response;
  
  const next = vi.fn() as NextFunction;
  
  return { req, res, next };
}

describe("Auth Middleware", () => {
  describe("generateAccessToken", () => {
    it("should generate a valid JWT", () => {
      const user = createMockUser();
      const token = generateAccessToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      
      const decoded = jwt.verify(token, TEST_ACCESS_SECRET) as JwtPayload;
      expect(decoded.userId).toBe(user.id);
      expect(decoded.organizationId).toBe(user.organizationId);
      expect(decoded.role).toBe(user.role);
      expect(decoded.username).toBe(user.username);
    });
  });

  describe("generateRefreshTokenValue", () => {
    it("should generate a hex string of 80 characters", () => {
      const token = generateRefreshTokenValue();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(80); // 40 bytes = 80 hex chars
    });

    it("should generate unique tokens", () => {
      const token1 = generateRefreshTokenValue();
      const token2 = generateRefreshTokenValue();
      expect(token1).not.toBe(token2);
    });
  });

  describe("authenticateToken", () => {
    it("should reject requests without Authorization header", () => {
      const { req, res, next } = createMockReqRes();
      
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Access token required",
        code: "TOKEN_MISSING",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject invalid tokens", () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = "Bearer invalidtoken";
      
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid access token",
        code: "TOKEN_INVALID",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject expired tokens", () => {
      const { req, res, next } = createMockReqRes();
      const expiredToken = jwt.sign(
        { userId: 1, organizationId: 1, role: "owner", username: "test" },
        TEST_ACCESS_SECRET,
        { expiresIn: "0s" }
      );
      // Wait a tiny bit so the token is actually expired
      req.headers.authorization = `Bearer ${expiredToken}`;
      
      // Force it to be expired by verifying after a small time sync issue
      // jwt with 0s expiry should be immediately expired
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "TOKEN_EXPIRED",
        })
      );
    });

    it("should accept valid tokens and populate req.user", () => {
      const { req, res, next } = createMockReqRes();
      const user = createMockUser();
      const token = generateAccessToken(user);
      req.headers.authorization = `Bearer ${token}`;
      
      authenticateToken(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeDefined();
      expect((req as any).user.userId).toBe(user.id);
      expect((req as any).user.organizationId).toBe(user.organizationId);
    });
  });

  describe("requireRole", () => {
    it("should allow users with the correct role", () => {
      const { req, res, next } = createMockReqRes();
      (req as any).user = {
        userId: 1,
        organizationId: 1,
        role: "owner",
        username: "test",
      };
      
      requireRole("owner")(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it("should reject users without the required role", () => {
      const { req, res, next } = createMockReqRes();
      (req as any).user = {
        userId: 1,
        organizationId: 1,
        role: "member",
        username: "test",
      };
      
      requireRole("owner", "admin")(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INSUFFICIENT_ROLE" })
      );
    });

    it("should allow any of multiple roles", () => {
      const { req, res, next } = createMockReqRes();
      (req as any).user = {
        userId: 1,
        organizationId: 1,
        role: "admin",
        username: "test",
      };
      
      requireRole("owner", "admin")(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it("should reject if no user present", () => {
      const { req, res, next } = createMockReqRes();
      
      requireRole("owner")(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "AUTH_REQUIRED" })
      );
    });
  });

  describe("Cookie helpers", () => {
    it("should set refresh token cookie with correct options", () => {
      const { res } = createMockReqRes();
      
      setRefreshCookie(res, "test_token_value");
      
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        "test_token_value",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
          path: "/api/auth",
        })
      );
    });

    it("should clear refresh token cookie", () => {
      const { res } = createMockReqRes();
      
      clearRefreshCookie(res);
      
      expect(res.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
          path: "/api/auth",
        })
      );
    });

    it("should have correct cookie name", () => {
      expect(REFRESH_COOKIE_NAME).toBe("teamflow_refresh");
    });
  });

  describe("getAccessSecret", () => {
    it("should return the JWT access secret", () => {
      const secret = getAccessSecret();
      expect(secret).toBe(TEST_ACCESS_SECRET);
    });

    it("should allow jwt.verify to reject tokens signed with wrong key", () => {
      const forgedToken = jwt.sign(
        { userId: 999, organizationId: 1, role: "owner", username: "attacker" },
        "a_completely_different_secret_key_that_is_32_chars",
        { expiresIn: "15m" }
      );

      expect(() => {
        jwt.verify(forgedToken, getAccessSecret());
      }).toThrow();
    });

    it("should verify tokens signed with the correct secret", () => {
      const user = createMockUser();
      const token = generateAccessToken(user);
      const payload = jwt.verify(token, getAccessSecret()) as JwtPayload;
      expect(payload.userId).toBe(user.id);
    });
  });
});
