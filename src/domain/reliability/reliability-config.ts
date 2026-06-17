export type ReliabilityConfig = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  horizons: Array<"1w" | "1m" | "3m">;

  minSampleForIc: number; // default 5
  minSampleForReliability: number; // default 10
  robustSampleThreshold: number; // default 30

  priorHitRate: number; // default 0.5
  priorIc: number; // default 0
  priorStrength: number; // default 30

  weightMultiplierMin: number; // default 0.5
  weightMultiplierMax: number; // default 1.5

  coldStartMultiplierMin: number; // default 0.8
  coldStartMultiplierMax: number; // default 1.1
};

export const DEFAULT_RELIABILITY_CONFIG: Omit<ReliabilityConfig, "universeId"> = {
  horizons: ["1w", "1m", "3m"],
  minSampleForIc: 5,
  minSampleForReliability: 10,
  robustSampleThreshold: 30,
  priorHitRate: 0.5,
  priorIc: 0.0,
  priorStrength: 30,
  weightMultiplierMin: 0.5,
  weightMultiplierMax: 1.5,
  coldStartMultiplierMin: 0.8,
  coldStartMultiplierMax: 1.1,
};
