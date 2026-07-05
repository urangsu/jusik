import { describe, expect, it } from "vitest";
import {
  signalStabilityService,
  calculateCrossSectionalRankCorrelation,
  universeMembershipRegistry
} from "./signal-stability-service";
import type { SignalHistoryRecord } from "@/domain/signals/signal-history";

function makeRecord(params: {
  assetId: string;
  date: string;
  factorId: string;
  score: number;
  label: string;
}): SignalHistoryRecord<any> {
  return {
    signalHistoryId: `${params.assetId}_${params.factorId}_${params.date}`,
    assetId: params.assetId,
    date: params.date,
    version: {
      signalVersionId: "test_version",
      engine: {
        engineId: "test_engine",
        engineVersion: "1.0.0",
        configHash: "default",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
      dataVersionId: "test_data",
      calculatedAt: "2026-07-01T00:00:00.000Z",
      expiryAt: null,
    },
    signal: {
      factorId: params.factorId,
      score: params.score,
      signalLabel: params.label,
    },
  };
}

describe("SignalStabilityService", () => {
  it("isolates calculations by universeId and prevents mixing of universes", () => {
    universeMembershipRegistry.set("KOSPI_SAMPLE", ["KR:005930", "KR:000660", "KR:373220", "KR:207940", "KR:005380"]);
    universeMembershipRegistry.set("KOSDAQ_SAMPLE", ["KR:091990", "KR:247540", "KR:293490", "KR:068270", "KR:112040"]);

    const records: SignalHistoryRecord<any>[] = [
      // Day 1
      makeRecord({ assetId: "KR:005930", date: "2026-07-01", factorId: "momentum", score: 80, label: "bullish" }),
      makeRecord({ assetId: "KR:000660", date: "2026-07-01", factorId: "momentum", score: 70, label: "bullish" }),
      makeRecord({ assetId: "KR:373220", date: "2026-07-01", factorId: "momentum", score: 60, label: "neutral" }),
      makeRecord({ assetId: "KR:207940", date: "2026-07-01", factorId: "momentum", score: 50, label: "neutral" }),
      makeRecord({ assetId: "KR:005380", date: "2026-07-01", factorId: "momentum", score: 40, label: "bearish" }),

      makeRecord({ assetId: "KR:091990", date: "2026-07-01", factorId: "momentum", score: 100, label: "bullish" }), // KOSDAQ asset

      // Day 2
      makeRecord({ assetId: "KR:005930", date: "2026-07-02", factorId: "momentum", score: 85, label: "bullish" }),
      makeRecord({ assetId: "KR:000660", date: "2026-07-02", factorId: "momentum", score: 75, label: "bullish" }),
      makeRecord({ assetId: "KR:373220", date: "2026-07-02", factorId: "momentum", score: 65, label: "neutral" }),
      makeRecord({ assetId: "KR:207940", date: "2026-07-02", factorId: "momentum", score: 55, label: "neutral" }),
      makeRecord({ assetId: "KR:005380", date: "2026-07-02", factorId: "momentum", score: 45, label: "bearish" }),

      makeRecord({ assetId: "KR:091990", date: "2026-07-02", factorId: "momentum", score: 10, label: "bearish" }), // KOSDAQ asset
    ];

    // Compute for KOSPI_SAMPLE. It has 5 common assets, which is exactly the floor limit.
    const res = calculateCrossSectionalRankCorrelation(records, "momentum", "2026-07-02", "KOSPI_SAMPLE");
    expect(res.sampleSize).toBe(5);
    expect(res.correlation).toBeCloseTo(1.0, 5); // perfect correlation between Day 1 and Day 2 ranks within KOSPI

    // The KOSDAQ asset (KR:091990) did not pollute/mix into the KOSPI ranks.
    // If it did, ranks would have shifted and correlation wouldn't be exactly 1.0.
  });

  it("enforces correlation sample floor limits (< 5 is insufficient_data)", () => {
    universeMembershipRegistry.set("KOSPI_SMALL", ["KR:005930", "KR:000660", "KR:373220", "KR:207940"]); // only 4 assets

    const records: SignalHistoryRecord<any>[] = [
      // Day 1
      makeRecord({ assetId: "KR:005930", date: "2026-07-01", factorId: "momentum", score: 80, label: "bullish" }),
      makeRecord({ assetId: "KR:000660", date: "2026-07-01", factorId: "momentum", score: 70, label: "bullish" }),
      makeRecord({ assetId: "KR:373220", date: "2026-07-01", factorId: "momentum", score: 60, label: "neutral" }),
      makeRecord({ assetId: "KR:207940", date: "2026-07-01", factorId: "momentum", score: 50, label: "neutral" }),
      // Day 2
      makeRecord({ assetId: "KR:005930", date: "2026-07-02", factorId: "momentum", score: 85, label: "bullish" }),
      makeRecord({ assetId: "KR:000660", date: "2026-07-02", factorId: "momentum", score: 75, label: "bullish" }),
      makeRecord({ assetId: "KR:373220", date: "2026-07-02", factorId: "momentum", score: 65, label: "neutral" }),
      makeRecord({ assetId: "KR:207940", date: "2026-07-02", factorId: "momentum", score: 55, label: "neutral" }),
    ];

    const stability = signalStabilityService.calculateStabilityFromRecords(records, {
      assetId: "KR:005930",
      signalId: "momentum",
      universeId: "KOSPI_SMALL",
      date: "2026-07-02",
    });

    expect(stability.rankAutocorrelation).toBeNull();
    expect(stability.status).toBe("insufficient_data");
    expect(stability.warnings).toContain("insufficient_rank_autocorrelation_history");
  });

  it("calculates correlation and attaches warning when sample is low (5 to 9 assets)", () => {
    universeMembershipRegistry.set("KOSPI_MEDIUM", ["KR:005930", "KR:000660", "KR:373220", "KR:207940", "KR:005380", "KR:068270"]); // 6 assets

    const records: SignalHistoryRecord<any>[] = [
      // Day 1
      makeRecord({ assetId: "KR:005930", date: "2026-07-01", factorId: "momentum", score: 80, label: "bullish" }),
      makeRecord({ assetId: "KR:000660", date: "2026-07-01", factorId: "momentum", score: 70, label: "bullish" }),
      makeRecord({ assetId: "KR:373220", date: "2026-07-01", factorId: "momentum", score: 60, label: "neutral" }),
      makeRecord({ assetId: "KR:207940", date: "2026-07-01", factorId: "momentum", score: 50, label: "neutral" }),
      makeRecord({ assetId: "KR:005380", date: "2026-07-01", factorId: "momentum", score: 40, label: "bearish" }),
      makeRecord({ assetId: "KR:068270", date: "2026-07-01", factorId: "momentum", score: 30, label: "bearish" }),
      // Day 2
      makeRecord({ assetId: "KR:005930", date: "2026-07-02", factorId: "momentum", score: 85, label: "bullish" }),
      makeRecord({ assetId: "KR:000660", date: "2026-07-02", factorId: "momentum", score: 75, label: "bullish" }),
      makeRecord({ assetId: "KR:373220", date: "2026-07-02", factorId: "momentum", score: 65, label: "neutral" }),
      makeRecord({ assetId: "KR:207940", date: "2026-07-02", factorId: "momentum", score: 55, label: "neutral" }),
      makeRecord({ assetId: "KR:005380", date: "2026-07-02", factorId: "momentum", score: 45, label: "bearish" }),
      makeRecord({ assetId: "KR:068270", date: "2026-07-02", factorId: "momentum", score: 35, label: "bearish" }),
    ];

    const stability = signalStabilityService.calculateStabilityFromRecords(records, {
      assetId: "KR:005930",
      signalId: "momentum",
      universeId: "KOSPI_MEDIUM",
      date: "2026-07-02",
      minRankAutocorrelation: 0.2,
      minConsecutiveObservations: 1,
    });

    expect(stability.rankAutocorrelation).toBeCloseTo(1.0, 5);
    expect(stability.status).toBe("passed");
    expect(stability.warnings).toContain("rank_autocorrelation_low_sample");
  });
});
