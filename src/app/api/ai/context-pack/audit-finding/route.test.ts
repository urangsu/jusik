import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listAuditFindings } from "@/server/audit/audit-finding-store";
import { AuditFinding } from "@/domain/audit/audit-finding";

vi.mock("@/server/audit/audit-finding-store", () => ({
  listAuditFindings: vi.fn().mockResolvedValue([]),
}));

describe("GET /api/ai/context-pack/audit-finding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFinding: AuditFinding = {
    id: "finding_123",
    sourceType: "individual_signal_ic",
    sourceId: "ic_1",
    scope: "signal",
    assetId: null,
    symbol: null,
    universeId: "KOSPI_SAMPLE",
    strategyId: null,
    trialId: null,
    signalId: "momentum_v1",
    factorA: null,
    factorB: null,
    title: "개별 신호 IC 진단",
    summary: "Spearman IC 0.1234, sample 500, top-bottom spread 4.50%. 샘플 유니버스 기준 진단 결과입니다.",
    severity: "watch",
    actionability: "review_only",
    warnings: [],
    sourceTier: "manual_import",
    sourceUrl: null,
    internalUrl: null,
    detectedAt: "2026-06-25T12:00:00Z",
    calculatedAt: "2026-06-25T12:00:00Z",
    engineVersion: "1.0.0",
  };

  it("should fail with 400 when id query parameter is missing", async () => {
    const req = new NextRequest("http://localhost/api/ai/context-pack/audit-finding");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("id 파라미터가 누락되었습니다");
  });

  it("should return 404 when finding with specified id is not found", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/ai/context-pack/audit-finding?id=nonexistent");
    const res = await GET(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.status).toBe("not_found");
  });

  it("should generate context pack and return 200 for a valid finding ID", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);
    const req = new NextRequest("http://localhost/api/ai/context-pack/audit-finding?id=finding_123");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.sourceTier).toBe("manual_import");
    expect(json.value.id).toBe("finding_123");
    expect(json.value.intent).toBe("audit_finding_explanation");
  });
});
