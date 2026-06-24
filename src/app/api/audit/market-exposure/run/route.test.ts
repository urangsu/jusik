import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { auditMarketExposureFromTrial } from "@/server/audit/market-exposure-auditor";
import { saveMarketExposureResult } from "@/server/audit/market-exposure-store";

vi.mock("@/server/audit/market-exposure-auditor", () => ({
  auditMarketExposureFromTrial: vi.fn(),
}));

vi.mock("@/server/audit/market-exposure-store", () => ({
  saveMarketExposureResult: vi.fn(),
}));

describe("POST /api/audit/market-exposure/run", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("should fail (forbidden/disabled) if local settings write is not enabled", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";

    const req = new NextRequest("http://localhost/api/audit/market-exposure/run", {
      method: "POST",
      body: JSON.stringify({ trialId: "trial-1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.status).toBe("forbidden");
  });

  it("should run audit and save results when write is enabled", async () => {
    (process.env as any).NODE_ENV = "development";
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";

    vi.mocked(auditMarketExposureFromTrial).mockResolvedValue({
      id: "audit-1",
      trialId: "trial-1",
      beta: 1.25,
    } as any);

    const req = new NextRequest("http://localhost/api/audit/market-exposure/run", {
      method: "POST",
      body: JSON.stringify({ trialId: "trial-1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value.id).toBe("audit-1");

    expect(saveMarketExposureResult).toHaveBeenCalled();
  });
});
