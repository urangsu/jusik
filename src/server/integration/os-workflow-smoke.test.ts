import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import { listAuditFindings, saveAuditFindings } from "../audit/audit-finding-store";
import { buildEvidencePackFromAuditFinding } from "../evidence/evidence-pack-builder";
import { saveEvidencePack, getEvidencePack } from "../evidence/evidence-pack-store";
import { composeReportSectionsFromEvidencePack } from "../report/report-section-composer";
import { synthesizeFindingReport } from "../report/finding-synthesizer";
import { saveFindingSynthesisReport, getFindingSynthesisReport } from "../report/finding-synthesis-store";
import { buildDiagnosticDebate } from "../debate/diagnostic-debate-builder";
import { saveDiagnosticDebate, getDiagnosticDebate } from "../debate/diagnostic-debate-store";
import { createPendingOutcomeRecord, observeOutcome } from "../outcome/signal-outcome-observer";
import { getOutcomeRecord } from "../outcome/signal-outcome-journal-store";
import { detectSurgeCandidates } from "../surge/surge-candidate-detector";
import { promoteSurgeCandidateToWatchlist } from "../surge/watchlist-promotion-gate";
import { listWatchlistItems } from "../watchlist/watchlist-store";
import fs from "fs/promises";
import path from "path";

describe("O~S Integration E2E Smoke Workflow", () => {
  let testRoot: { root: string; cleanup: () => Promise<void> };
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    testRoot = await createTestDataRoot("os-smoke-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;

    // Create a mock ohlcv file for AAPL and US_SPY to allow outcome calculation
    const aaplPath = path.join(testRoot.root, "data/market/ohlcv/SP500_SAMPLE/US_AAPL.json");
    const spyPath = path.join(testRoot.root, "data/market/ohlcv/SP500_SAMPLE/US_SPY.json");
    await fs.mkdir(path.dirname(aaplPath), { recursive: true });

    const mockBars = Array.from({ length: 25 }, (_, i) => ({
      assetId: "US_AAPL",
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: 105,
      low: 95,
      close: i === 4 ? 100 : i === 24 ? 110 : 105, // return 10%
      volume: i === 24 ? 300_000 : 100_000,
    }));

    const spyBars = Array.from({ length: 25 }, (_, i) => ({
      assetId: "US_SPY",
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: 102,
      low: 98,
      close: i === 4 ? 100 : i === 24 ? 102 : 101, // return 2%
      volume: 5000,
    }));

    await fs.writeFile(aaplPath, JSON.stringify({
      bars: mockBars,
      dataStatus: "cached",
      source: "Mock",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString()
    }));

    await fs.writeFile(spyPath, JSON.stringify({
      bars: spyBars,
      dataStatus: "cached",
      source: "Mock",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString()
    }));
  });

  afterEach(async () => {
    await cleanup();
  });

  it("executes the entire evidence-to-debate and outcome observing E2E workflow successfully", async () => {
    // 1. Save an Audit Finding
    const mockFinding = {
      id: "find_smoke_001",
      title: "Sudden Momentum Breakout",
      summary: "Momentum score increased sharply",
      severity: "warning" as const,
      scope: "asset" as const,
      sourceType: "individual_signal_ic" as const,
      assetId: "US_AAPL",
      symbol: "AAPL",
      calculatedAt: new Date().toISOString(),
      engineVersion: "1.0.0",
      warnings: [],
    };
    await saveAuditFindings([mockFinding as any]);

    const findings = await listAuditFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe("find_smoke_001");

    // 2. Build and save Evidence Pack
    const pack = buildEvidencePackFromAuditFinding({ finding: mockFinding as any });
    await saveEvidencePack(pack);

    const retrievedPack = await getEvidencePack("evp_find_smoke_001");
    expect(retrievedPack).not.toBeNull();
    expect(retrievedPack!.subjectId).toBe("find_smoke_001");

    // 3. Compose sections & synthesize Finding Report
    const sections = composeReportSectionsFromEvidencePack({ evidencePack: retrievedPack! });
    expect(sections.length).toBeGreaterThan(0);

    const synthesisReport = synthesizeFindingReport({
      subjectType: "audit",
      subjectId: retrievedPack!.subjectId,
      sections,
    });
    await saveFindingSynthesisReport(synthesisReport);

    const retrievedReport = await getFindingSynthesisReport(synthesisReport.id);
    expect(retrievedReport).not.toBeNull();
    expect(retrievedReport!.subjectId).toBe("find_smoke_001");

    // 4. Build and save Diagnostic Debate
    const debate = buildDiagnosticDebate({
      evidencePacks: [retrievedPack!],
      sections,
    });
    await saveDiagnosticDebate(debate);

    const retrievedDebate = await getDiagnosticDebate(debate.id);
    expect(retrievedDebate).not.toBeNull();
    expect(retrievedDebate!.unresolvedQuestions.length).toBeGreaterThan(0);

    // 5. Create outcome observer record & observe it
    const pendingOutcome = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sig_smoke_001",
      assetId: "US_AAPL",
      horizon: "forward_20d",
      evidencePackIds: [retrievedPack!.id],
    });

    const observedOutcome = await observeOutcome(pendingOutcome.id);
    expect(observedOutcome.outcomeStatus).toBe("observed");
    expect(observedOutcome.observedForwardReturn).toBeCloseTo(0.10);
    expect(observedOutcome.benchmarkReturn).toBeCloseTo(0.02);
    expect(observedOutcome.alphaReturn).toBeCloseTo(0.08); // 10% - 2%
    expect(observedOutcome.confidenceAdjustment).toBe("increase");
    expect(observedOutcome.benchmarkSourceRef).toBe("ohlcv_SP500_SAMPLE_US_SPY");

    const retrievedOutcome = await getOutcomeRecord(pendingOutcome.id);
    expect(retrievedOutcome).not.toBeNull();
    expect(retrievedOutcome!.alphaReturn).toBeCloseTo(0.08);
  });

  it("detects and promotes a surge candidate to Watchlist with a backing Evidence Pack", async () => {
    // 1. Detect Surge Candidates
    const candidates = await detectSurgeCandidates({ market: "US", universeId: "SP500_SAMPLE" });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].score).toBeGreaterThan(0);
    expect(candidates[0].scoreBreakdown.priceScore).toBeCloseTo(0.476, 2); // priceChangePct=4.76% -> score=0.476

    const targetCandidateId = candidates[0].id;

    // 2. Promote to Watchlist
    const promotion = await promoteSurgeCandidateToWatchlist({ candidateId: targetCandidateId });
    expect(promotion.watchlistItemId).not.toBeNull();
    expect(promotion.evidencePackId).toBe(`evp_promo_${targetCandidateId}`);

    // Verify watchlist item is created
    const items = await listWatchlistItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
