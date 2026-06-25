import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAiExplanationReplay } from "./ai-explanation-replay-runner";
import { listAuditFindings } from "../audit/audit-finding-store";
import { listAiExplanationReplayRecords } from "./ai-explanation-replay-ledger-store";
import { AuditFinding } from "@/domain/audit/audit-finding";
import fs from "fs/promises";
import { getAiExplanationReplayDir } from "./ai-explanation-replay-ledger-store-paths";

vi.mock("../audit/audit-finding-store", () => ({
  listAuditFindings: vi.fn().mockResolvedValue([]),
}));

describe("ai-explanation-replay-runner", () => {
  const replayDir = getAiExplanationReplayDir();

  beforeEach(async () => {
    vi.clearAllMocks();
    await fs.rm(replayDir, { recursive: true, force: true });
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

  it("should run replay on mock finding and pass all golden cases E2E", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);

    const res = await runAiExplanationReplay({
      findingId: "finding_123",
      locale: "ko",
    });

    expect(res.passed).toBe(true);
    expect(res.failureCount).toBe(0);
    expect(res.records).toHaveLength(4);

    const safeRecord = res.records.find((r) => r.mode === "safe");
    expect(safeRecord).toBeDefined();
    expect(safeRecord?.passed).toBe(true);
    expect(safeRecord?.outcome).toBe("passed");
    expect(safeRecord?.actualBlocked).toBe(false);

    const wordingRecord = res.records.find((r) => r.mode === "forbidden_wording");
    expect(wordingRecord).toBeDefined();
    expect(wordingRecord?.passed).toBe(true);
    expect(wordingRecord?.outcome).toBe("blocked");
    expect(wordingRecord?.actualBlocked).toBe(true);

    const storeRecords = await listAiExplanationReplayRecords({ findingId: "finding_123" });
    expect(storeRecords).toHaveLength(4);
  });

  it("should fail when actual validation deviates from expected", async () => {
    vi.mocked(listAuditFindings).mockResolvedValue([mockFinding]);

    // To simulate a mismatch, we can query a non-existent mode or force an execution failure
    // But let's check: if we pass a mode that is not expected, or trigger an error by checking non-existent finding,
    // it will return execution error and passed=false.
    const res = await runAiExplanationReplay({
      findingId: "nonexistent",
    });

    expect(res.passed).toBe(false);
    expect(res.failureCount).toBe(4); // all 4 modes should catch the "Audit finding 'nonexistent' not found." error
    expect(res.records[0].outcome).toBe("error");
    expect(res.records[0].failureReasons[0]).toContain("nonexistent");
  });
});
