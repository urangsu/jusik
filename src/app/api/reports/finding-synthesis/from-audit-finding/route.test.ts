import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/audit/audit-finding-store", () => ({
  listAuditFindings: vi.fn(),
}));

vi.mock("@/server/evidence/evidence-pack-store", () => ({
  getEvidencePack: vi.fn(),
  saveEvidencePack: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/report/finding-synthesis-store", () => ({
  getFindingSynthesisReport: vi.fn(),
  saveFindingSynthesisReport: vi.fn().mockResolvedValue(undefined),
}));

import { listAuditFindings } from "@/server/audit/audit-finding-store";
import { getEvidencePack } from "@/server/evidence/evidence-pack-store";
import { getFindingSynthesisReport } from "@/server/report/finding-synthesis-store";

describe("POST /api/reports/finding-synthesis/from-audit-finding", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(listAuditFindings).mockResolvedValue([
      {
        id: "find_1",
        title: "High Volatility",
        summary: "Finding summary",
        severity: "warning",
        scope: "asset",
        sourceType: "individual_signal_ic",
        assetId: "US_AAPL",
        symbol: "AAPL",
        calculatedAt: new Date().toISOString(),
        engineVersion: "1.0.0",
        warnings: [],
      } as unknown as any,
    ]);
  });

  it("returns newly generated synthesis report if not cached", async () => {
    vi.mocked(getEvidencePack).mockResolvedValue(null);
    vi.mocked(getFindingSynthesisReport).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/reports/finding-synthesis/from-audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "find_1" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.evidencePack.id).toBe("evp_find_1");
    expect(data.value.report.id).toContain("fsr_find_1");
    expect(data.value.report.isBlocked).toBe(false);
  });
});
