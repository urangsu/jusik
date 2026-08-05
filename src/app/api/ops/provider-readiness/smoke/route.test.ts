import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { ProviderReadinessReport } from "@/domain/ops/provider-readiness";

vi.mock("@/server/ops/provider-real-data-smoke-runner", () => ({
  runProviderRealDataSmoke: vi.fn(),
}));

import { runProviderRealDataSmoke } from "@/server/ops/provider-real-data-smoke-runner";

const VALID_TOKEN = "valid_admin_token_1234567890";

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

function makeAdminReq(body = {}) {
  return new NextRequest("http://localhost:3000/api/ops/provider-readiness/smoke", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-provider-admin-token": VALID_TOKEN,
      origin: "http://localhost:3000",
    },
  });
}

describe("POST /api/ops/provider-readiness/smoke", () => {
  beforeEach(() => {
    vi.stubEnv("PROVIDER_ADMIN_TOKEN", VALID_TOKEN);
    vi.stubEnv("INTERNAL_APP_ORIGIN", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails 401 when admin token is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/ops/provider-readiness/smoke", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns DataEnvelope with sourceTier manual_import when authorized", async () => {
    vi.mocked(runProviderRealDataSmoke).mockResolvedValue(makeReport());

    const res = await POST(makeAdminReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sourceTier).toBe("manual_import");
    expect(data.source).toBe("provider_real_data_smoke_runner");
  });

  it("status=cached when no failures", async () => {
    vi.mocked(runProviderRealDataSmoke).mockResolvedValue(makeReport({ failureCount: 0 }));

    const res = await POST(makeAdminReq());
    const data = await res.json();
    expect(data.status).toBe("cached");
  });

  it("status=error when failureCount > 0", async () => {
    vi.mocked(runProviderRealDataSmoke).mockResolvedValue(
      makeReport({ failureCount: 2, passed: false } as any)
    );

    const res = await POST(makeAdminReq());
    const data = await res.json();
    expect(data.status).toBe("error");
    expect(data.value.failureCount).toBe(2);
  });
});
