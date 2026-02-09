import { type Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

export function setupSecurityMiddleware(app: Express) {
  // Enable CORS with specific configuration
  const isDevelopment = process.env.NODE_ENV !== "production";
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || (
      isDevelopment
        ? ["http://localhost:5000", "http://localhost:3000"]
        : []
    ),
    credentials: true,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));

  const isDev = isDevelopment;

  // Helmet helps secure Express apps by setting HTTP response headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: isDev
            ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // unsafe-eval needed for Vite HMR in dev
            : ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: isDev
            ? ["'self'", "ws:", "wss:"]
            : ["'self'", "wss:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Rate limiting configuration
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to all API routes
  app.use("/api/", limiter);

  // Stricter rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login/signup requests per windowMs
    message: "Too many authentication attempts, please try again later.",
    skipSuccessfulRequests: true, // Don't count successful requests
  });

  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // Rate limit refresh endpoint to prevent token brute-force
  const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: "Too many token refresh attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth/refresh", refreshLimiter);
}
