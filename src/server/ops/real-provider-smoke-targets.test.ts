import { describe, expect, it } from "vitest";
import { REAL_PROVIDER_SMOKE_TARGETS } from "./real-provider-smoke-targets";

describe("REAL_PROVIDER_SMOKE_TARGETS", () => {
  it("contains required real provider smoke targets", () => {
    const ids = REAL_PROVIDER_SMOKE_TARGETS.map((target) => target.id);

    expect(ids).toContain("kis_quote_kr_005930");
    expect(ids).toContain("kis_ohlcv_kr_005930");
    expect(ids).toContain("opendart_disclosures_kr_00126380");
    expect(ids).toContain("opendart_financials_kr_00126380");
    expect(ids).toContain("fmp_quote_us_aapl");
    expect(ids).toContain("fmp_ohlcv_us_aapl");
    expect(ids).toContain("provider_health");
  });

  it("does not expect fake US provider data before registry/provider wiring is enabled", () => {
    const usFreeTargets = REAL_PROVIDER_SMOKE_TARGETS.filter((target) =>
      ["fmp_free", "finnhub_free", "alpha_vantage_free"].includes(target.providerId),
    );

    expect(usFreeTargets.length).toBeGreaterThan(0);
    for (const target of usFreeTargets) {
      expect(target.expectedWithoutKey).toBe("not_supported_allowed");
    }
  });

  it("uses asset/API endpoints rather than broker order endpoints", () => {
    for (const target of REAL_PROVIDER_SMOKE_TARGETS) {
      expect(target.endpoint).not.toContain("/order");
      expect(target.endpoint).not.toContain("/broker");
    }
  });

  // P0-1: All market targets include providerId param for provider-specific routing
  it("market quote and ohlcv targets include ?providerId= to prevent generic fallback mismatch", () => {
    const marketTargets = REAL_PROVIDER_SMOKE_TARGETS.filter(
      (t) => t.capability === "quote" || t.capability === "ohlcv",
    );

    for (const target of marketTargets) {
      expect(target.endpoint).toContain("providerId=");
      // The providerId in the URL must match the target's providerId
      expect(target.endpoint).toContain(`providerId=${target.providerId}`);
    }
  });

  // P1-2: provider_health target should not be attributed to KIS
  it("provider_health target is not attributed to KIS (system-level check, not KIS-specific)", () => {
    const healthTarget = REAL_PROVIDER_SMOKE_TARGETS.find((t) => t.id === "provider_health");
    expect(healthTarget).toBeDefined();
    expect(healthTarget?.providerId).toBe("system");
  });
});
