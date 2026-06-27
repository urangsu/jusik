import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/report/finding-synthesis-store", () => ({
  getFindingSynthesisReport: vi.fn(),
}));

vi.mock("@/server/evidence/evidence-pack-store", () => ({
  getEvidencePack: vi.fn(),
}));

vi.mock("@/server/debate/diagnostic-debate-store", () => ({
  saveDiagnosticDebate: vi.fn().mockResolvedValue(undefined),
}));

import { getFindingSynthesisReport } from "@/server/report/finding-synthesis-store";

describe("POST /api/debate/diagnostic/from-report", () => {
  beforeEach(() => {
    vi.mocked(getFindingSynthesisReport).mockResolvedValue({
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
    });
  });

  it("returns cached debate sheet on success", async () => {
    const req = new NextRequest("http://localhost/api/debate/diagnostic/from-report", {
      method: "POST",
      body: JSON.stringify({ reportId: "rep_ok" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.subjectId).toBe("AAPL");
    expect(data.value.cases).toHaveLength(4);
  });

  it("returns not_found status when report does not exist", async () => {
    vi.mocked(getFindingSynthesisReport).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/debate/diagnostic/from-report", {
      method: "POST",
      body: JSON.stringify({ reportId: "rep_bad" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("not_found");
  });
});
