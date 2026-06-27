import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveProviderReadiness } from "./provider-readiness-resolver";

describe("provider-readiness-resolver", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("all providers should be not_configured when no env keys are set", () => {
    // Clear relevant env vars
    const keys = [
      "KIS_APP_KEY", "KIS_APP_SECRET",
      "OPENDART_API_KEY", "FMP_API_KEY",
      "FINNHUB_API_KEY", "ALPHA_VANTAGE_API_KEY",
      "ALLOW_PERSONAL_FALLBACK", "ENABLE_YFINANCE_PERSONAL", "ENABLE_STOOQ_PERSONAL",
    ];
    for (const k of keys) {
      vi.stubEnv(k, "");
    }

    const checks = resolveProviderReadiness();
    expect(checks.length).toBeGreaterThan(0);

    const apiKeyProviders = checks.filter(
      (c) => !["yfinance_personal", "stooq_personal"].includes(c.providerId)
    );
    for (const c of apiKeyProviders) {
      expect(c.status).toBe("not_configured");
    }
  });

  it("secretsExposed is always false", () => {
    const checks = resolveProviderReadiness();
    for (const c of checks) {
      expect(c.secretsExposed).toBe(false);
    }
  });

  it("configuredKeys contains only key names, not values", () => {
    vi.stubEnv("KIS_APP_KEY", "my_secret_key_value");
    vi.stubEnv("KIS_APP_SECRET", "my_secret_value_123");

    const checks = resolveProviderReadiness();
    const kisCheck = checks.find((c) => c.providerId === "kis");
    expect(kisCheck).toBeDefined();

    // Key names should appear in configuredKeys
    expect(kisCheck!.configuredKeys).toContain("KIS_APP_KEY");
    expect(kisCheck!.configuredKeys).toContain("KIS_APP_SECRET");

    // Key values must NOT appear anywhere in the result
    const serialized = JSON.stringify(kisCheck);
    expect(serialized).not.toContain("my_secret_key_value");
    expect(serialized).not.toContain("my_secret_value_123");
  });

  it("kis becomes ready when all required keys are set", () => {
    vi.stubEnv("KIS_APP_KEY", "test_key");
    vi.stubEnv("KIS_APP_SECRET", "test_secret");

    const checks = resolveProviderReadiness();
    const kisCheck = checks.find((c) => c.providerId === "kis");
    expect(kisCheck!.status).toBe("ready");
    expect(kisCheck!.canRunSmoke).toBe(true);
  });

  it("personal fallback providers are personal_fallback_disabled without flags", () => {
    vi.stubEnv("ALLOW_PERSONAL_FALLBACK", "");
    vi.stubEnv("ENABLE_YFINANCE_PERSONAL", "");
    vi.stubEnv("ENABLE_STOOQ_PERSONAL", "");

    const checks = resolveProviderReadiness();
    const personal = checks.filter((c) =>
      ["yfinance_personal", "stooq_personal"].includes(c.providerId)
    );
    for (const c of personal) {
      expect(c.status).toBe("personal_fallback_disabled");
      expect(c.canRunSmoke).toBe(false);
    }
  });

  it("returns exactly 7 provider checks", () => {
    const checks = resolveProviderReadiness();
    expect(checks).toHaveLength(7);
  });

  it("missingKeys contains only key names, never values", () => {
    const checks = resolveProviderReadiness();
    for (const c of checks) {
      for (const key of c.missingKeys) {
        // Should be an env var name (uppercase + underscores)
        expect(key).toMatch(/^[A-Z_]+$/);
      }
    }
  });
});
