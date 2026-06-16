import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KisAuthClient } from "./kis-auth-client";

describe("KIS Auth Client Checks", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    KisAuthClient.clearCache();
    process.env.KIS_APP_KEY = "test_app_key";
    process.env.KIS_APP_SECRET = "test_app_secret";
    process.env.KIS_REST_URL = "https://mock.kis.com";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("should implement single-flight locking for token requests", async () => {
    // Mock global fetch to count the token calls
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      // Simulate slight network delay to guarantee concurrency
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        ok: true,
        json: async () => ({
          access_token: "mocked_bearer_token",
          token_type: "Bearer",
          expires_in: 7200,
        }),
      } as Response;
    });

    // Run 5 requests concurrently
    const tokens = await Promise.all([
      KisAuthClient.getAccessToken(),
      KisAuthClient.getAccessToken(),
      KisAuthClient.getAccessToken(),
      KisAuthClient.getAccessToken(),
      KisAuthClient.getAccessToken(),
    ]);

    // All should return the same token
    tokens.forEach((tok) => {
      expect(tok).toBe("mocked_bearer_token");
    });

    // Fetch should be called exactly once
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
