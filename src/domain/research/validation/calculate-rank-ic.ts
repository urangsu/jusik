import { FactorHorizon } from "@/domain/factors/factor-ic-record";
import { ResearchCalcResult, isFiniteNumber } from "../research-calc-result";

type AssetValue = {
  assetId: string;
  value: number | null;
};

type RankICResult = {
  ic: number;
  method: "spearman";
  sampleSize: number;
  horizon: FactorHorizon;
};

type CalculateRankICParams = {
  calcDate: string;
  horizon: FactorHorizon;
  factorScores: AssetValue[];
  forwardReturns: AssetValue[];
};

function averageRanks(values: number[]): number[] {
  const indexed = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);
  const ranks = Array(values.length).fill(0) as number[];
  let cursor = 0;

  while (cursor < indexed.length) {
    let end = cursor;
    while (end + 1 < indexed.length && indexed[end + 1].value === indexed[cursor].value) {
      end += 1;
    }
    const averageRank = (cursor + 1 + end + 1) / 2;
    for (let i = cursor; i <= end; i += 1) {
      ranks[indexed[i].index] = averageRank;
    }
    cursor = end + 1;
  }

  return ranks;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n !== ys.length || n < 2) return null;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    sumXSquared += dx * dx;
    sumYSquared += dy * dy;
  }

  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  if (denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

export function calculateRankIC(params: CalculateRankICParams): ResearchCalcResult<RankICResult> {
  const returnByAsset = new Map(params.forwardReturns.map((row) => [row.assetId, row.value]));
  const pairs = params.factorScores
    .map((factor) => ({
      assetId: factor.assetId,
      factorValue: factor.value,
      returnValue: returnByAsset.get(factor.assetId),
    }))
    .filter(
      (pair): pair is { assetId: string; factorValue: number; returnValue: number } =>
        isFiniteNumber(pair.factorValue) && isFiniteNumber(pair.returnValue),
    );

  if (pairs.length < 30) {
    return {
      value: null,
      status: "insufficient_data",
      warnings: ["Rank IC requires at least 30 common finite asset pairs after filtering."],
      sampleSize: pairs.length,
    };
  }

  const factorRanks = averageRanks(pairs.map((pair) => pair.factorValue));
  const returnRanks = averageRanks(pairs.map((pair) => pair.returnValue));
  const ic = pearson(factorRanks, returnRanks);

  if (ic === null) {
    return {
      value: null,
      status: "invalid_input",
      warnings: ["Rank IC could not be calculated from constant or invalid ranks."],
      sampleSize: pairs.length,
    };
  }

  return {
    value: {
      ic,
      method: "spearman",
      sampleSize: pairs.length,
      horizon: params.horizon,
    },
    status: "ok",
    warnings: [],
    sampleSize: pairs.length,
  };
}
