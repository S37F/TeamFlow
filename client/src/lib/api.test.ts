import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccessToken, setAccessToken } from "./api";

// Mock the global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("api module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAccessToken(null);
  });

  describe("Token management", () => {
    it("should start with null access token", () => {
      expect(getAccessToken()).toBeNull();
    });

    it("should store and retrieve access token", () => {
      setAccessToken("test-token-123");
      expect(getAccessToken()).toBe("test-token-123");
    });

    it("should clear access token when set to null", () => {
      setAccessToken("test-token");
      setAccessToken(null);
      expect(getAccessToken()).toBeNull();
    });
  });
});
