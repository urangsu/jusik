import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchCryptoFearGreed } from "./alternative-me-crypto-fng-client";

describe("fetchCryptoFearGreed", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it("returns default 50 when disabled", async () => {
    process.env.CRYPTO_FEAR_GREED_ENABLED = "false";

    const snap = await fetchCryptoFearGreed();
    expect(snap.value).toBe(50);
    expect(snap.label).toBe("neutral");
  });

  it("returns parsed value when enabled and fetch succeeds", async () => {
    process.env.CRYPTO_FEAR_GREED_ENABLED = "true";
    process.env.ALTERNATIVE_ME_FNG_BASE_URL = "http://localhost/mock";

    const mockResponse = {
      data: [{ value: "79", value_classification: "Extreme Greed" }],
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const snap = await fetchCryptoFearGreed();
    expect(snap.value).toBe(79);
    expect(snap.label).toBe("extreme_greed");
  });

  it("falls back to 50 on fetch failure", async () => {
    process.env.CRYPTO_FEAR_GREED_ENABLED = "true";
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network failed"));

    const snap = await fetchCryptoFearGreed();
    expect(snap.value).toBe(50);
    expect(snap.label).toBe("neutral");
    expect(snap.warnings).toContain("personal_use_only");
  });
});
