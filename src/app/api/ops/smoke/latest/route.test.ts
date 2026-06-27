import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import type { OperationalSmokeReport } from "@/domain/ops/operational-smoke";

vi.mock("@/server/ops/operational-smoke-store", () => ({
  getLatestOperationalSmokeReport: vi.fn(),
}));

import { getLatestOperationalSmokeReport } from "@/server/ops/operational-smoke-store";

function makeReport(overrides: Partial<OperationalSmokeReport> = {}): OperationalSmokeReport {
  return {
    id: "smoke_latest_test",
    results: [],
    passed: true,
    failureCount: 0,
    warningCount: 0,
    createdAt: new Date().toISOString(),
    engineVersion: "1.0.0-test",
    ...overrides,
  };
}

describe("GET /api/ops/smoke/latest", () => {
  it("returns cached status and report when available", async () => {
    vi.mocked(getLatestOperationalSmokeReport).mockResolvedValue(makeReport());

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.sourceTier).toBe("manual_import");
    expect(data.value).not.toBeNull();
    expect(data.value.id).toBe("smoke_latest_test");
  });

  it("returns not_found when no report exists", async () => {
    vi.mocked(getLatestOperationalSmokeReport).mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("not_found");
    expect(data.value).toBeNull();
  });

  it("returns error status when report has failures", async () => {
    vi.mocked(getLatestOperationalSmokeReport).mockResolvedValue(
      makeReport({ passed: false, failureCount: 3 })
    );

    const res = await GET();
    const data = await res.json();

    expect(data.status).toBe("error");
    expect(data.value.failureCount).toBe(3);
  });
});
