import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

const VALID_TOKEN = "valid_admin_token_32_characters_long_abcdef";

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

function makeAdminReq(body = {}) {
  return new NextRequest("http://localhost:3000/api/ops/smoke/run", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-provider-admin-token": VALID_TOKEN,
      origin: "http://localhost:3000",
    },
  });
}

describe("POST /api/ops/smoke/run", () => {
  beforeEach(() => {
    vi.stubEnv("PROVIDER_ADMIN_TOKEN", VALID_TOKEN);
    vi.stubEnv("INTERNAL_APP_ORIGIN", "http://localhost:3000");
    vi.mocked(runOperationalSmoke).mockResolvedValue(makeReport());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails 401 when admin token is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/ops/smoke/run", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with DataEnvelope when all pass and authorized", async () => {
    const res = await POST(makeAdminReq());
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

    const res = await POST(makeAdminReq());
    const data = await res.json();

    expect(data.status).toBe("error");
    expect(data.value.failureCount).toBe(2);
    expect(res.status).toBe(200);
  });

  it("sourceTier is manual_import", async () => {
    const res = await POST(makeAdminReq());
    const data = await res.json();
    expect(data.sourceTier).toBe("manual_import");
  });
});
