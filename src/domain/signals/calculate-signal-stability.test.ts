import { describe, expect, it } from "vitest";
import { calculateSignalStability } from "./calculate-signal-stability";
import type { SignalHistoryRecord } from "./signal-history";
import type { SignalVersion } from "./signal-version";

type TestSignal = {
  signalId: string;
  signal: string;
  rank: number | null;
};

const version: SignalVersion = {
  signalVersionId: "sigver_test",
  engine: {
    engineId: "signal_stability_test",
    engineVersion: "0.0.1",
    configHash: "hash_test",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  dataVersionId: "dataver_test",
  calculatedAt: "2026-07-01T00:00:00.000Z",
  expiryAt: null,
};

function record(date: string, signal: string, rank: number | null): SignalHistoryRecord<TestSignal> {
  return {
    signalHistoryId: `history_${date}_${signal}`,
    assetId: "US_AAPL",
    date,
    version,
    signal: {
      signalId: "momentum_v1",
      signal,
      rank,
    },
  };
}

describe("calculateSignalStability", () => {
  it("returns insufficient warning when history is missing", () => {
    const result = calculateSignalStability({
      assetId: "US_AAPL",
      signalId: "momentum_v1",
      date: "2026-07-05",
      records: [],
    });

    expect(result.consecutiveObservations).toBe(0);
    expect(result.actionableThresholdMet).toBe(false);
    expect(result.warnings).toContain("insufficient_signal_history");
    expect(result.status).toBe("insufficient_data");
  });

  it("marks stable signal when label persists and flip count is low", () => {
    const result = calculateSignalStability({
      assetId: "US_AAPL",
      signalId: "momentum_v1",
      date: "2026-07-05",
      records: [
        record("2026-07-01", "neutral", 20),
        record("2026-07-02", "positive_watch", 30),
        record("2026-07-03", "positive_watch", 40),
        record("2026-07-04", "positive_watch", 50),
        record("2026-07-05", "positive_watch", 60),
      ],
      getRankValue: (entry) => entry.signal.rank,
      rankAutocorrelation: 0.85, // Precalculated cross-sectional rank correlation
      minRankAutocorrelation: -1,
    });

    expect(result.consecutiveObservations).toBe(4);
    expect(result.flipCount30d).toBe(1);
    expect(result.actionableThresholdMet).toBe(true);
    expect(result.warnings).not.toContain("signal_not_persistent");
    expect(result.status).toBe("passed");
  });

  it("blocks unstable signal when labels flip too often", () => {
    const result = calculateSignalStability({
      assetId: "US_AAPL",
      signalId: "momentum_v1",
      date: "2026-07-06",
      records: [
        record("2026-07-01", "positive_watch", 10),
        record("2026-07-02", "risk", 20),
        record("2026-07-03", "positive_watch", 30),
        record("2026-07-04", "risk", 40),
        record("2026-07-05", "positive_watch", 50),
        record("2026-07-06", "risk", 60),
      ],
      maxFlipCount: 2,
    });

    expect(result.flipCount30d).toBe(5);
    expect(result.actionableThresholdMet).toBe(false);
    expect(result.warnings).toContain("signal_flip_count_high");
    expect(result.status).toBe("blocked");
  });

  it("does not use future records beyond as-of date", () => {
    const result = calculateSignalStability({
      assetId: "US_AAPL",
      signalId: "momentum_v1",
      date: "2026-07-03",
      records: [
        record("2026-07-01", "positive_watch", 10),
        record("2026-07-02", "positive_watch", 20),
        record("2026-07-03", "positive_watch", 30),
        record("2026-07-04", "risk", 40),
      ],
    });

    expect(result.consecutiveObservations).toBe(3);
    expect(result.flipCount30d).toBe(0);
    expect(result.actionableThresholdMet).toBe(true);
    expect(result.status).toBe("passed");
  });

  it("warns when rank autocorrelation is low", () => {
    const result = calculateSignalStability({
      assetId: "US_AAPL",
      signalId: "momentum_v1",
      date: "2026-07-05",
      records: [
        record("2026-07-01", "positive_watch", 10),
        record("2026-07-02", "positive_watch", 90),
        record("2026-07-03", "positive_watch", 20),
        record("2026-07-04", "positive_watch", 80),
        record("2026-07-05", "positive_watch", 30),
      ],
      getRankValue: (entry) => entry.signal.rank,
      rankAutocorrelation: 0.15, // Precalculated low cross-sectional rank correlation
      minRankAutocorrelation: 0.5,
    });

    expect(result.rankAutocorrelation).toBe(0.15);
    expect(result.actionableThresholdMet).toBe(false);
    expect(result.warnings).toContain("rank_autocorrelation_low");
    expect(result.status).toBe("blocked");
  });
});
