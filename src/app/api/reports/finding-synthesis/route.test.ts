import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/evidence/evidence-pack-store", () => ({
  getEvidencePack: vi.fn(),
}));

vi.mock("@/server/report/finding-synthesis-store", () => ({
  saveFindingSynthesisReport: vi.fn().mockResolvedValue(undefined),
  listFindingSynthesisReports: vi.fn(),
}));

import { getEvidencePack } from "@/server/evidence/evidence-pack-store";
import { listFindingSynthesisReports } from "@/server/report/finding-synthesis-store";

describe("Finding Synthesis API", () => {
  beforeEach(() => {
    vi.mocked(getEvidencePack).mockResolvedValue({
      id: "pack_ok",
      subjectType: "asset",
      subjectId: "AAPL",
      evidenceRefs: [],
      asOf: new Date().toISOString(),
      freshness: "fresh",
      claimTypes: ["price"],
      missingEvidence: [],
      blockedActions: [],
      limitations: [],
      createdAt: new Date().toISOString(),
      engineVersion: "1.0.0",
    });

    vi.mocked(listFindingSynthesisReports).mockResolvedValue([
      {
        id: "rep_ok",
        subjectType: "watchlist",
        subjectId: "AAPL",
        sections: [],
        synthesisSummary: "Summary",
        keyRisks: [],
        evidenceGaps: [],
        blockedTerms: [],
        isBlocked: false,
        blockReasons: [],
        createdAt: new Date().toISOString(),
        engineVersion: "1.0.0",
      },
    ]);
  });

  it("GET lists reports", async () => {
    const req = new NextRequest("http://localhost/api/reports/finding-synthesis");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value).toHaveLength(1);
  });

  it("POST generates synthesis from evidence pack", async () => {
    const req = new NextRequest("http://localhost/api/reports/finding-synthesis", {
      method: "POST",
      body: JSON.stringify({ evidencePackId: "pack_ok" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.subjectId).toBe("AAPL");
    expect(data.value.sections.length).toBeGreaterThan(0);
  });
});
