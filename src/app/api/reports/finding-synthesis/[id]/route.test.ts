import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/report/finding-synthesis-store", () => ({
  getFindingSynthesisReport: vi.fn(),
}));

import { getFindingSynthesisReport } from "@/server/report/finding-synthesis-store";

describe("GET /api/reports/finding-synthesis/[id]", () => {
  it("returns report when found", async () => {
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

    const req = new NextRequest("http://localhost/api/reports/finding-synthesis/rep_ok");
    const res = await GET(req, { params: Promise.resolve({ id: "rep_ok" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.id).toBe("rep_ok");
  });

  it("returns error status when report isBlocked", async () => {
    vi.mocked(getFindingSynthesisReport).mockResolvedValue({
      id: "rep_blocked",
      subjectType: "watchlist",
      subjectId: "AAPL",
      sections: [],
      synthesisSummary: "Summary",
      keyRisks: [],
      evidenceGaps: [],
      blockedTerms: ["매수"],
      isBlocked: true,
      blockReasons: ["금지 단어가 포함되어 있습니다: 매수"],
      createdAt: new Date().toISOString(),
      engineVersion: "1.0.0",
    });

    const req = new NextRequest("http://localhost/api/reports/finding-synthesis/rep_blocked");
    const res = await GET(req, { params: Promise.resolve({ id: "rep_blocked" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("error");
    expect(data.message).toContain("Blocked");
  });
});
