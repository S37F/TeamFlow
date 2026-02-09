// Server test setup
import { vi } from "vitest";

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/teamflow_test";
process.env.JWT_ACCESS_SECRET = "test_jwt_access_secret_that_is_at_least_32_characters_long";
process.env.JWT_REFRESH_SECRET = "test_jwt_refresh_secret_that_is_at_least_32_characters_long";
process.env.PORT = "0"; // Use random port in tests
process.env.LOG_LEVEL = "error"; // Reduce noise in tests
