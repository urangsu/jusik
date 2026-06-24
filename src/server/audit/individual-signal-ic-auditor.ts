import {
  IndividualSignalIcResult,
  IndividualSignalIcHorizon,
  IndividualSignalIcSeverity,
  IndividualSignalIcWarning,
} from "@/domain/audit/individual-signal-ic-result";
import { SignalContributionAssessment } from "@/domain/audit/signal-contribution-assessment";
import { resolveSignalAuditCandidates } from "./signal-candidate-resolver";
import { loadSignalScoreSeries } from "./signal-score-series-loader";
import { loadForwardReturnSeries } from "./forward-return-series-loader";
import { calculateSpearmanIC } from "@/server/backtest/backtest-ic-calculator";

const ENGINE_VERSION = "1.1.0";

function round4(num: number | null): number | null {
  if (num === null || !Number.isFinite(num)) return null;
  return Math.round(num * 10000) / 10000;
}

function getRanks(values: number[]): number[] {
  const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length - 1 && sorted[j + 1].v === sorted[j].v) {
      j++;
    }
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[sorted[k].i] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length === 0) return null;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const covariance = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const stdX = Math.sqrt(xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0));
  const stdY = Math.sqrt(ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0));
  if (stdX === 0 || stdY === 0) return null;
  return covariance / (stdX * stdY);
}

function mapHorizonToLegacy(horizon: IndividualSignalIcHorizon): "1w" | "1m" | "3m" {
  if (horizon === "forward_5d") return "1w";
  if (horizon === "forward_20d") return "1m";
  if (horizon === "forward_60d") return "3m";
  return "1w";
}

export async function auditIndividualSignalIc(input: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  signalId?: string;
  horizon?: "1w" | "1m" | "3m" | IndividualSignalIcHorizon;
  startDate?: string;
  endDate?: string;
}): Promise<IndividualSignalIcResult[]> {
  const { universeId, signalId, startDate, endDate } = input;
  const rawHorizon = input.horizon;

  let targetHorizon: IndividualSignalIcHorizon | undefined;
  if (rawHorizon === "1w") targetHorizon = "forward_5d";
  else if (rawHorizon === "1m") targetHorizon = "forward_20d";
  else if (rawHorizon === "3m") targetHorizon = "forward_60d";
  else if (rawHorizon) targetHorizon = rawHorizon as IndividualSignalIcHorizon;

  const horizons: IndividualSignalIcHorizon[] = targetHorizon
    ? [targetHorizon]
    : ["forward_5d", "forward_20d", "forward_60d"];

  const allCandidates = await resolveSignalAuditCandidates({ universeId });
  const targetCandidates = allCandidates.filter((c) => {
    if (signalId && c.signalId !== signalId) return false;
    return c.available;
  });

  const results: IndividualSignalIcResult[] = [];
  const timestampStr = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const calculatedAt = new Date().toISOString();

  for (const candidate of targetCandidates) {
    const scores = await loadSignalScoreSeries({
      universeId,
      signalId: candidate.signalId,
      startDate,
      endDate,
    });

    if (scores.length === 0) {
      for (const h of horizons) {
        const id = `individual_signal_ic_${universeId}_${candidate.signalId}_${h}_${timestampStr}`;
        results.push({
          id,
          signalId: candidate.signalId,
          signalLabelKo: candidate.signalLabelKo,
          universeId,
          horizon: h,
          sampleSize: 0,
          dateCount: 0,
          assetCount: 0,
          icPearson: null,
          icSpearman: null,
          spearmanIc: null,
          icir: null,
          hitRate: null,
          meanForwardReturnTopQuantile: null,
          meanForwardReturnBottomQuantile: null,
          topBottomSpread: null,
          currentWeightInMomentumV1: candidate.currentWeightInMomentumV1,
          severity: "not_available",
          contributionAssessment: "not_available",
          warnings: ["missing_signal_score", "sample_universe_only"],
          sourceSignalCount: 1,
          sourceTierSummary: "unknown",
          calculatedAt,
          engineVersion: ENGINE_VERSION,
        });
      }
      continue;
    }

    const dates = Array.from(new Set(scores.map((s) => s.date))).sort();
    const assetIds = Array.from(new Set(scores.map((s) => s.assetId)));

    for (const h of horizons) {
      const legacyH = mapHorizonToLegacy(h);
      const returns = await loadForwardReturnSeries({
        universeId,
        horizon: legacyH,
        dates,
        assetIds,
      });

      const returnMap = new Map<string, number | null>();
      const returnWarningsMap = new Map<string, string[]>();
      let hasMissingReturn = false;
      const sourceTiersObserved = new Set<string>();

      for (const ret of returns) {
        const key = `${ret.date}_${ret.assetId}`;
        returnMap.set(key, ret.forwardReturn);
        returnWarningsMap.set(key, ret.warnings);
        if (ret.forwardReturn === null) {
          hasMissingReturn = true;
        }
        if (ret.sourceTier) {
          sourceTiersObserved.add(ret.sourceTier);
        }
      }

      const dailyPairs = new Map<string, { score: number; forwardReturn: number }[]>();
      const allValidPairs: { score: number; forwardReturn: number; date: string }[] = [];
      let hasPersonalFallbackScore = false;
      let hasPersonalFallbackPrice = false;

      for (const sc of scores) {
        const key = `${sc.date}_${sc.assetId}`;
        const forwardReturn = returnMap.get(key);
        const retWarnings = returnWarningsMap.get(key) || [];

        if (sc.sourceTier) {
          sourceTiersObserved.add(sc.sourceTier);
        }

        if (sc.warnings.includes("personal_fallback_used")) {
          hasPersonalFallbackScore = true;
        }
        if (retWarnings.includes("personal_fallback_used")) {
          hasPersonalFallbackPrice = true;
        }

        if (
          sc.score !== null &&
          forwardReturn !== undefined &&
          forwardReturn !== null &&
          Number.isFinite(sc.score) &&
          Number.isFinite(forwardReturn)
        ) {
          const pair = { score: sc.score, forwardReturn };
          allValidPairs.push({ ...pair, date: sc.date });

          if (!dailyPairs.has(sc.date)) {
            dailyPairs.set(sc.date, []);
          }
          dailyPairs.get(sc.date)!.push(pair);
        }
      }

      const sampleSize = allValidPairs.length;
      const uniqueAssetIdsObserved = Array.from(new Set(scores.filter((s) => s.score !== null).map((s) => s.assetId)));

      let icPearson: number | null = null;
      let icSpearman: number | null = null;
      let meanForwardReturnTopQuantile: number | null = null;
      let meanForwardReturnBottomQuantile: number | null = null;
      let topBottomSpread: number | null = null;

      if (sampleSize >= 5) {
        const matchedScores = allValidPairs.map((p) => p.score);
        const matchedReturns = allValidPairs.map((p) => p.forwardReturn);
        icPearson = pearson(matchedScores, matchedReturns);
        icSpearman = pearson(getRanks(matchedScores), getRanks(matchedReturns));

        const sortedByScore = [...allValidPairs].sort((a, b) => a.score - b.score);
        const k = Math.max(1, Math.floor(sortedByScore.length * 0.2));
        const bottomGroup = sortedByScore.slice(0, k);
        const topGroup = sortedByScore.slice(sortedByScore.length - k);

        meanForwardReturnTopQuantile = topGroup.reduce((a, b) => a + b.forwardReturn, 0) / topGroup.length;
        meanForwardReturnBottomQuantile = bottomGroup.reduce((a, b) => a + b.forwardReturn, 0) / bottomGroup.length;
        topBottomSpread = meanForwardReturnTopQuantile - meanForwardReturnBottomQuantile;
      }

      // Daily IC & IR calculations for backward compatibility
      const dailyIcs: number[] = [];
      let calculatedDateCount = 0;
      for (const [date, pairs] of dailyPairs.entries()) {
        if (pairs.length >= 3) {
          const icResult = calculateSpearmanIC(pairs);
          if (icResult.ic !== null && Number.isFinite(icResult.ic)) {
            dailyIcs.push(icResult.ic);
            calculatedDateCount++;
          }
        }
      }

      let oldSpearmanIc: number | null = null;
      let icir: number | null = null;
      if (dailyIcs.length >= 2) {
        const sum = dailyIcs.reduce((a, b) => a + b, 0);
        oldSpearmanIc = sum / dailyIcs.length;
        const variance = dailyIcs.reduce((s, ic) => s + (ic - oldSpearmanIc!) ** 2, 0) / dailyIcs.length;
        const std = Math.sqrt(variance);
        icir = std > 0 ? oldSpearmanIc / std : null;
      } else if (dailyIcs.length === 1) {
        oldSpearmanIc = dailyIcs[0];
      }

      let hitRate: number | null = null;
      let hitCount = 0;
      let totalAboveMedianCount = 0;
      const validPairsByDate = new Map<string, { score: number; forwardReturn: number }[]>();
      for (const p of allValidPairs) {
        if (!validPairsByDate.has(p.date)) {
          validPairsByDate.set(p.date, []);
        }
        validPairsByDate.get(p.date)!.push(p);
      }
      for (const [date, pairs] of validPairsByDate.entries()) {
        const sortedScores = pairs.map((p) => p.score).sort((a, b) => a - b);
        if (sortedScores.length === 0) continue;
        let medianScore = 0;
        const mid = Math.floor(sortedScores.length / 2);
        if (sortedScores.length % 2 === 0) {
          medianScore = (sortedScores[mid - 1] + sortedScores[mid]) / 2;
        } else {
          medianScore = sortedScores[mid];
        }
        for (const p of pairs) {
          if (p.score > medianScore) {
            totalAboveMedianCount++;
            if (p.forwardReturn > 0) {
              hitCount++;
            }
          }
        }
      }
      if (totalAboveMedianCount > 0) {
        hitRate = hitCount / totalAboveMedianCount;
      }

      const finalSpearman = icSpearman !== null ? icSpearman : oldSpearmanIc;

      const warnings: IndividualSignalIcWarning[] = ["sample_universe_only"];
      if (sampleSize < 30) {
        warnings.push("insufficient_sample");
      }
      if (finalSpearman !== null && finalSpearman < 0) {
        warnings.push("negative_ic");
        warnings.push("negative_contribution");
      }
      if (finalSpearman !== null && Math.abs(finalSpearman) < 0.03) {
        warnings.push("near_zero_ic");
      }
      if (
        finalSpearman !== null &&
        Math.abs(finalSpearman) < 0.03 &&
        candidate.currentWeightInMomentumV1 !== null &&
        candidate.currentWeightInMomentumV1 >= 0.10
      ) {
        warnings.push("weak_signal_high_weight");
      }
      if (hasMissingReturn) {
        warnings.push("missing_forward_return");
      }
      if (hasPersonalFallbackScore || hasPersonalFallbackPrice) {
        warnings.push("personal_fallback_used");
      }
      if (sourceTiersObserved.size > 1) {
        warnings.push("source_tier_mixed");
      }

      let severity: IndividualSignalIcSeverity = "neutral";
      if (sampleSize < 30) {
        severity = "insufficient_sample";
      } else if (finalSpearman === null) {
        severity = "not_available";
      } else if (finalSpearman >= 0.08) {
        severity = "strong_positive";
      } else if (finalSpearman >= 0.03) {
        severity = "weak_positive";
      } else if (finalSpearman <= -0.08) {
        severity = "strong_negative";
      } else if (finalSpearman <= -0.03) {
        severity = "weak_negative";
      }

      let sourceTierSummary: IndividualSignalIcResult["sourceTierSummary"] = "unknown";
      if (sourceTiersObserved.size > 1) {
        sourceTierSummary = "mixed";
      } else if (sourceTiersObserved.size === 1) {
        sourceTierSummary = Array.from(sourceTiersObserved)[0] as any;
      }

      let contributionAssessment: SignalContributionAssessment = "neutral";
      if (severity === "strong_positive" || severity === "weak_positive") {
        contributionAssessment = "positive";
      } else if (severity === "strong_negative" || severity === "weak_negative") {
        contributionAssessment = "negative";
      } else if (severity === "insufficient_sample") {
        contributionAssessment = "insufficient_sample";
      } else if (severity === "not_available") {
        contributionAssessment = "not_available";
      }

      const id = `individual_signal_ic_${universeId}_${candidate.signalId}_${h}_${timestampStr}`;

      results.push({
        id,
        signalId: candidate.signalId,
        signalLabelKo: candidate.signalLabelKo,
        universeId,
        horizon: h,
        sampleSize,
        dateCount: calculatedDateCount,
        assetCount: uniqueAssetIdsObserved.length,
        icPearson: round4(icPearson),
        icSpearman: round4(icSpearman),
        spearmanIc: oldSpearmanIc !== null ? round4(oldSpearmanIc) : round4(icSpearman), // keep for fallback
        icir: round4(icir),
        hitRate: round4(hitRate),
        meanForwardReturnTopQuantile: round4(meanForwardReturnTopQuantile),
        meanForwardReturnBottomQuantile: round4(meanForwardReturnBottomQuantile),
        topBottomSpread: round4(topBottomSpread),
        currentWeightInMomentumV1: candidate.currentWeightInMomentumV1,
        severity,
        contributionAssessment,
        warnings,
        sourceSignalCount: 1,
        sourceTierSummary,
        calculatedAt,
        engineVersion: ENGINE_VERSION,
      });
    }
  }

  // Cross-horizon instability post-processing
  for (const candidate of targetCandidates) {
    const candidateResults = results.filter((r) => r.signalId === candidate.signalId);
    const validIcs = candidateResults
      .map((r) => r.icSpearman)
      .filter((ic): ic is number => ic !== null);

    const hasPositive = validIcs.some((ic) => ic >= 0.03);
    const hasNegative = validIcs.some((ic) => ic <= -0.03);

    if (hasPositive && hasNegative) {
      for (const r of candidateResults) {
        if (!r.warnings.includes("unstable_across_horizons")) {
          r.warnings.push("unstable_across_horizons");
        }
      }
    }
  }

  return results;
}
