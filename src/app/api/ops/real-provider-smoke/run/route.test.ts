import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { RealProviderSmokeReport } from "@/domain/ops/real-provider-smoke";

vi.mock("@/server/ops/real-provider-smoke-runner", () => ({
  runRealProviderSmoke: vi.fn(),
}));

vi.mock("@/server/ops/real-provider-smoke-store", () => ({
  saveRealProviderSmokeReport: vi.fn().mockResolvedValue(undefined),
}));

import { runRealProviderSmoke } from "@/server/ops/real-provider-smoke-runner";

function makeReport(overrides: Partial<RealProviderSmokeReport> = {}): RealProviderSmokeReport {
  return {
    id: "real_provider_smoke_test",
    targets: [],
    results: [],
    passed: true,
    failureCount: 0,
    dataAvailableCount: 0,
    apiRequiredCount: 1,
    expectationMode: "auto",
    createdAt: "2026-07-02T00:00:00.000Z",
    engineVersion: "test",
    ...overrides,
  };
}

describe("POST /api/ops/real-provider-smoke/run", () => {
  beforeEach(() => {
    // Enable job route for tests
    process.env.LOCAL_JOB_ROUTES_ENABLED = "true";
    process.env.REAL_PROVIDER_SMOKE_ROUTE_ENABLED = "true";
  });

  it("returns cached envelope when report passes", async () => {
    vi.mocked(runRealProviderSmoke).mockResolvedValue(makeReport());

    const response = await POST(
      new NextRequest("http://localhost/api/ops/real-provider-smoke/run", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.source).toBe("real_provider_smoke_runner");
    expect(data.sourceTier).toBe("manual_import");
  });

  it("returns error envelope when report has failures", async () => {
    vi.mocked(runRealProviderSmoke).mockResolvedValue(makeReport({ passed: false, failureCount: 2 }));

    const response = await POST(
      new NextRequest("http://localhost/api/ops/real-provider-smoke/run", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );
    const data = await response.json();

    expect(data.status).toBe("error");
    expect(data.value.failureCount).toBe(2);
  });

  it("passes requested expectation mode to runner", async () => {
    vi.mocked(runRealProviderSmoke).mockResolvedValue(makeReport());

    await POST(
      new NextRequest("http://localhost/api/ops/real-provider-smoke/run", {
        method: "POST",
        body: JSON.stringify({ mode: "without_key" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(runRealProviderSmoke).toHaveBeenLastCalledWith({
      baseUrl: "http://localhost",
      mode: "without_key",
    });
  });

  it("ignores body.baseUrl — always uses same-origin from request", async () => {
    vi.mocked(runRealProviderSmoke).mockResolvedValue(makeReport());

    await POST(
      new NextRequest("http://localhost/api/ops/real-provider-smoke/run", {
        method: "POST",
        body: JSON.stringify({ baseUrl: "https://malicious.example.com", mode: "auto" }),
        headers: { "content-type": "application/json" },
      }),
    );

    // Must use request.nextUrl.origin, not the provided baseUrl
    expect(runRealProviderSmoke).toHaveBeenLastCalledWith({
      baseUrl: "http://localhost",
      mode: "auto",
    });
  });

  it("returns 403 in production environment", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = "production";

    const response = await POST(
      new NextRequest("http://localhost/api/ops/real-provider-smoke/run", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(403);
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  it("returns 405 when route flag is disabled", async () => {
    process.env.REAL_PROVIDER_SMOKE_ROUTE_ENABLED = "false";

    const response = await POST(
      new NextRequest("http://localhost/api/ops/real-provider-smoke/run", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(405);
    process.env.REAL_PROVIDER_SMOKE_ROUTE_ENABLED = "true";
  });
});
