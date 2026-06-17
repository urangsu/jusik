import { ReliabilityAdjustedMomentumPreview, SignalLabel } from "@/domain/reliability/reliability-adjusted-momentum";
import { getCurrentSignals } from "@/server/signals/signal-history-store";
import { getLatestReliabilitySummary } from "./reliability-store";
import { ReliabilityWarning } from "@/domain/reliability/reliability-warning";

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

function getLabel(score: number | null): SignalLabel {
  if (score === null || score === undefined) return "insufficient_data";
  if (score >= 30) return "bullish";
  if (score <= -30) return "bearish";
  return "neutral";
}

export async function calculateReliabilityAdjustedMomentumPreview(params: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  assetId: string;
}): Promise<ReliabilityAdjustedMomentumPreview | null> {
  const { universeId, assetId } = params;

  // 1. Get current signals snapshot
  const currentSignals = await getCurrentSignals();
  if (!currentSignals || !currentSignals[assetId]) {
    return null;
  }

  const assetSnapshot = currentSignals[assetId];
  const atomicSignals = assetSnapshot.atomicSignals || [];
  const baseMomentumScore = assetSnapshot.momentum?.factorValue?.rawValue ?? null;

  // 2. Load latest reliability summary
  const summary = await getLatestReliabilitySummary(universeId);

  const appliedMultipliers: ReliabilityAdjustedMomentumPreview["appliedMultipliers"] = [];
  const warnings: ReliabilityWarning[] = [
    "not_for_investment_decision",
    "sample_universe_only",
    "missing_adjusted_price",
    "no_historical_universe_membership",
  ];

  let weightedSum = 0;
  let weightSum = 0;

  for (const sigId of Object.keys(SIGNAL_WEIGHTS)) {
    const baseWeight = SIGNAL_WEIGHTS[sigId];
    
    // Find matching signal in snapshot to get its score
    const matchingSig = atomicSignals.find((s: any) => s.factorId === sigId);
    const score = matchingSig ? matchingSig.score : null;

    // Find reliability record for this signal on "1m" horizon
    const relRecord = summary?.records.find(
      (r) => r.signalId === sigId && r.horizon === "1m"
    );

    const multiplier = relRecord ? relRecord.weightMultiplier : null;
    const effectiveWeight = multiplier !== null ? baseWeight * multiplier : baseWeight;

    appliedMultipliers.push({
      signalId: sigId,
      baseWeight,
      reliabilityWeightMultiplier: multiplier,
      effectiveWeight: multiplier !== null ? effectiveWeight : null,
      reason: relRecord ? relRecord.sampleStatus : "insufficient_sample",
    });

    if (score !== null && score !== undefined) {
      weightedSum += score * effectiveWeight;
      weightSum += effectiveWeight;
    }
  }

  const adjustedScore = weightSum > 0 ? Math.round(weightedSum / weightSum) : null;

  // Propagate warning if personal fallback was used
  const hasPersonalFallback = atomicSignals.some(
    (s: any) => s.dataStatus === "personal_fallback" || s.source === "yfinance"
  );
  if (hasPersonalFallback) {
    warnings.push("personal_fallback_used");
  }

  if (summary && summary.warnings.includes("insufficient_sample")) {
    warnings.push("insufficient_sample");
  }

  return {
    assetId,
    universeId,
    baseMomentumScore,
    reliabilityAdjustedScore: adjustedScore,
    baseLabel: getLabel(baseMomentumScore),
    reliabilityAdjustedLabel: getLabel(adjustedScore),
    appliedMultipliers,
    warnings,
    calculatedAt: new Date().toISOString(),
  };
}
