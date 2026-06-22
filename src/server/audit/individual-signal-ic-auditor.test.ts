import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockResolveSignalAuditCandidates = vi.fn();
vi.mock("./signal-candidate-resolver", () => ({
  resolveSignalAuditCandidates: () => mockResolveSignalAuditCandidates(),
}));

const mockLoadSignalScoreSeries = vi.fn();
vi.mock("./signal-score-series-loader", () => ({
  loadSignalScoreSeries: (input: any) => mockLoadSignalScoreSeries(input),
}));

const mockLoadForwardReturnSeries = vi.fn();
vi.mock("./forward-return-series-loader", () => ({
  loadForwardReturnSeries: (input: any) => mockLoadForwardReturnSeries(input),
}));

// Mock Spearman IC calculator
vi.mock("@/server/backtest/backtest-ic-calculator", () => ({
  calculateSpearmanIC: (pairs: any[]) => {
    // Basic mock Spearman calculator: returns average difference or fixed value for test
    if (pairs.length === 3 && pairs[0].score === 10) {
      return { ic: 0.5 };
    }
    if (pairs.length === 3 && pairs[0].score === -10) {
      return { ic: -0.5 };
    }
    return { ic: 0.005 };
  },
}));

import { auditIndividualSignalIc } from "./individual-signal-ic-auditor";

describe("IndividualSignalIcAuditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not_available if signal scores are missing", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", signalLabelKo: "수익률 모멘텀", currentWeightInMomentumV1: 0.2, available: true },
    ]);
    mockLoadSignalScoreSeries.mockResolvedValue([]); // Empty scores

    const results = await auditIndividualSignalIc({ universeId: "KOSPI_SAMPLE" });

    expect(results.length).toBe(3); // 1w, 1m, 3m
    expect(results[0].contributionAssessment).toBe("not_available");
    expect(results[0].warnings).toContain("missing_signal_score");
    expect(results[0].warnings).toContain("sample_universe_only");
  });

  it("should flag insufficient_sample when sampleSize is less than 30", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", signalLabelKo: "수익률 모멘텀", currentWeightInMomentumV1: 0.2, available: true },
    ]);
    // Create 10 scores (less than 30)
    const scores = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-01-${10 + i}`,
      assetId: "005930",
      signalId: "momentum_return",
      score: 10,
      sourceTier: "official" as const,
      warnings: [],
    }));
    mockLoadSignalScoreSeries.mockResolvedValue(scores);

    mockLoadForwardReturnSeries.mockResolvedValue(
      scores.map((s) => ({
        date: s.date,
        assetId: s.assetId,
        horizon: "1w",
        forwardReturn: 0.05,
        sourceTier: "official" as const,
        warnings: [],
      }))
    );

    const results = await auditIndividualSignalIc({ universeId: "KOSPI_SAMPLE", horizon: "1w" });

    expect(results.length).toBe(1);
    expect(results[0].sampleSize).toBe(10);
    expect(results[0].contributionAssessment).toBe("insufficient_sample");
    expect(results[0].warnings).toContain("insufficient_sample");
  });

  it("should calculate positive contribution and hit rate correctly", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", signalLabelKo: "수익률 모멘텀", currentWeightInMomentumV1: 0.2, available: true },
    ]);
    // 30 scores (satisfies min sample size) spread across 10 dates with 3 assets each (to satisfy valid pairs >= 3)
    const scores: any[] = [];
    const returns: any[] = [];

    for (let d = 0; d < 10; d++) {
      const date = `2024-01-${10 + d}`;
      for (let a = 0; a < 3; a++) {
        const assetId = `A00${a}`;
        scores.push({
          date,
          assetId,
          signalId: "momentum_return",
          score: 10,
          sourceTier: "official",
          warnings: [],
        });
        returns.push({
          date,
          assetId,
          horizon: "1w",
          forwardReturn: 0.05,
          sourceTier: "official",
          warnings: [],
        });
      }
    }

    mockLoadSignalScoreSeries.mockResolvedValue(scores);
    mockLoadForwardReturnSeries.mockResolvedValue(returns);

    const results = await auditIndividualSignalIc({ universeId: "KOSPI_SAMPLE", horizon: "1w" });

    expect(results.length).toBe(1);
    expect(results[0].sampleSize).toBe(30);
    expect(results[0].spearmanIc).toBe(0.5);
    expect(results[0].contributionAssessment).toBe("positive");
    expect(results[0].warnings).not.toContain("insufficient_sample");
  });

  it("should flag negative_contribution when Spearman IC is negative", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", signalLabelKo: "수익률 모멘텀", currentWeightInMomentumV1: 0.2, available: true },
    ]);
    const scores: any[] = [];
    const returns: any[] = [];

    for (let d = 0; d < 10; d++) {
      const date = `2024-01-${10 + d}`;
      for (let a = 0; a < 3; a++) {
        const assetId = `A00${a}`;
        scores.push({
          date,
          assetId,
          signalId: "momentum_return",
          score: -10, // negative indicator score
          sourceTier: "official",
          warnings: [],
        });
        returns.push({
          date,
          assetId,
          horizon: "1w",
          forwardReturn: 0.05,
          sourceTier: "official",
          warnings: [],
        });
      }
    }

    mockLoadSignalScoreSeries.mockResolvedValue(scores);
    mockLoadForwardReturnSeries.mockResolvedValue(returns);

    const results = await auditIndividualSignalIc({ universeId: "KOSPI_SAMPLE", horizon: "1w" });

    expect(results[0].spearmanIc).toBe(-0.5);
    expect(results[0].contributionAssessment).toBe("negative");
    expect(results[0].warnings).toContain("negative_contribution");
  });

  it("should flag weak_signal_high_weight when IC is small but weight is high", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", signalLabelKo: "수익률 모멘텀", currentWeightInMomentumV1: 0.2, available: true },
    ]);
    const scores: any[] = [];
    const returns: any[] = [];

    for (let d = 0; d < 10; d++) {
      const date = `2024-01-${10 + d}`;
      for (let a = 0; a < 3; a++) {
        const assetId = `A00${a}`;
        scores.push({
          date,
          assetId,
          signalId: "momentum_return",
          score: 1, // small score differences resulting in small IC
          sourceTier: "official",
          warnings: [],
        });
        returns.push({
          date,
          assetId,
          horizon: "1w",
          forwardReturn: 0.05,
          sourceTier: "official",
          warnings: [],
        });
      }
    }

    mockLoadSignalScoreSeries.mockResolvedValue(scores);
    mockLoadForwardReturnSeries.mockResolvedValue(returns);

    const results = await auditIndividualSignalIc({ universeId: "KOSPI_SAMPLE", horizon: "1w" });

    expect(results[0].spearmanIc).toBe(0.005); // Less than 0.01
    expect(results[0].contributionAssessment).toBe("neutral");
    expect(results[0].warnings).toContain("weak_signal_high_weight");
  });
});
