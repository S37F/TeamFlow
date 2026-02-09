import { describe, it, expect, vi } from "vitest";

vi.mock("../logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Security Middleware Configuration", () => {
  it("should export setupSecurityMiddleware function", async () => {
    const { setupSecurityMiddleware } = await import("./security");
    expect(typeof setupSecurityMiddleware).toBe("function");
  });
});

describe("Health Check Endpoints", () => {
  it("should export setupHealthChecks function", async () => {
    vi.mock("../db", () => ({
      pool: { query: vi.fn(), end: vi.fn() },
    }));
    const { setupHealthChecks } = await import("./health");
    expect(typeof setupHealthChecks).toBe("function");
  });
});

describe("Performance Middleware", () => {
  it("should export performance utilities", async () => {
    const { setupCompression, metricsMiddleware, getMetrics } = await import("./performance");
    
    expect(typeof setupCompression).toBe("function");
    expect(typeof metricsMiddleware).toBe("function");
    expect(typeof getMetrics).toBe("function");
  });

  it("should return metrics with correct shape", async () => {
    const { getMetrics } = await import("./performance");
    const metrics = getMetrics();
    
    expect(metrics).toHaveProperty("totalRequests");
    expect(metrics).toHaveProperty("averageResponseTime");
    expect(metrics).toHaveProperty("slowRequests");
    expect(typeof metrics.totalRequests).toBe("number");
    expect(typeof metrics.averageResponseTime).toBe("number");
    expect(Array.isArray(metrics.slowRequests)).toBe(true);
  });
});
