import { ReliabilityConfig } from "@/domain/reliability/reliability-config";

export function calculateReliabilityScore(params: {
  sampleSize: number;
  spearmanIcMean: number | null;
  hitRate: number | null;
  avgExcessReturn: number | null;
  shrunkIc: number | null;
  shrunkHitRate: number | null;
  config: ReliabilityConfig;
}): number | null {
  const {
    sampleSize,
    spearmanIcMean,
    hitRate,
    avgExcessReturn,
    shrunkIc,
    shrunkHitRate,
    config,
  } = params;

  // Enforce minimum sample check
  if (sampleSize < config.minSampleForReliability) {
    return null;
  }

  // Check required inputs
  if (
    spearmanIcMean === null ||
    spearmanIcMean === undefined ||
    hitRate === null ||
    hitRate === undefined ||
    shrunkIc === null ||
    shrunkIc === undefined ||
    shrunkHitRate === null ||
    shrunkHitRate === undefined
  ) {
    return null;
  }

  // 1. IC Component (-0.10 to +0.10 map to 0 to 100)
  const clampedIc = Math.max(-0.1, Math.min(0.1, shrunkIc));
  const icComponent = ((clampedIc + 0.1) / 0.2) * 100;

  // 2. Hit Rate Component (0.40 to 0.60 map to 0 to 100)
  const clampedHitRate = Math.max(0.4, Math.min(0.6, shrunkHitRate));
  const hitRateComponent = ((clampedHitRate - 0.4) / 0.2) * 100;

  // 3. Avg Excess Return Component (-5% to +5% map to 0 to 100)
  const excessRet = avgExcessReturn ?? 0;
  const clampedExcessRet = Math.max(-0.05, Math.min(0.05, excessRet));
  const avgExcessReturnComponent = ((clampedExcessRet + 0.05) / 0.1) * 100;

  // 4. Sample Component (size / robustThreshold, max 100)
  const sampleComponent = Math.min(
    100,
    (sampleSize / config.robustSampleThreshold) * 100
  );

  // Weighted calculation
  const compositeScore =
    0.4 * icComponent +
    0.3 * hitRateComponent +
    0.2 * avgExcessReturnComponent +
    0.1 * sampleComponent;

  return Math.round(compositeScore * 10) / 10; // Round to 1 decimal place
}
