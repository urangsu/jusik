import { FactorValue } from "@/domain/factors/factor-value";
import { AtomicSignal } from "@/domain/factors/atomic-signal";
import { SignalHorizon } from "@/domain/factors/factor-horizon";
import { DataStatus } from "@/domain/common/data-status";

export type MomentumFactorResult = {
  factorValue: FactorValue;
  byHorizon: Record<
    SignalHorizon,
    {
      score: number | null;
      participatingSignals: string[];
    }
  >;
  crossHorizonTension: {
    detected: boolean;
    description: string | null;
  };
  dataQualityScore: number;
};

// Configured weights for each atomic signal
const SIGNAL_WEIGHTS: Record<string, number> = {
  momentum_return: 0.20,
  momentum_ma_slope: 0.15,
  momentum_weinstein: 0.15,
  momentum_ichimoku: 0.15,
  momentum_turtle: 0.10,
  momentum_darvas: 0.10,
  momentum_volatility: 0.075,
  momentum_volume: 0.075,
};

export function calculateMomentumFactorV1(
  assetId: string,
  universeId: string,
  date: string,
  atomicSignals: AtomicSignal[],
  dataStatus: DataStatus
): MomentumFactorResult {
  const calculatedAt = new Date().toISOString();

  // Find non-null signals and compute overall score
  let weightedSum = 0;
  let weightSum = 0;
  let nonNullCount = 0;

  for (const sig of atomicSignals) {
    if (sig.score !== null) {
      const weight = SIGNAL_WEIGHTS[sig.factorId] ?? 0.0;
      weightedSum += sig.score * weight;
      weightSum += weight;
      nonNullCount++;
    }
  }

  const rawValue = weightSum > 0 ? Math.round(weightedSum / weightSum) : null;
  const dataQualityScore = atomicSignals.length > 0
    ? Math.round((nonNullCount / atomicSignals.length) * 100)
    : 0;

  // Calculate scores by horizon
  const horizons: SignalHorizon[] = ["short", "medium", "long"];
  const byHorizon = {} as Record<
    SignalHorizon,
    {
      score: number | null;
      participatingSignals: string[];
    }
  >;

  for (const h of horizons) {
    const hSigs = atomicSignals.filter((s) => s.horizon === h && s.score !== null);
    if (hSigs.length === 0) {
      byHorizon[h] = {
        score: null,
        participatingSignals: [],
      };
      continue;
    }

    // Average the scores within this horizon
    const sum = hSigs.reduce((a, b) => a + (b.score as number), 0);
    byHorizon[h] = {
      score: Math.round(sum / hSigs.length),
      participatingSignals: hSigs.map((s) => s.factorId),
    };
  }

  // Detect cross-horizon tension between short-term and long-term
  const shortScore = byHorizon["short"].score;
  const longScore = byHorizon["long"].score;
  let tensionDetected = false;
  let tensionDescription: string | null = null;

  if (shortScore !== null && longScore !== null) {
    // If they have opposite signs and significant magnitude
    const shortTrend = shortScore >= 30 ? "bullish" : shortScore <= -30 ? "bearish" : "neutral";
    const longTrend = longScore >= 30 ? "bullish" : longScore <= -30 ? "bearish" : "neutral";

    if (
      (shortTrend === "bullish" && longTrend === "bearish") ||
      (shortTrend === "bearish" && longTrend === "bullish")
    ) {
      tensionDetected = true;
      tensionDescription = `Cross-horizon tension detected: Short-term is ${shortTrend} (${shortScore}) while Long-term is ${longTrend} (${longScore}).`;
    }
  }

  const factorValue: FactorValue = {
    id: `${universeId}_${assetId}_momentum_${date}`.replace(/:/g, "_"),
    assetId,
    factorId: "momentum",
    fiscalPeriodEnd: null,
    dataAvailableAt: date,
    calculatedAt,
    rawValue,
    zScore: null,
    percentile: null,
    rank: null,
    universeId,
    sectorId: null,
    sourceIds: ["yfinance"],
    dataStatus,
    dataQualityScore,
    factorVersion: "v1",
    engineVersion: "1.0.0",
  };

  return {
    factorValue,
    byHorizon,
    crossHorizonTension: {
      detected: tensionDetected,
      description: tensionDescription,
    },
    dataQualityScore,
  };
}
