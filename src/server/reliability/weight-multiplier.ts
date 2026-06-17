import { ReliabilityConfig } from "@/domain/reliability/reliability-config";

export function calculateWeightMultiplier(params: {
  reliabilityScore: number | null;
  sampleSize: number;
  config: ReliabilityConfig;
}): number | null {
  const { reliabilityScore, sampleSize, config } = params;

  if (
    reliabilityScore === null ||
    reliabilityScore === undefined ||
    sampleSize < config.minSampleForReliability
  ) {
    return null;
  }

  // Determine limits based on sample size status
  const isColdStart = sampleSize < config.robustSampleThreshold;
  const minLimit = isColdStart ? config.coldStartMultiplierMin : config.weightMultiplierMin;
  const maxLimit = isColdStart ? config.coldStartMultiplierMax : config.weightMultiplierMax;

  let multiplier = 1.0;

  if (reliabilityScore >= 50) {
    const ratio = (reliabilityScore - 50) / 50;
    multiplier = 1.0 + ratio * (maxLimit - 1.0);
  } else {
    const ratio = (50 - reliabilityScore) / 50;
    multiplier = 1.0 - ratio * (1.0 - minLimit);
  }

  // Double check bounds to prevent float overflow
  multiplier = Math.max(minLimit, Math.min(maxLimit, multiplier));

  // Round to 3 decimal places
  return Math.round(multiplier * 1000) / 1000;
}
