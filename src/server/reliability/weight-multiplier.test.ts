import { describe, expect, it } from "vitest";
import { calculateWeightMultiplier } from "./weight-multiplier";
import { DEFAULT_RELIABILITY_CONFIG, ReliabilityConfig } from "../../domain/reliability/reliability-config";

describe("calculateWeightMultiplier", () => {
  const mockConfig: ReliabilityConfig = {
    ...DEFAULT_RELIABILITY_CONFIG,
    universeId: "KOSPI_SAMPLE",
  };

  it("returns null if reliabilityScore is null or sampleSize is below minSampleForReliability", () => {
    expect(
      calculateWeightMultiplier({
        reliabilityScore: 50,
        sampleSize: 9,
        config: mockConfig,
      })
    ).toBeNull();

    expect(
      calculateWeightMultiplier({
        reliabilityScore: null,
        sampleSize: 15,
        config: mockConfig,
      })
    ).toBeNull();
  });

  it("uses cold-start limits [0.8, 1.1] when sampleSize < robustSampleThreshold (30)", () => {
    // Score 100 should map to maxLimit: 1.1
    const maxVal = calculateWeightMultiplier({
      reliabilityScore: 100,
      sampleSize: 15,
      config: mockConfig,
    });
    expect(maxVal).toBe(1.1);

    // Score 0 should map to minLimit: 0.8
    const minVal = calculateWeightMultiplier({
      reliabilityScore: 0,
      sampleSize: 15,
      config: mockConfig,
    });
    expect(minVal).toBe(0.8);

    // Score 50 should map to 1.0
    const midVal = calculateWeightMultiplier({
      reliabilityScore: 50,
      sampleSize: 15,
      config: mockConfig,
    });
    expect(midVal).toBe(1.0);
  });

  it("uses full limits [0.5, 1.5] when sampleSize >= robustSampleThreshold (30)", () => {
    // Score 100 should map to maxLimit: 1.5
    const maxVal = calculateWeightMultiplier({
      reliabilityScore: 100,
      sampleSize: 35,
      config: mockConfig,
    });
    expect(maxVal).toBe(1.5);

    // Score 0 should map to minLimit: 0.5
    const minVal = calculateWeightMultiplier({
      reliabilityScore: 0,
      sampleSize: 35,
      config: mockConfig,
    });
    expect(minVal).toBe(0.5);

    // Score 75 should be halfway between 1.0 and 1.5 = 1.25
    const testVal = calculateWeightMultiplier({
      reliabilityScore: 75,
      sampleSize: 35,
      config: mockConfig,
    });
    expect(testVal).toBe(1.25);
  });
});
