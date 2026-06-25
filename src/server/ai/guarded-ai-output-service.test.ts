import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGuardedMockAiOutput } from "./guarded-ai-output-service";
import { listAuditFindings } from "../audit/audit-finding-store";
import { getAiExplanationCacheByHash, listAiExplanationBlockedRecords, listAiExplanationCacheRecords } from "./ai-explanation-cache-store";
import { AuditFinding } from "@/domain/audit/audit-finding";
import fs from "fs/promises";
import { getAiExplanationCacheDir } from "./ai-explanation-cache-store-paths";

vi.mock("../audit/audit-finding-store", () => ({
  listAuditFindings: vi.fn().mockResolvedValue([]),
}));

describe("guarded-ai-output-service", () => {
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

  it("should process safe mode successfully and store in normal cache", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);

    const res = await createGuardedMockAiOutput({
      findingId: "finding_123",
      locale: "ko",
      mode: "safe",
    });

    expect(res.output.isBlocked).toBe(false);
    expect(res.cacheRecord).not.toBeNull();
    expect(res.blockedRecord).toBeNull();
    expect(res.request.status).toBe("cached");

    // Verify it is listed in normal cache records
    const cachedRecords = await listAiExplanationCacheRecords();
    expect(cachedRecords).toHaveLength(1);
    expect(cachedRecords[0].requestHash).toBe(res.request.requestHash);
  });

  it("should block forbidden wording, record as blocked, and not cache normally", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);

    const res = await createGuardedMockAiOutput({
      findingId: "finding_123",
      locale: "ko",
      mode: "forbidden_wording",
    });

    expect(res.output.isBlocked).toBe(true);
    expect(res.cacheRecord).toBeNull();
    expect(res.blockedRecord).not.toBeNull();
    expect(res.request.status).toBe("blocked");

    // Verify normal cache is empty and blocked records are populated
    const cachedRecords = await listAiExplanationCacheRecords();
    expect(cachedRecords).toHaveLength(0);

    const blockedRecords = await listAiExplanationBlockedRecords();
    expect(blockedRecords).toHaveLength(1);
    expect(blockedRecords[0].requestHash).toBe(res.request.requestHash);
    expect(blockedRecords[0].blockReasons.some(r => r.includes("금지 단어"))).toBe(true);
  });

  it("should block ungrounded claims, record as blocked, and not cache normally", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);

    const res = await createGuardedMockAiOutput({
      findingId: "finding_123",
      locale: "ko",
      mode: "ungrounded_claim",
    });

    expect(res.output.isBlocked).toBe(true);
    expect(res.cacheRecord).toBeNull();
    expect(res.blockedRecord).not.toBeNull();
    expect(res.request.status).toBe("blocked");

    const cachedRecords = await listAiExplanationCacheRecords();
    expect(cachedRecords).toHaveLength(0);

    const blockedRecords = await listAiExplanationBlockedRecords();
    expect(blockedRecords).toHaveLength(1);
    expect(blockedRecords[0].blockReasons.some(r => r.includes("sourceId가 누락"))).toBe(true);
  });

  it("should block missing required disclaimer, record as blocked, and not cache normally", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);

    const res = await createGuardedMockAiOutput({
      findingId: "finding_123",
      locale: "ko",
      mode: "missing_disclaimer",
    });

    expect(res.output.isBlocked).toBe(true);
    expect(res.cacheRecord).toBeNull();
    expect(res.blockedRecord).not.toBeNull();
    expect(res.request.status).toBe("blocked");

    const cachedRecords = await listAiExplanationCacheRecords();
    expect(cachedRecords).toHaveLength(0);

    const blockedRecords = await listAiExplanationBlockedRecords();
    expect(blockedRecords).toHaveLength(1);
    expect(blockedRecords[0].blockReasons.some(r => r.includes("필수 면책 조항"))).toBe(true);
  });
});
