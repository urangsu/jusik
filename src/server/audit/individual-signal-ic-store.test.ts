import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import {
  saveIndividualSignalIcResults,
  listIndividualSignalIcResults,
  getLatestIndividualSignalIcResults,
} from "./individual-signal-ic-store";
import { getIndividualSignalIcDir } from "./individual-signal-ic-store-paths";
import { IndividualSignalIcResult } from "@/domain/audit/individual-signal-ic-result";

describe("IndividualSignalIcStore", () => {
  const testDir = getIndividualSignalIcDir();

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("saves, lists, and queries individual signal IC results", async () => {
    const result: IndividualSignalIcResult = {
      id: "individual_signal_ic_KOSPI_SAMPLE_momentum_return_1w_20260622120000",
      signalId: "momentum_return",
      signalLabelKo: "수익률 모멘텀",
      universeId: "KOSPI_SAMPLE",
      horizon: "1w",
      sampleSize: 100,
      dateCount: 20,
      assetCount: 5,
      spearmanIc: 0.05,
      icir: 1.5,
      hitRate: 0.58,
      currentWeightInMomentumV1: 0.20,
      contributionAssessment: "positive",
      warnings: ["sample_universe_only"],
      sourceSignalCount: 1,
      calculatedAt: new Date().toISOString(),
      engineVersion: "1.0.0",
    };

    await saveIndividualSignalIcResults([result]);

    const retrieved = await getLatestIndividualSignalIcResults();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe(result.id);
    expect(retrieved[0].spearmanIc).toBe(0.05);

    // List with exact query match
    const queried = await listIndividualSignalIcResults({
      universeId: "KOSPI_SAMPLE",
      signalId: "momentum_return",
      horizon: "1w",
    });
    expect(queried).toHaveLength(1);

    // List with non-matching query
    const notFound = await listIndividualSignalIcResults({
      universeId: "SP500_SAMPLE",
    });
    expect(notFound).toHaveLength(0);
  });
});
