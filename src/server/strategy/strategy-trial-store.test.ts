import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import {
  saveStrategyTrialRecord,
  listStrategyTrialRecords,
  getStrategyTrialRecordById,
  findStrategyTrialsByParameterHash,
} from "./strategy-trial-store";
import { getStrategyTrialsDir } from "./strategy-trial-store-paths";
import { StrategyTrialRecord } from "@/domain/strategy/strategy-trial-record";

describe("StrategyTrialStore", () => {
  const testDir = getStrategyTrialsDir();

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("saves, retrieves, lists and queries trials", async () => {
    const trial: StrategyTrialRecord = {
      id: "t1",
      strategyId: "momentum_v1_long_only",
      variantId: "baseline",
      strategyFamily: "momentum",
      thesisKo: "테제",
      hypothesis: "가설",
      parameters: { x: 1 },
      parameterHash: "h123",
      universeId: "KOSPI_SAMPLE",
      dataWindow: { startDate: "2026-01-01", endDate: "2026-06-01" },
      backtestRunId: "run1",
      observedMetrics: {
        oosReturn: 0.1,
        benchmarkReturn: 0.05,
        excessReturn: 0.05,
        sharpe: 1.5,
        maxDrawdown: -0.1,
        spearmanIc: 0.2,
        icir: 2.0,
        hitRate: 0.6,
        turnover: 0.2,
        nOosWindows: 5,
        nValidReturnWindows: 5,
        nValidIcWindows: 5,
        totalSelectedPositions: 10,
      },
      validationStatus: "backtested",
      validityLevel: "functional_check_only",
      rejectionReason: null,
      biasWarnings: [],
      failureConditionSummary: {
        hasInvalidBacktest: false,
        hasInsufficientData: false,
        hasMissingBenchmark: false,
        hasLowDataQuality: false,
        hasInsufficientIcPairs: false,
        hasPersonalFallback: false,
        hasSampleUniverseOnly: false,
        hasAdjustedPriceMissing: false,
        hasNoHistoricalUniverseMembership: false,
      },
      postmortemSummary: {
        signalPostmortemCount: 0,
        failedPositionCount: 0,
        positivePositionCount: 0,
        negativePositionCount: 0,
        missingPricePositionCount: 0,
      },
      sourceBacktestResultPath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engineVersion: "1.0.0",
    };

    await saveStrategyTrialRecord(trial);

    const retrieved = await getStrategyTrialRecordById("t1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("t1");

    const all = await listStrategyTrialRecords();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("t1");

    const found = await findStrategyTrialsByParameterHash("momentum_v1_long_only", "h123");
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe("t1");
  });

  it("throws error when trying to save duplicate ID", async () => {
    const trial1: any = {
      id: "dup",
      strategyId: "momentum_v1_long_only",
      variantId: "baseline",
      strategyFamily: "momentum",
      thesisKo: "T",
      hypothesis: "H",
      parameters: {},
      parameterHash: "h1",
      universeId: "KOSPI_SAMPLE",
      dataWindow: { startDate: "2026", endDate: "2026" },
      backtestRunId: null,
      observedMetrics: {
        oosReturn: null, benchmarkReturn: null, excessReturn: null, sharpe: null, maxDrawdown: null,
        spearmanIc: null, icir: null, hitRate: null, turnover: null, nOosWindows: 0, nValidReturnWindows: 0, nValidIcWindows: 0, totalSelectedPositions: 0
      },
      validationStatus: "draft",
      validityLevel: null,
      rejectionReason: null,
      biasWarnings: [],
      failureConditionSummary: {
        hasInvalidBacktest: false, hasInsufficientData: false, hasMissingBenchmark: false, hasLowDataQuality: false,
        hasInsufficientIcPairs: false, hasPersonalFallback: false, hasSampleUniverseOnly: false, hasAdjustedPriceMissing: false, hasNoHistoricalUniverseMembership: false
      },
      postmortemSummary: {
        signalPostmortemCount: 0, failedPositionCount: 0, positivePositionCount: 0, negativePositionCount: 0, missingPricePositionCount: 0
      },
      sourceBacktestResultPath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engineVersion: "1.0.0"
    };

    const trial2 = { ...trial1 };

    await saveStrategyTrialRecord(trial1);
    await expect(saveStrategyTrialRecord(trial2)).rejects.toThrow();
  });
});
