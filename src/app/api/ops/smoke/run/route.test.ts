import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock the smoke runner and store
vi.mock("@/server/ops/operational-smoke-runner", () => ({
  runOperationalSmoke: vi.fn(),
}));
vi.mock("@/server/ops/operational-smoke-store", () => ({
  saveOperationalSmokeReport: vi.fn().mockResolvedValue(undefined),
}));

import { runOperationalSmoke } from "@/server/ops/operational-smoke-runner";
import type { OperationalSmokeReport } from "@/domain/ops/operational-smoke";

function makeReport(overrides: Partial<OperationalSmokeReport> = {}): OperationalSmokeReport {
  return {
    id: "smoke_test",
    results: [],
    passed: true,
    failureCount: 0,
    warningCount: 0,
    createdAt: new Date().toISOString(),
    engineVersion: "1.0.0-test",
    ...overrides,
  };
}

describe("POST /api/ops/smoke/run", () => {
  beforeEach(() => {
    vi.mocked(runOperationalSmoke).mockResolvedValue(makeReport());
  });

  it("returns 200 with DataEnvelope when all pass", async () => {
    const req = new NextRequest("http://localhost/api/ops/smoke/run", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sourceTier).toBe("manual_import");
    expect(data.source).toBe("operational_smoke_runner");
    expect(data.status).toBe("cached");
    expect(data.value.passed).toBe(true);
  });

  it("status=error when failureCount > 0", async () => {
    vi.mocked(runOperationalSmoke).mockResolvedValue(
      makeReport({ passed: false, failureCount: 2 })
    );

    const req = new NextRequest("http://localhost/api/ops/smoke/run", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.status).toBe("error");
    expect(data.value.failureCount).toBe(2);
    expect(res.status).toBe(200);
  });

  it("sourceTier is manual_import", async () => {
    const req = new NextRequest("http://localhost/api/ops/smoke/run", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.sourceTier).toBe("manual_import");
  });
});
