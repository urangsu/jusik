import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import type { RealProviderSmokeReport } from "@/domain/ops/real-provider-smoke";

vi.mock("@/server/ops/real-provider-smoke-store", () => ({
  getLatestRealProviderSmokeReport: vi.fn(),
}));

import { getLatestRealProviderSmokeReport } from "@/server/ops/real-provider-smoke-store";

function makeReport(overrides: Partial<RealProviderSmokeReport> = {}): RealProviderSmokeReport {
  return {
    id: "latest_real_provider_smoke",
    targets: [],
    results: [],
    passed: true,
    failureCount: 0,
    dataAvailableCount: 0,
    apiRequiredCount: 1,
    createdAt: "2026-07-02T00:00:00.000Z",
    engineVersion: "test",
    ...overrides,
  };
}

describe("GET /api/ops/real-provider-smoke/latest", () => {
  it("returns not_found when there is no latest report", async () => {
    vi.mocked(getLatestRealProviderSmokeReport).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("not_found");
    expect(data.value).toBeNull();
  });

  it("returns cached latest report when it passed", async () => {
    vi.mocked(getLatestRealProviderSmokeReport).mockResolvedValue(makeReport());

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe("cached");
    expect(data.value.id).toBe("latest_real_provider_smoke");
  });

  it("returns error status when latest report failed", async () => {
    vi.mocked(getLatestRealProviderSmokeReport).mockResolvedValue(makeReport({ passed: false, failureCount: 1 }));

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe("error");
    expect(data.value.failureCount).toBe(1);
  });
});
