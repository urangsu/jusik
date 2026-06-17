import { describe, expect, it } from "vitest";
import { calculateReliabilityScore } from "./reliability-score";
import { DEFAULT_RELIABILITY_CONFIG, ReliabilityConfig } from "../../domain/reliability/reliability-config";

describe("calculateReliabilityScore", () => {
  const mockConfig: ReliabilityConfig = {
    ...DEFAULT_RELIABILITY_CONFIG,
    universeId: "KOSPI_SAMPLE",
  };

  it("returns null if sampleSize is less than minSampleForReliability", () => {
    const score = calculateReliabilityScore({
      sampleSize: 5,
      spearmanIcMean: 0.05,
      hitRate: 0.55,
      avgExcessReturn: 0.01,
      shrunkIc: 0.02,
      shrunkHitRate: 0.52,
      config: mockConfig,
    });
    expect(score).toBeNull();
  });

  it("returns null if any required metric is null", () => {
    const score = calculateReliabilityScore({
      sampleSize: 15,
      spearmanIcMean: null,
      hitRate: 0.55,
      avgExcessReturn: 0.01,
      shrunkIc: 0.02,
      shrunkHitRate: 0.52,
      config: mockConfig,
    });
    expect(score).toBeNull();
  });

  it("calculates correct composite score using formula", () => {
    // spearmanIcMean: 0.08, hitRate: 0.58, excess: 0.02, sampleSize: 15
    // shrunkIc: 0.05 (clamped between -0.1 and 0.1) -> ((0.05 + 0.1) / 0.2) * 100 = 75
    // shrunkHitRate: 0.55 (clamped between 0.4 and 0.6) -> ((0.55 - 0.4) / 0.2) * 100 = 75
    // excess: 0.02 (clamped between -0.05 and 0.05) -> ((0.02 + 0.05) / 0.1) * 100 = 70
    // sampleComponent: (15 / 30) * 100 = 50
    // weighted score: 0.4 * 75 + 0.3 * 75 + 0.2 * 70 + 0.1 * 50 = 30 + 22.5 + 14 + 5 = 71.5
    const score = calculateReliabilityScore({
      sampleSize: 15,
      spearmanIcMean: 0.08,
      hitRate: 0.58,
      avgExcessReturn: 0.02,
      shrunkIc: 0.05,
      shrunkHitRate: 0.55,
      config: mockConfig,
    });
    expect(score).toBe(71.5);
  });
});
