import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuditFindingExplanationRequest } from "./ai-explanation-request-service";
import { listAuditFindings } from "../audit/audit-finding-store";
import { getAiExplanationCacheByHash, saveAiExplanationCacheRecord } from "./ai-explanation-cache-store";
import { AuditFinding } from "@/domain/audit/audit-finding";
import fs from "fs/promises";
import { getAiExplanationCacheDir } from "./ai-explanation-cache-store-paths";

vi.mock("../audit/audit-finding-store", () => ({
  listAuditFindings: vi.fn().mockResolvedValue([]),
}));

describe("ai-explanation-request-service", () => {
  const cacheDir = getAiExplanationCacheDir();

  beforeEach(async () => {
    vi.clearAllMocks();
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  const mockFinding: AuditFinding = {
    id: "finding_123",
    sourceType: "individual_signal_ic",
    sourceId: "ic_123",
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
    summary: "Spearman IC 0.05, sample 120, top-bottom spread 1.2%.",
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

  it("should throw error if finding is not found", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([]);
    await expect(
      createAuditFindingExplanationRequest({ findingId: "nonexistent" })
    ).rejects.toThrow("Audit finding 'nonexistent' not found.");
  });

  it("should construct request and promptInput on cache miss", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);

    const res = await createAuditFindingExplanationRequest({
      findingId: "finding_123",
      locale: "ko",
      userPrompt: "설명 요망",
    });

    expect(res.cached).toBeNull();
    expect(res.request.status).toBe("pending");
    expect(res.request.requestHash).toHaveLength(64);
    expect(res.promptInput.intent).toBe("audit_finding_explanation");
    expect(res.promptInput.systemPolicy.language).toBe("ko");
  });

  it("should return cache record on cache hit", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);

    // 1. First run to get requestHash
    const firstRun = await createAuditFindingExplanationRequest({
      findingId: "finding_123",
      locale: "ko",
      userPrompt: "설명 요망",
    });

    const mockCache = {
      requestHash: firstRun.request.requestHash,
      request: firstRun.request,
      output: {
        id: "out_1",
        intent: "audit_finding_explanation" as const,
        title: "제목",
        summary: "검증 요약 설명입니다.",
        claims: [],
        limitations: [],
        requiredDisclaimers: [],
        blockedTerms: [],
        isBlocked: false,
        blockReasons: [],
        generatedAt: "2026-06-25T12:00:00Z",
        engineVersion: "1.0.0",
      },
      cachedAt: "2026-06-25T12:00:00Z",
      expiresAt: null,
      engineVersion: "1.0.0",
    };

    // 2. Save cache
    await saveAiExplanationCacheRecord(mockCache);

    // 3. Request again
    const secondRun = await createAuditFindingExplanationRequest({
      findingId: "finding_123",
      locale: "ko",
      userPrompt: "설명 요망",
    });

    expect(secondRun.cached).not.toBeNull();
    expect(secondRun.request.status).toBe("cached");
    expect(secondRun.cached?.output.summary).toBe("검증 요약 설명입니다.");
  });
});
