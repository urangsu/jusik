import { describe, it, expect } from "vitest";
import {
  SMOKE_TARGET_POLICIES,
  REQUIRED_BETA_POLICIES,
  buildPolicyMap,
  policyKey,
} from "./provider-smoke-target-policy";

describe("provider-smoke-target-policy registry", () => {
  it("has exactly 5 required beta targets", () => {
    expect(REQUIRED_BETA_POLICIES).toHaveLength(5);
  });

  it("all required targets are for expected providers", () => {
    const providerCaps = REQUIRED_BETA_POLICIES.map((p) => `${p.providerId}/${p.capability}`);
    expect(providerCaps).toContain("kis/quote");
    expect(providerCaps).toContain("kis/ohlcv");
    expect(providerCaps).toContain("opendart/filings");
    expect(providerCaps).toContain("opendart/financials");
    expect(providerCaps).toContain("finnhub_free/quote");
  });

  it("no required target uses cached/stale/empty_allowed as allowed status", () => {
    const forbidden = new Set(["cached", "stale", "empty_allowed"]);
    for (const p of REQUIRED_BETA_POLICIES) {
      for (const s of p.allowedStatuses) {
        expect(forbidden.has(s), `${p.providerId}/${p.capability} has forbidden status ${s}`).toBe(false);
      }
    }
  });

  it("all targets have non-empty expectedSource", () => {
    for (const p of SMOKE_TARGET_POLICIES) {
      expect(p.expectedSource.length, `${policyKey(p)} expectedSource empty`).toBeGreaterThan(0);
    }
  });

  it("no two policies share the same key", () => {
    const keys = SMOKE_TARGET_POLICIES.map(policyKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("buildPolicyMap indexes by key correctly", () => {
    const map = buildPolicyMap(REQUIRED_BETA_POLICIES);
    expect(map.get("kis/quote/005930")).toBeDefined();
    expect(map.get("opendart/financials/005930")).toBeDefined();
    expect(map.get("finnhub_free/quote/AAPL")).toBeDefined();
    expect(map.get("nonexistent/quote/X")).toBeUndefined();
  });

  it("kis ohlcv has maxDataAgeMs of 48h", () => {
    const p = REQUIRED_BETA_POLICIES.find((p) => p.providerId === "kis" && p.capability === "ohlcv");
    expect(p?.maxDataAgeMs).toBe(48 * 60 * 60_000);
  });

  it("personal fallback providers are not required for beta", () => {
    const personal = SMOKE_TARGET_POLICIES.filter(
      (p) => p.providerId === "yfinance_personal" || p.providerId === "stooq_personal"
    );
    for (const p of personal) {
      expect(p.requiredForBeta).toBe(false);
    }
  });

  it("kis expected source is exactly 'KIS Open API' (not substring)", () => {
    const kisPolicy = REQUIRED_BETA_POLICIES.find((p) => p.providerId === "kis" && p.capability === "quote");
    expect(kisPolicy?.expectedSource).toBe("KIS Open API");
    // Not a substring
    expect(kisPolicy?.expectedSource).not.toBe("KIS");
    expect(kisPolicy?.expectedSource).not.toBe("kis");
  });
});
