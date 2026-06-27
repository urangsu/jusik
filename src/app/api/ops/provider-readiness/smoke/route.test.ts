import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { ProviderReadinessReport } from "@/domain/ops/provider-readiness";

vi.mock("@/server/ops/provider-real-data-smoke-runner", () => ({
  runProviderRealDataSmoke: vi.fn(),
}));

import { runProviderRealDataSmoke } from "@/server/ops/provider-real-data-smoke-runner";

function makeReport(overrides: Partial<ProviderReadinessReport> = {}): ProviderReadinessReport {
  return {
    id: "test_readiness",
    readiness: [],
    smokeResults: [],
    readyCount: 0,
    notConfiguredCount: 7,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("POST /api/ops/provider-readiness/smoke", () => {
  it("returns DataEnvelope with sourceTier manual_import", async () => {
    vi.mocked(runProviderRealDataSmoke).mockResolvedValue(makeReport());

    const req = new NextRequest("http://localhost/api/ops/provider-readiness/smoke", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sourceTier).toBe("manual_import");
    expect(data.source).toBe("provider_real_data_smoke_runner");
  });

  it("status=cached when no failures", async () => {
    vi.mocked(runProviderRealDataSmoke).mockResolvedValue(makeReport({ failureCount: 0 }));

    const req = new NextRequest("http://localhost/api/ops/provider-readiness/smoke", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.status).toBe("cached");
  });

  it("status=error when failureCount > 0", async () => {
    vi.mocked(runProviderRealDataSmoke).mockResolvedValue(
      makeReport({ failureCount: 2, passed: false } as any)
    );

    const req = new NextRequest("http://localhost/api/ops/provider-readiness/smoke", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.status).toBe("error");
    expect(data.value.failureCount).toBe(2);
  });
});
