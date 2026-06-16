import { MarketRegion } from "@/domain/common/data-status";
import { NormalizationMethod, NormalizationScope } from "@/domain/signals/normalization-scope";
import { ResearchCalcResult, isFiniteNumber } from "../research-calc-result";

type NormalizeObservation = {
  assetId: string;
  market: MarketRegion;
  universe: string;
  sector?: string;
  value: number | null;
};

type NormalizedObservation = NormalizeObservation & {
  normalizedValue: number | null;
  percentile: number | null;
  zScore: number | null;
  normalizationScope: NormalizationScope;
};

type CrossSectionalNormalizeParams = {
  observations: NormalizeObservation[];
  method: NormalizationMethod;
  sectorNeutral?: boolean;
  winsorizePct?: number;
};

function hasFiniteValue(row: NormalizeObservation): row is NormalizeObservation & { value: number } {
  return isFiniteNumber(row.value);
}

function zscoreRows(rows: NormalizeObservation[]): Map<string, number | null> {
  const finite = rows.filter(hasFiniteValue);
  const output = new Map<string, number | null>(rows.map((row) => [row.assetId, null]));
  if (finite.length < 2) return output;
  const mean = finite.reduce((sum, row) => sum + row.value, 0) / finite.length;
  const variance = finite.reduce((sum, row) => sum + (row.value - mean) ** 2, 0) / finite.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0 || !Number.isFinite(stddev)) return output;
  for (const row of finite) {
    output.set(row.assetId, (row.value - mean) / stddev);
  }
  return output;
}

function percentileRows(rows: NormalizeObservation[]): Map<string, number | null> {
  const finite = rows
    .filter(hasFiniteValue)
    .sort((a, b) => a.value - b.value);
  const output = new Map<string, number | null>(rows.map((row) => [row.assetId, null]));
  if (finite.length === 0) return output;
  if (finite.length === 1) {
    output.set(finite[0].assetId, 50);
    return output;
  }
  for (const [index, row] of finite.entries()) {
    output.set(row.assetId, (index / (finite.length - 1)) * 100);
  }
  return output;
}

export function crossSectionalNormalize(
  params: CrossSectionalNormalizeParams,
): ResearchCalcResult<NormalizedObservation[]> {
  if (params.observations.length === 0) {
    return {
      value: null,
      status: "insufficient_data",
      warnings: ["No observations supplied for cross-sectional normalization."],
      sampleSize: 0,
    };
  }

  const markets = new Set(params.observations.map((row) => row.market));
  const universes = new Set(params.observations.map((row) => row.universe));
  if (markets.size !== 1 || universes.size !== 1) {
    return {
      value: null,
      status: "not_supported",
      warnings: ["Cross-sectional normalization must use one market and one universe per call."],
      sampleSize: params.observations.length,
    };
  }

  const market = params.observations[0].market;
  const universe = params.observations[0].universe;
  const groups = new Map<string, NormalizeObservation[]>();
  if (params.sectorNeutral || params.method === "sector_neutral_zscore") {
    for (const row of params.observations) {
      const key = row.sector ?? "__missing_sector__";
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
  } else {
    groups.set("__all__", params.observations);
  }

  const zScores = new Map<string, number | null>();
  const percentiles = new Map<string, number | null>();
  for (const rows of groups.values()) {
    const groupZ = zscoreRows(rows);
    const groupPercentiles = percentileRows(rows);
    for (const row of rows) {
      zScores.set(row.assetId, groupZ.get(row.assetId) ?? null);
      percentiles.set(row.assetId, groupPercentiles.get(row.assetId) ?? null);
    }
  }

  return {
    value: params.observations.map((row) => ({
      ...row,
      normalizedValue:
        params.method === "rank_percentile" ? (percentiles.get(row.assetId) ?? null) : (zScores.get(row.assetId) ?? null),
      percentile: percentiles.get(row.assetId) ?? null,
      zScore: zScores.get(row.assetId) ?? null,
      normalizationScope: {
        market,
        universe,
        sector: params.sectorNeutral ? row.sector : undefined,
        method: params.method,
        winsorizePct: params.winsorizePct,
      },
    })),
    status: "ok",
    warnings: [],
    sampleSize: params.observations.filter((row) => isFiniteNumber(row.value)).length,
  };
}
