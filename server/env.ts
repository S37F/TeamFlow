import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  PORT: z.string().regex(/^\d+$/).transform(Number).default("5000"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  ALLOWED_ORIGINS: z.string().optional(),
  APP_URL: z.string().url().optional(),
  /** Use `none` when the SPA is on another origin (e.g. Vercel) than the API (e.g. Railway). Requires HTTPS. */
  REFRESH_COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);
    console.log("✅ Environment validation successful");
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("\n❌ Invalid environment variables:");
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      console.error("\nPlease check your .env file and ensure all required variables are set.\n");
      process.exit(1);
    }
    throw error;
  }
}
