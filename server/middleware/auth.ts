import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { db } from "../db";
import { refreshTokens, users, type User } from "@shared/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import logger from "../logger";

// === Types ===

export interface JwtPayload {
  userId: number;
  organizationId: number;
  role: "owner" | "admin" | "member";
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// === Configuration ===

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be set and at least 32 characters");
  }
  return secret;
}

// === Token Generation ===

export function generateAccessToken(user: Pick<User, "id" | "organizationId" | "role" | "username">): string {
  const payload: JwtPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role as JwtPayload["role"],
    username: user.username,
  };
  return jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshTokenValue(): string {
  return randomBytes(40).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function storeRefreshToken(userId: number, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  
  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });
}

export async function validateRefreshToken(token: string): Promise<number | null> {
  const tokenHash = hashToken(token);
  
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        gt(refreshTokens.expiresAt, new Date())
      )
    );

  if (!stored) return null;
  
  // Delete the used token (rotation)
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
  
  return stored.userId;
}

export async function revokeUserRefreshTokens(userId: number): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export async function cleanupExpiredTokens(): Promise<void> {
  const result = await db
    .delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, new Date()));
  logger.debug("Cleaned up expired refresh tokens");
}

// === Middleware ===

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Access token required", code: "TOKEN_MISSING" });
    return;
  }

  try {
    const payload = jwt.verify(token, getAccessSecret()) as JwtPayload;
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Access token expired", code: "TOKEN_EXPIRED" });
      return;
    }
    res.status(401).json({ error: "Invalid access token", code: "TOKEN_INVALID" });
    return;
  }
}

export function requireRole(...roles: Array<"owner" | "admin" | "member">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    
    if (!roles.includes(user.role)) {
      res.status(403).json({ 
        error: `This action requires one of these roles: ${roles.join(", ")}`,
        code: "INSUFFICIENT_ROLE" 
      });
      return;
    }
    
    next();
  };
}

// Refresh token cookie configuration
export const REFRESH_COOKIE_NAME = "teamflow_refresh";

function refreshCookieBaseOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
} {
  const raw = process.env.REFRESH_COOKIE_SAME_SITE;
  const sameSite: "strict" | "lax" | "none" =
    raw === "none" || raw === "lax" || raw === "strict" ? raw : "strict";
  const secure =
    sameSite === "none" ? true : process.env.NODE_ENV === "production";
  return { httpOnly: true, secure, sameSite, path: "/api/auth" };
}

export function setRefreshCookie(res: Response, token: string): void {
  const base = refreshCookieBaseOptions();
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...base,
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions());
}

// Periodic cleanup — run every hour (skip in test environment)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

if (process.env.NODE_ENV !== "test") {
  cleanupInterval = setInterval(() => {
    cleanupExpiredTokens().catch((err) => {
      logger.error("Failed to cleanup expired tokens", { error: err.message });
    });
  }, 60 * 60 * 1000);
}

export function stopCleanupInterval(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
