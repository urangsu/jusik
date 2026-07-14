import { calculateSignalStability } from "@/domain/signals/calculate-signal-stability";
import { getSignalHistory } from "./signal-history-store";
import { SignalStability } from "@/domain/signals/signal-stability";
import { SignalHistoryRecord } from "@/domain/signals/signal-history";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";

function getSignalId(signal: unknown): string {
  if (!signal || typeof signal !== "object") return "unknown";
  const candidate = signal as Record<string, unknown>;
  return String(
    candidate.signalId ??
      candidate.strategyId ??
      candidate.factorId ??
      candidate.id ??
      "unknown"
  );
}

export const universeMembershipRegistry = new Map<string, string[]>();

export function getAssetsOfUniverse(universeId: string): string[] | null {
  if (universeMembershipRegistry.has(universeId)) {
    return universeMembershipRegistry.get(universeId)!;
  }
  if (universeId === "KOSPI_SAMPLE") {
    return KOSPI_SAMPLE_CONSTITUENTS.map((c) => c.assetId);
  }
  if (universeId === "SP500_SAMPLE") {
    return SP500_SAMPLE_CONSTITUENTS.map((c) => c.assetId);
  }
  if (universeId === "SEED_DEMO") {
    return ["KR:005930", "US:AAPL"];
  }
  return null;
}

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  let numerator = 0;
  let varX = 0;
  let varY = 0;

  for (let index = 0; index < xs.length; index += 1) {
    const dx = xs[index] - meanX;
    const dy = ys[index] - meanY;
    numerator += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denominator = Math.sqrt(varX * varY);
  if (denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

/**
 * Computes the cross-sectional rank map for the given records.
 * Resolves ties using fractional/average ranking.
 */
function computeAverageRanks(records: SignalHistoryRecord<any>[]): Map<string, number> {
  const sorted = [...records]
    .filter((r) => r.signal?.score !== null && r.signal?.score !== undefined)
    .sort((a, b) => (a.signal.score ?? 0) - (b.signal.score ?? 0));

  const ranksMap = new Map<string, number>();
  const N = sorted.length;
  if (N === 0) return ranksMap;

  let i = 0;
  while (i < N) {
    let j = i;
    const score = sorted[i].signal.score;
    while (j < N && sorted[j].signal.score === score) {
      j++;
    }
    const avgRank = (i + j - 1) / 2;
    for (let k = i; k < j; k++) {
      ranksMap.set(sorted[k].assetId, avgRank);
    }
    i = j;
  }
  return ranksMap;
}

export type RankCorrelationResult = {
  correlation: number | null;
  isLowSample: boolean;
  sampleSize: number;
};

/**
 * Calculates aligned cross-sectional rank autocorrelation of the signal across the universe
 * between date t (target date) and date t-1 (previous session date), strictly isolated by universeId.
 */
export function calculateCrossSectionalRankCorrelation(
  records: SignalHistoryRecord<any>[],
  signalId: string,
  targetDate: string,
  universeId: string
): RankCorrelationResult {
  const universeAssets = getAssetsOfUniverse(universeId);
  if (!universeAssets) {
    // unknown universe -> fail-closed
    return { correlation: null, isLowSample: false, sampleSize: 0 };
  }

  // Group and find all unique dates in the signal history up to targetDate belonging to the universe constituents
  const allDates = Array.from(
    new Set(
      records
        .filter((r) => {
          const matchesSignal = getSignalId(r.signal) === signalId;
          const matchesUniverse = universeAssets.includes(r.assetId);
          return matchesSignal && matchesUniverse;
        })
        .map((r) => r.date)
    )
  ).sort((a, b) => b.localeCompare(a)); // Descending order

  const idxT = allDates.findIndex((d) => d <= targetDate);
  if (idxT === -1) {
    return { correlation: null, isLowSample: false, sampleSize: 0 };
  }

  const dateT = allDates[idxT];
  const dateTMinus1 = allDates[idxT + 1];
  if (!dateTMinus1) {
    return { correlation: null, isLowSample: false, sampleSize: 0 };
  }

  // Filter records for date t and date t-1 belonging strictly to target universe
  const recordsT = records.filter(
    (r) =>
      r.date === dateT &&
      getSignalId(r.signal) === signalId &&
      universeAssets.includes(r.assetId)
  );
  const recordsTMinus1 = records.filter(
    (r) =>
      r.date === dateTMinus1 &&
      getSignalId(r.signal) === signalId &&
      universeAssets.includes(r.assetId)
  );

  const ranksT = computeAverageRanks(recordsT);
  const ranksTMinus1 = computeAverageRanks(recordsTMinus1);

  const commonAssets = Array.from(ranksT.keys()).filter((assetId) => ranksTMinus1.has(assetId));
  const sampleSize = commonAssets.length;

  if (sampleSize < 5) {
    return { correlation: null, isLowSample: false, sampleSize };
  }

  const xs = commonAssets.map((assetId) => ranksTMinus1.get(assetId)!);
  const ys = commonAssets.map((assetId) => ranksT.get(assetId)!);
  const correlation = pearson(xs, ys);

  return {
    correlation,
    isLowSample: sampleSize >= 5 && sampleSize <= 9,
    sampleSize,
  };
}

export class SignalStabilityService {
  /**
   * Resolves the SignalStability state for a given asset, signalId, and date.
   */
  public async getStability(params: {
    assetId: string;
    signalId: string;
    date: string;
    universeId?: string;
    lookbackDays?: number;
    minConsecutiveObservations?: number;
    maxFlipCount?: number;
    minRankAutocorrelation?: number;
  }): Promise<SignalStability> {
    const records = await getSignalHistory();
    return this.calculateStabilityFromRecords(records, params);
  }

  /**
   * Calculates SignalStability from raw records.
   * This implementation calculates aligned cross-sectional ranks on the fly
   * so that rankAutocorrelation correctly matches aligned cross-sectional ranks.
   */
  public calculateStabilityFromRecords(
    records: SignalHistoryRecord<any>[],
    params: {
      assetId: string;
      signalId: string;
      date: string;
      universeId?: string;
      lookbackDays?: number;
      minConsecutiveObservations?: number;
      maxFlipCount?: number;
      minRankAutocorrelation?: number;
    }
  ): SignalStability {
    // Item 3: universeId is mandatory, no auto fallback
    if (!params.universeId) {
      return {
        assetId: params.assetId,
        signalId: params.signalId,
        date: params.date,
        consecutiveObservations: 0,
        flipCount30d: 0,
        rankAutocorrelation: null,
        status: "insufficient_data",
        actionableThresholdMet: false,
        warnings: ["universe_id_required"],
      };
    }

    const universeId = params.universeId;
    const universeAssets = getAssetsOfUniverse(universeId);
    if (!universeAssets) {
      return {
        assetId: params.assetId,
        signalId: params.signalId,
        universeId,
        date: params.date,
        consecutiveObservations: 0,
        flipCount30d: 0,
        rankAutocorrelation: null,
        status: "insufficient_data",
        actionableThresholdMet: false,
        warnings: ["unknown_universe_id"],
      };
    }

    // 1. Calculate the cross-sectional rank correlation for adjacent sessions t and t-1
    const { correlation: rankAutocorrelation, isLowSample } = calculateCrossSectionalRankCorrelation(
      records,
      params.signalId,
      params.date,
      universeId
    );

    // 2. Define getSignalLabel callback
    const getSignalLabel = (record: SignalHistoryRecord<any>): string | null => {
      if (!record.signal) return null;
      const label = record.signal.signalLabel || record.signal.signal || null;
      if (label === "insufficient_data") return null;
      return typeof label === "string" ? label : null;
    };

    // 3. Define getRankValue callback so that the domain logic knows rank analysis is active
    const getRankValue = (record: SignalHistoryRecord<any>): number | null => {
      if (!record.signal) return null;
      const score = record.signal.score;
      return typeof score === "number" && Number.isFinite(score) ? score : null;
    };

    // 4. Invoke canonical domain logic, passing the precalculated rankAutocorrelation
    const stability = calculateSignalStability({
      assetId: params.assetId,
      signalId: params.signalId,
      universeId,
      date: params.date,
      records,
      getSignalLabel,
      getRankValue,
      lookbackDays: params.lookbackDays,
      minConsecutiveObservations: params.minConsecutiveObservations,
      maxFlipCount: params.maxFlipCount,
      minRankAutocorrelation: params.minRankAutocorrelation,
      rankAutocorrelation,
    });

    // 4. Inject low sample size warning if computed with 5-9 assets
    if (isLowSample) {
      stability.warnings.push("rank_autocorrelation_low_sample");
    }

    return stability;
  }
}

export const signalStabilityService = new SignalStabilityService();
