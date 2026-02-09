import { type Express, type Request, type Response } from "express";
import { pool } from "../db";
import logger from "../logger";

interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  environment: string;
  database?: "connected" | "disconnected";
  error?: string;
}

export function setupHealthChecks(app: Express) {
  // Basic health check - returns 200 if server is up
  app.get("/health", (_req: Request, res: Response) => {
    const healthcheck: HealthCheckResponse = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    };

    res.status(200).json(healthcheck);
  });

  // Readiness check - checks if server is ready to accept traffic (includes DB check)
  app.get("/ready", async (_req: Request, res: Response) => {
    try {
      // Check database connection
      await pool.query("SELECT 1");

      const readiness: HealthCheckResponse = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        database: "connected",
      };

      res.status(200).json(readiness);
    } catch (error) {
      logger.error("Readiness check failed:", error);

      const readiness: HealthCheckResponse = {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      };

      res.status(503).json(readiness);
    }
  });

  // Liveness check - simple check to see if the server is running
  app.get("/live", (_req: Request, res: Response) => {
    res.status(200).send("OK");
  });
}
