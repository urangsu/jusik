export type TurnoverWeightMap = Map<string, number> | Record<string, number>;

function getWeight(weights: TurnoverWeightMap, assetId: string): number {
  if (weights instanceof Map) {
    return weights.get(assetId) ?? 0;
  }
  return weights[assetId] ?? 0;
}

function assetIds(weights: TurnoverWeightMap): Set<string> {
  if (weights instanceof Map) {
    return new Set(weights.keys());
  }
  return new Set(Object.keys(weights));
}

/**
 * 연속 OOS 구간 간 포트폴리오 교체율.
 * turnover_t = 0.5 * Σ |w_t(asset) - w_{t-1}(asset)|
 *
 * 이전 구간이 없으면 null.
 */
export function calculateTurnover(
  previousWeights: TurnoverWeightMap | null | undefined,
  currentWeights: TurnoverWeightMap
): number | null {
  if (!previousWeights) {
    return null;
  }

  const allAssetIds = new Set([...assetIds(previousWeights), ...assetIds(currentWeights)]);
  let sumDiff = 0;

  for (const assetId of allAssetIds) {
    sumDiff += Math.abs(getWeight(currentWeights, assetId) - getWeight(previousWeights, assetId));
  }

  return 0.5 * sumDiff;
}
