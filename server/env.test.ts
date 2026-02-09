import { describe, it, expect, vi, afterEach } from "vitest";

describe("Environment Validation", () => {
  const originalEnv = { ...process.env };
  const originalExit = process.exit;
  const originalConsoleError = console.error;

  afterEach(() => {
    process.env = { ...originalEnv };
    process.exit = originalExit;
    console.error = originalConsoleError;
    vi.resetModules();
  });

  it("should export validateEnv function", async () => {
    const { validateEnv } = await import("./env");
    expect(typeof validateEnv).toBe("function");
  });

  it("should call process.exit(1) if JWT_ACCESS_SECRET is missing", async () => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    
    // Mock process.exit to throw so we catch it
    const exitError = new Error("process.exit called");
    process.exit = vi.fn(() => { throw exitError; }) as unknown as (code?: number) => never;
    console.error = vi.fn();
    
    vi.resetModules();
    const { validateEnv } = await import("./env");
    
    expect(() => validateEnv()).toThrow("process.exit called");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should call process.exit(1) if JWT_ACCESS_SECRET is too short", async () => {
    process.env.JWT_ACCESS_SECRET = "short";
    process.env.JWT_REFRESH_SECRET = "test_jwt_refresh_secret_that_is_at_least_32_characters_long";
    
    const exitError = new Error("process.exit called");
    process.exit = vi.fn(() => { throw exitError; }) as unknown as (code?: number) => never;
    console.error = vi.fn();
    
    vi.resetModules();
    const { validateEnv } = await import("./env");
    
    expect(() => validateEnv()).toThrow("process.exit called");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should not call process.exit with valid env vars", async () => {
    process.env.JWT_ACCESS_SECRET = "test_jwt_access_secret_that_is_at_least_32_characters_long";
    process.env.JWT_REFRESH_SECRET = "test_jwt_refresh_secret_that_is_at_least_32_characters_long";
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
    
    const mockExit = vi.fn() as unknown as (code?: number) => never;
    process.exit = mockExit;
    
    vi.resetModules();
    const { validateEnv } = await import("./env");
    
    validateEnv();
    expect(mockExit).not.toHaveBeenCalled();
  });
});
