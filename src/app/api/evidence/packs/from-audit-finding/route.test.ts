import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/audit/audit-finding-store", () => ({
  listAuditFindings: vi.fn(),
}));

vi.mock("@/server/evidence/evidence-pack-store", () => ({
  saveEvidencePack: vi.fn().mockResolvedValue(undefined),
}));

import { listAuditFindings } from "@/server/audit/audit-finding-store";

describe("POST /api/evidence/packs/from-audit-finding", () => {
  beforeEach(() => {
    vi.mocked(listAuditFindings).mockResolvedValue([
      {
        id: "finding_ok",
        sourceType: "individual_signal_ic",
        sourceId: "ic_123",
        scope: "signal",
        assetId: "삼성전자",
        symbol: "005930",
        universeId: "KOSPI_SAMPLE",
        strategyId: "strat_1",
        trialId: "trial_1",
        signalId: "sig_1",
        factorA: null,
        factorB: null,
        title: "Test finding",
        summary: "Desc",
        severity: "warning",
        actionability: "review_only",
        warnings: [],
        sourceTier: "manual_import",
        sourceUrl: null,
        internalUrl: null,
        detectedAt: new Date().toISOString(),
        calculatedAt: new Date().toISOString(),
        engineVersion: "1.0.0",
      },
    ]);
  });

  it("creates evidence pack when finding is found", async () => {
    const req = new NextRequest("http://localhost/api/evidence/packs/from-audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_ok" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.id).toBe("evp_finding_ok");
  });

  it("returns not_found status when finding does not exist", async () => {
    const req = new NextRequest("http://localhost/api/evidence/packs/from-audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_bad" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("not_found");
  });
});
