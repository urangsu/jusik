import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { auditAllFactorCorrelations } from "@/server/audit/factor-correlation-auditor";
import { saveFactorCorrelationResults } from "@/server/audit/factor-correlation-store";

vi.mock("@/server/audit/factor-correlation-auditor", () => ({
  auditAllFactorCorrelations: vi.fn(),
}));

vi.mock("@/server/audit/factor-correlation-store", () => ({
  saveFactorCorrelationResults: vi.fn(),
}));

describe("POST /api/audit/factor-correlation/run", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("should fail (forbidden/disabled) if local settings write is not enabled", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";

    const req = new NextRequest("http://localhost/api/audit/factor-correlation/run", {
      method: "POST",
      body: JSON.stringify({ universeId: "KOSPI_SAMPLE" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.status).toBe("forbidden");
  });

  it("should run the audit and save results when write is enabled", async () => {
    (process.env as any).NODE_ENV = "development";
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";

    vi.mocked(auditAllFactorCorrelations).mockResolvedValue([
      { id: "audit-1", factorA: "momentum_return", factorB: "momentum_turtle" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/audit/factor-correlation/run", {
      method: "POST",
      body: JSON.stringify({ universeId: "KOSPI_SAMPLE" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value).toHaveLength(1);
    expect(json.value[0].id).toBe("audit-1");

    expect(saveFactorCorrelationResults).toHaveBeenCalled();
  });
});
