import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { aggregateAuditFindings } from "@/server/audit/audit-finding-aggregator";

vi.mock("@/server/audit/audit-finding-aggregator", () => ({
  aggregateAuditFindings: vi.fn().mockResolvedValue({ createdOrUpdated: 0, findings: [] }),
}));

describe("POST /api/audit/findings/run", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("should fail with 403 when write settings permission is disabled", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";

    const req = new NextRequest("http://localhost/api/audit/findings/run", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should fail with 400 when body arguments are of invalid types", async () => {
    (process.env as any).NODE_ENV = "development";
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";

    const req = new NextRequest("http://localhost/api/audit/findings/run", {
      method: "POST",
      body: JSON.stringify({ includeIndividualSignalIc: "not_a_boolean" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("Invalid includeIndividualSignalIc parameter");
  });

  it("should aggregate findings when permission is enabled and body arguments are correct", async () => {
    (process.env as any).NODE_ENV = "development";
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";

    const req = new NextRequest("http://localhost/api/audit/findings/run", {
      method: "POST",
      body: JSON.stringify({ includeIndividualSignalIc: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(aggregateAuditFindings).toHaveBeenCalledWith({
      includeIndividualSignalIc: true,
      includeFactorCorrelation: undefined,
      includeMarketExposure: undefined,
    });
  });
});
