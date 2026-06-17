import { SignalReliabilityRecord, ReliabilityHorizon } from "@/domain/reliability/signal-reliability-record";
import { ReliabilityConfig } from "@/domain/reliability/reliability-config";
import { ReliabilityWarning } from "@/domain/reliability/reliability-warning";
import { ForwardReturnRecord } from "@/domain/backtest/forward-return";
import { shrinkHitRate, shrinkIc } from "./bayesian-shrinkage";
import { calculateReliabilityScore } from "./reliability-score";
import { calculateWeightMultiplier } from "./weight-multiplier";
import { calculateSpearmanIC, IcInputPair } from "../backtest/backtest-ic-calculator";

export function calculateReliabilityMetrics(params: {
  signalId: string;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  horizon: ReliabilityHorizon;
  forwardReturns: ForwardReturnRecord[];
  config: ReliabilityConfig;
}): SignalReliabilityRecord {
  const { signalId, universeId, horizon, forwardReturns, config } = params;

  // Filter records belonging to this signalId and horizon
  const signalRecords = forwardReturns.filter(
    (r) => r.signalId === signalId && r.horizon === horizon
  );

  const calculatedAt = new Date().toISOString();
  const engineVersion = "1.0.0";
  const id = `${universeId}_${signalId}_${horizon}`;

  // 1. Basic Counts
  const validRecords = signalRecords.filter(
    (r) => r.signalScore !== null && r.forwardReturn !== null
  );

  const sampleSize = validRecords.length;

  // If sample size is 0, return early with empty record
  if (sampleSize === 0) {
    return {
      id,
      signalId,
      universeId,
      horizon,
      sampleSize: 0,
      sampleStatus: "insufficient_sample",
      avgForwardReturn: null,
      avgExcessReturn: null,
      positiveRate: null,
      hitRate: null,
      spearmanIcMean: null,
      spearmanIcStd: null,
      icir: null,
      shrunkHitRate: null,
      shrunkIc: null,
      reliabilityScore: null,
      reliabilityLabel: "insufficient_sample",
      weightMultiplier: null,
      warnings: ["insufficient_sample", "not_for_investment_decision", "sample_universe_only", "missing_adjusted_price", "no_historical_universe_membership"],
      calculatedAt,
      engineVersion,
    };
  }

  // 2. Average returns & rates
  const forwardReturnsList = validRecords.map((r) => r.forwardReturn as number);
  const excessReturnsList = validRecords
    .map((r) => r.excessReturn)
    .filter((v): v is number => v !== null);

  const avgForwardReturn =
    forwardReturnsList.reduce((a, b) => a + b, 0) / sampleSize;

  const avgExcessReturn =
    excessReturnsList.length > 0
      ? excessReturnsList.reduce((a, b) => a + b, 0) / excessReturnsList.length
      : null;

  const positiveReturnsCount = forwardReturnsList.filter((r) => r > 0).length;
  const positiveRate = positiveReturnsCount / sampleSize;

  // 3. Hit Rate (direction agreement, excluding score=0)
  const eligibleHitRecords = validRecords.filter(
    (r) => r.signalScore !== null && r.signalScore !== 0
  );

  let hitRate: number | null = null;
  if (eligibleHitRecords.length >= config.minSampleForIc) {
    let hits = 0;
    for (const r of eligibleHitRecords) {
      const score = r.signalScore as number;
      const ret = r.excessReturn ?? r.forwardReturn; // prioritize excessReturn
      if (ret !== null) {
        if ((score > 0 && ret > 0) || (score < 0 && ret < 0)) {
          hits++;
        }
      }
    }
    hitRate = hits / eligibleHitRecords.length;
  }

  // 4. Spearman IC & ICIR (daily rolling cross-sectional)
  // Group records by signalDate
  const recordsByDate: Record<string, ForwardReturnRecord[]> = {};
  for (const r of validRecords) {
    if (!recordsByDate[r.signalDate]) {
      recordsByDate[r.signalDate] = [];
    }
    recordsByDate[r.signalDate].push(r);
  }

  const dailyIcs: number[] = [];
  for (const date of Object.keys(recordsByDate)) {
    const dateRecords = recordsByDate[date];
    const pairs: IcInputPair[] = dateRecords.map((r) => ({
      score: r.signalScore,
      forwardReturn: r.excessReturn ?? r.forwardReturn,
    }));

    // Calculate Spearman IC for this cross-section
    const result = calculateSpearmanIC(pairs);
    if (result.ic !== null) {
      dailyIcs.push(result.ic);
    }
  }

  let spearmanIcMean: number | null = null;
  let spearmanIcStd: number | null = null;
  let icir: number | null = null;

  if (dailyIcs.length >= 2) {
    spearmanIcMean = dailyIcs.reduce((a, b) => a + b, 0) / dailyIcs.length;
    const variance =
      dailyIcs.reduce((sum, ic) => sum + (ic - (spearmanIcMean as number)) ** 2, 0) /
      dailyIcs.length;
    spearmanIcStd = Math.sqrt(variance);
    icir = spearmanIcStd > 0 ? spearmanIcMean / spearmanIcStd : null;

    // Round metrics to 4 decimal places
    spearmanIcMean = Math.round(spearmanIcMean * 10000) / 10000;
    spearmanIcStd = Math.round(spearmanIcStd * 10000) / 10000;
    if (icir !== null) icir = Math.round(icir * 10000) / 10000;
  } else if (dailyIcs.length === 1) {
    spearmanIcMean = Math.round(dailyIcs[0] * 10000) / 10000;
  }

  // 5. Bayesian Shrinkage
  const shrunkHitRate = shrinkHitRate({
    observedHitRate: hitRate,
    sampleSize,
    priorHitRate: config.priorHitRate,
    priorStrength: config.priorStrength,
  });

  const shrunkIc = shrinkIc({
    observedIc: spearmanIcMean,
    sampleSize,
    priorIc: config.priorIc,
    priorStrength: config.priorStrength,
  });

  // 6. Reliability Score & Label
  const reliabilityScore = calculateReliabilityScore({
    sampleSize,
    spearmanIcMean,
    hitRate,
    avgExcessReturn,
    shrunkIc,
    shrunkHitRate,
    config,
  });

  let reliabilityLabel: "insufficient_sample" | "low" | "medium" | "high" = "insufficient_sample";
  if (reliabilityScore !== null) {
    if (reliabilityScore < 40) reliabilityLabel = "low";
    else if (reliabilityScore < 70) reliabilityLabel = "medium";
    else reliabilityLabel = "high";
  }

  // 7. Weight Multiplier
  const weightMultiplier = calculateWeightMultiplier({
    reliabilityScore,
    sampleSize,
    config,
  });

  // 8. Warnings & Status
  const warnings: ReliabilityWarning[] = [
    "not_for_investment_decision",
    "sample_universe_only",
    "missing_adjusted_price",
    "no_historical_universe_membership",
  ];

  if (sampleSize < config.minSampleForReliability) {
    warnings.push("insufficient_sample");
  }
  if (spearmanIcMean !== null) {
    if (spearmanIcMean < 0) {
      warnings.push("negative_ic");
    } else if (spearmanIcMean < 0.05) {
      warnings.push("low_ic");
    }
  }
  if (hitRate !== null && hitRate < 0.51) {
    warnings.push("low_hit_rate");
  }
  if (spearmanIcStd !== null && spearmanIcStd > 0.15) {
    warnings.push("unstable_ic");
  }

  const anyPersonalFallback = validRecords.some(
    (r) => r.sourceTier === "personal_fallback" || (r.warnings && r.warnings.includes("personal_fallback_used" as any))
  );
  if (anyPersonalFallback) {
    warnings.push("personal_fallback_used");
  }

  let sampleStatus: "insufficient_sample" | "usable" | "robust" = "insufficient_sample";
  if (sampleSize >= config.robustSampleThreshold) {
    sampleStatus = "robust";
  } else if (sampleSize >= config.minSampleForReliability) {
    sampleStatus = "usable";
  }

  return {
    id,
    signalId,
    universeId,
    horizon,
    sampleSize,
    sampleStatus,
    avgForwardReturn: Math.round(avgForwardReturn * 10000) / 10000,
    avgExcessReturn: avgExcessReturn !== null ? Math.round(avgExcessReturn * 10000) / 10000 : null,
    positiveRate: Math.round(positiveRate * 10000) / 10000,
    hitRate: hitRate !== null ? Math.round(hitRate * 10000) / 10000 : null,
    spearmanIcMean,
    spearmanIcStd,
    icir,
    shrunkHitRate: shrunkHitRate !== null ? Math.round(shrunkHitRate * 10000) / 10000 : null,
    shrunkIc: shrunkIc !== null ? Math.round(shrunkIc * 10000) / 10000 : null,
    reliabilityScore,
    reliabilityLabel,
    weightMultiplier,
    warnings,
    calculatedAt,
    engineVersion,
  };
}
