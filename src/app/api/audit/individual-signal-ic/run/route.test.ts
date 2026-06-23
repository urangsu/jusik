import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { auditIndividualSignalIc } from "@/server/audit/individual-signal-ic-auditor";
import { saveIndividualSignalIcResults } from "@/server/audit/individual-signal-ic-store";

vi.mock("@/server/audit/individual-signal-ic-auditor", () => ({
  auditIndividualSignalIc: vi.fn(),
}));

vi.mock("@/server/audit/individual-signal-ic-store", () => ({
  saveIndividualSignalIcResults: vi.fn(),
}));

describe("POST /api/audit/individual-signal-ic/run", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("should fail (forbidden/disabled) if local settings write is not enabled", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";

    const req = new NextRequest("http://localhost/api/audit/individual-signal-ic/run", {
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

    vi.mocked(auditIndividualSignalIc).mockResolvedValue([
      { id: "audit-1", signalId: "momentum_return" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/audit/individual-signal-ic/run", {
      method: "POST",
      body: JSON.stringify({ universeId: "KOSPI_SAMPLE" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value).toHaveLength(1);
    expect(json.value[0].id).toBe("audit-1");

    expect(saveIndividualSignalIcResults).toHaveBeenCalled();
  });
});
