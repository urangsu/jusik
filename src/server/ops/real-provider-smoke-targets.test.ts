import { describe, expect, it } from "vitest";
import { REAL_PROVIDER_SMOKE_TARGETS } from "./real-provider-smoke-targets";

describe("REAL_PROVIDER_SMOKE_TARGETS", () => {
  it("contains required real provider smoke targets", () => {
    const ids = REAL_PROVIDER_SMOKE_TARGETS.map((target) => target.id);

    expect(ids).toContain("kis_quote_kr");
    expect(ids).toContain("kis_ohlcv_kr");
    expect(ids).toContain("opendart_disclosures_kr");
    expect(ids).toContain("opendart_financials_kr");
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
});
