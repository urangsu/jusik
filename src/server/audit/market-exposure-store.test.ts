import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import {
  saveMarketExposureResult,
  getMarketExposureResultByTrial,
} from "./market-exposure-store";
import { getMarketExposureDir } from "./market-exposure-store-paths";
import { MarketExposureResult } from "@/domain/audit/market-exposure-result";

describe("MarketExposureStore", () => {
  const testDir = getMarketExposureDir();

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("saves and retrieves market exposure result by trialId", async () => {
    const result: MarketExposureResult = {
      id: "market_exposure_trial-1_20260622120000",
      trialId: "trial-1",
      backtestRunId: "run-1",
      strategyId: "momentum_v1",
      universeId: "KOSPI_SAMPLE",
      benchmarkAssetId: "KR:KOSPI",
      sampleSize: 50,
      beta: 1.15,
      benchmarkCorrelation: 0.68,
      upMarketAvgReturn: 0.05,
      downMarketAvgReturn: -0.02,
      upCapture: 1.2,
      downCapture: 0.8,
      averageExcessReturn: 0.015,
      assessment: "partially_market_dependent",
      warnings: ["sample_universe_only"],
      calculatedAt: new Date().toISOString(),
      engineVersion: "1.0.0",
    };

    await saveMarketExposureResult(result);

    const retrieved = await getMarketExposureResultByTrial("trial-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(result.id);
    expect(retrieved!.beta).toBe(1.15);

    const notFound = await getMarketExposureResultByTrial("trial-2");
    expect(notFound).toBeNull();
  });
});
