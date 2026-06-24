import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import {
  saveFactorCorrelationResults,
  listFactorCorrelationResults,
} from "./factor-correlation-store";
import { getFactorCorrelationDir } from "./factor-correlation-store-paths";
import { FactorCorrelationResult } from "@/domain/audit/factor-correlation-result";

describe("FactorCorrelationStore", () => {
  const testDir = getFactorCorrelationDir();

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("saves, lists, and queries factor correlation results", async () => {
    const result: FactorCorrelationResult = {
      id: "factor_correlation_KOSPI_SAMPLE_momentum_return_momentum_turtle_spearman_20260622120000",
      universeId: "KOSPI_SAMPLE",
      factorA: "momentum_return",
      factorB: "momentum_turtle",
      method: "spearman",
      sampleSize: 100,
      dateCount: 20,
      assetCount: 5,
      correlation: 0.45,
      absCorrelation: 0.45,
      severity: "ok",
      warnings: ["sample_universe_only"],
      sourceTierSummary: "official",
      calculatedAt: new Date().toISOString(),
      engineVersion: "1.0.0",
    };

    await saveFactorCorrelationResults([result]);

    const retrieved = await listFactorCorrelationResults();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe(result.id);
    expect(retrieved[0].correlation).toBe(0.45);

    // Query filters matching
    const queried = await listFactorCorrelationResults({
      universeId: "KOSPI_SAMPLE",
      factorId: "momentum_return",
      method: "spearman",
    });
    expect(queried).toHaveLength(1);

    const queriedB = await listFactorCorrelationResults({
      factorId: "momentum_turtle",
    });
    expect(queriedB).toHaveLength(1);

    // Non-matching query
    const notFound = await listFactorCorrelationResults({
      universeId: "SP500_SAMPLE",
    });
    expect(notFound).toHaveLength(0);
  });
});
