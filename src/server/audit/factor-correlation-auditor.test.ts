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

import { auditAllFactorCorrelations } from "./factor-correlation-auditor";

describe("FactorCorrelationAuditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not_available if any signal scores are completely missing", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", available: true },
      { signalId: "momentum_turtle", available: true },
    ]);
    mockLoadSignalScoreSeries.mockResolvedValue([]); // Empty score series

    const results = await auditAllFactorCorrelations({ universeId: "KOSPI_SAMPLE" });

    expect(results.length).toBe(1);
    expect(results[0].severity).toBe("not_available");
    expect(results[0].warnings).toContain("missing_factor_score");
  });

  it("should return insufficient_sample if overlapping pairs count is less than 30", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", available: true },
      { signalId: "momentum_turtle", available: true },
    ]);

    // Create 10 overlapping scores
    const scoresA = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-01-${10 + i}`,
      assetId: "A001",
      signalId: "momentum_return",
      score: i,
      sourceTier: "official",
      warnings: [],
    }));

    const scoresB = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-01-${10 + i}`,
      assetId: "A001",
      signalId: "momentum_turtle",
      score: i * 2,
      sourceTier: "official",
      warnings: [],
    }));

    mockLoadSignalScoreSeries.mockImplementation((input: any) => {
      if (input.signalId === "momentum_return") return Promise.resolve(scoresA);
      return Promise.resolve(scoresB);
    });

    const results = await auditAllFactorCorrelations({ universeId: "KOSPI_SAMPLE" });

    expect(results.length).toBe(1);
    expect(results[0].sampleSize).toBe(10);
    expect(results[0].severity).toBe("insufficient_sample");
    expect(results[0].warnings).toContain("insufficient_sample");
  });

  it("should calculate Pearson and Spearman correlations correctly, classifying severity danger/warn", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", available: true },
      { signalId: "momentum_turtle", available: true },
    ]);

    // Create 35 overlapping scores (satisfying minSampleSize = 30)
    // Create perfect positive linear correlation (r = 1.0)
    const scoresA: any[] = [];
    const scoresB: any[] = [];

    for (let i = 0; i < 35; i++) {
      const date = `2024-01-${10 + i}`;
      scoresA.push({
        date,
        assetId: "A001",
        signalId: "momentum_return",
        score: i,
        sourceTier: "official",
        warnings: [],
      });
      scoresB.push({
        date,
        assetId: "A001",
        signalId: "momentum_turtle",
        score: i * 1.5 + 5,
        sourceTier: "official",
        warnings: [],
      });
    }

    mockLoadSignalScoreSeries.mockImplementation((input: any) => {
      if (input.signalId === "momentum_return") return Promise.resolve(scoresA);
      return Promise.resolve(scoresB);
    });

    // Test Spearman (default)
    let results = await auditAllFactorCorrelations({ universeId: "KOSPI_SAMPLE", method: "spearman" });
    expect(results[0].correlation).toBe(1.0);
    expect(results[0].severity).toBe("danger");
    expect(results[0].warnings).toContain("very_high_correlation");

    // Test Pearson
    results = await auditAllFactorCorrelations({ universeId: "KOSPI_SAMPLE", method: "pearson" });
    expect(results[0].correlation).toBe(1.0);
    expect(results[0].severity).toBe("danger");
    expect(results[0].warnings).toContain("very_high_correlation");
  });

  it("should flag personal_fallback_used and source_tier_mixed when source tiers match criteria", async () => {
    mockResolveSignalAuditCandidates.mockResolvedValue([
      { signalId: "momentum_return", available: true },
      { signalId: "momentum_turtle", available: true },
    ]);

    const scoresA: any[] = [];
    const scoresB: any[] = [];

    for (let i = 0; i < 35; i++) {
      const date = `2024-01-${10 + i}`;
      scoresA.push({
        date,
        assetId: "A001",
        signalId: "momentum_return",
        score: i,
        sourceTier: "official",
        warnings: [],
      });
      // One point uses personal_fallback to trigger warnings
      scoresB.push({
        date,
        assetId: "A001",
        signalId: "momentum_turtle",
        score: i * 2,
        sourceTier: i === 0 ? "personal_fallback" : "official",
        warnings: [],
      });
    }

    mockLoadSignalScoreSeries.mockImplementation((input: any) => {
      if (input.signalId === "momentum_return") return Promise.resolve(scoresA);
      return Promise.resolve(scoresB);
    });

    const results = await auditAllFactorCorrelations({ universeId: "KOSPI_SAMPLE" });

    expect(results[0].sourceTierSummary).toBe("mixed");
    expect(results[0].warnings).toContain("source_tier_mixed");
    expect(results[0].warnings).toContain("personal_fallback_used");
  });
});
