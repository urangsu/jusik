import { describe, it, expect } from "vitest";
import { OPERATIONAL_SMOKE_TARGETS } from "./operational-smoke-targets";

describe("operational-smoke-targets", () => {
  it("should contain exactly 10 targets", () => {
    expect(OPERATIONAL_SMOKE_TARGETS).toHaveLength(10);
  });

  it("should have unique target IDs", () => {
    const ids = OPERATIONAL_SMOKE_TARGETS.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });

  it("disabled_openai should expect not_supported_expected", () => {
    const target = OPERATIONAL_SMOKE_TARGETS.find(
      (t) => t.id === "ai_provider_run_disabled_openai"
    );
    expect(target).toBeDefined();
    expect(target!.expectedWithoutKey).toBe("not_supported_expected");
    expect(target!.expectedWithKey).toBe("not_supported_expected");
  });

  it("market_quote_kr should expect api_required_allowed without key", () => {
    const target = OPERATIONAL_SMOKE_TARGETS.find(
      (t) => t.id === "market_quote_kr"
    );
    expect(target!.requiresApiKey).toBe(true);
    expect(target!.expectedWithoutKey).toBe("api_required_allowed");
  });

  it("ai_providers should expect data_available", () => {
    const target = OPERATIONAL_SMOKE_TARGETS.find((t) => t.id === "ai_providers");
    expect(target!.expectedWithoutKey).toBe("data_available");
    expect(target!.requiresApiKey).toBe(false);
  });

  it("audit_replay should have skipWhen=no_audit_finding", () => {
    const target = OPERATIONAL_SMOKE_TARGETS.find((t) => t.id === "audit_replay");
    expect(target!.skipWhen).toBe("no_audit_finding");
  });

  it("all targets should have valid method (GET or POST)", () => {
    for (const t of OPERATIONAL_SMOKE_TARGETS) {
      expect(["GET", "POST"]).toContain(t.method);
    }
  });

  it("all targets should have a non-empty endpoint", () => {
    for (const t of OPERATIONAL_SMOKE_TARGETS) {
      expect(t.endpoint).toBeTruthy();
      expect(t.endpoint.startsWith("/api/")).toBe(true);
    }
  });
});
