import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { validateEnv } from "./env";
import { setupSecurityMiddleware } from "./middleware/security";
import { setupHealthChecks } from "./middleware/health";
import { setupCompression, metricsMiddleware } from "./middleware/performance";
import { stopCleanupInterval } from "./middleware/auth";
import { pool } from "./db";
import { setupSocketIO } from "./socket";
import logger from "./logger";

// Validate environment variables before starting
validateEnv();

const app = express();
const httpServer = createServer(app);

// Trust proxy for correct IP detection behind Nginx/load balancer
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Setup health check endpoints (before other middleware)
setupHealthChecks(app);

// Setup compression middleware
setupCompression(app);

// Setup security middleware (helmet, CORS, rate limiting)
setupSecurityMiddleware(app);

// Setup performance metrics middleware
app.use(metricsMiddleware);

// Body parsing with size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Cookie parser for refresh tokens
app.use(cookieParser());

// Setup Socket.io
setupSocketIO(httpServer);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    if (res.statusCode >= 400) {
      logger.warn("Request completed with error", logData);
    } else if (req.path.startsWith("/api")) {
      logger.info("API request", logData);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error("Request error", {
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      ip: req.ip,
      status,
    });

    if (res.headersSent) {
      return;
    }

    const errorResponse = {
      error: process.env.NODE_ENV === "production" && status === 500 
        ? "Internal Server Error" 
        : message,
      code: "INTERNAL_ERROR",
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    };

    return res.status(status).json(errorResponse);
  });

  // Setup static serving or Vite dev server (set SERVE_STATIC=false when the SPA is hosted elsewhere, e.g. Vercel)
  if (process.env.NODE_ENV === "production") {
    if (process.env.SERVE_STATIC !== "false") {
      serveStatic(app);
    }
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    logger.info("Server started successfully", {
      port,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
    });
    console.log(`\n✅ Server running on http://localhost:${port}`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}\n`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down gracefully...");
    
    // Stop background intervals
    stopCleanupInterval();
    
    httpServer.close(async () => {
      logger.info("HTTP server closed");
      
      try {
        await pool.end();
        logger.info("Database pool closed");
      } catch (err) {
        logger.error("Error closing database pool", { error: err });
      }
      
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})().catch((err) => {
  logger.error("Failed to start server", { error: err.message, stack: err.stack });
  console.error("\n❌ Failed to start server:", err.message);
  process.exit(1);
});
