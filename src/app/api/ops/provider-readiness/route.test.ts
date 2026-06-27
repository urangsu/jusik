import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/server/ops/provider-readiness-resolver", () => ({
  resolveProviderReadiness: vi.fn(() => [
    {
      providerId: "kis",
      displayName: "KIS",
      requiredKeys: ["KIS_APP_KEY", "KIS_APP_SECRET"],
      configuredKeys: [],
      missingKeys: ["KIS_APP_KEY", "KIS_APP_SECRET"],
      secretsExposed: false as const,
      status: "not_configured",
      message: "KIS_APP_KEY, KIS_APP_SECRET 누락",
      canRunSmoke: false,
      checkedAt: new Date().toISOString(),
    },
  ]),
}));

vi.mock("@/server/ops/provider-real-data-smoke-runner", () => ({
  runProviderRealDataSmoke: vi.fn(),
}));

describe("GET /api/ops/provider-readiness", () => {
  it("returns DataEnvelope with cached status", async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.sourceTier).toBe("manual_import");
    expect(data.source).toBe("provider_readiness_resolver");
  });

  it("returns provider readiness checks in value", async () => {
    const res = await GET();
    const data = await res.json();

    expect(data.value).not.toBeNull();
    expect(data.value.readiness).toHaveLength(1);
    expect(data.value.readiness[0].providerId).toBe("kis");
    expect(data.value.readiness[0].secretsExposed).toBe(false);
  });

  it("never exposes secret values in response", async () => {
    const res = await GET();
    const text = await res.text();

    // Should not contain any raw key values
    expect(text).not.toContain("my_secret");
    // Should contain key name
    expect(text).toContain("KIS_APP_KEY");
  });
});
