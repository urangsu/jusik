import {
  IndividualSignalIcResult,
  SignalAuditHorizon,
} from "@/domain/audit/individual-signal-ic-result";
import { SignalContributionAssessment } from "@/domain/audit/signal-contribution-assessment";
import { SignalAuditWarning } from "@/domain/audit/signal-audit-warning";
import { resolveSignalAuditCandidates } from "./signal-candidate-resolver";
import { loadSignalScoreSeries, SignalScorePoint } from "./signal-score-series-loader";
import { loadForwardReturnSeries, ForwardReturnPoint } from "./forward-return-series-loader";
import { calculateSpearmanIC } from "@/server/backtest/backtest-ic-calculator";

const ENGINE_VERSION = "1.0.0";

/**
 * 개별 atomic signal별 IC를 계산한다.
 *
 * 이 결과는 진단/설명 목적이며, 주문 추천 또는 자동 전략 활성화와 연결되지 않는다.
 */
export async function auditIndividualSignalIc(input: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  signalId?: string;
  horizon?: "1w" | "1m" | "3m";
  startDate?: string;
  endDate?: string;
}): Promise<IndividualSignalIcResult[]> {
  const { universeId, signalId, horizon, startDate, endDate } = input;

  // 1. Resolve candidates
  const allCandidates = await resolveSignalAuditCandidates({ universeId });
  const targetCandidates = allCandidates.filter((c) => {
    if (signalId && c.signalId !== signalId) return false;
    return c.available;
  });

  const horizons: SignalAuditHorizon[] = horizon ? [horizon] : ["1w", "1m", "3m"];
  const results: IndividualSignalIcResult[] = [];
  const timestampStr = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const calculatedAt = new Date().toISOString();

  for (const candidate of targetCandidates) {
    // 2. Load score series
    const scores = await loadSignalScoreSeries({
      universeId,
      signalId: candidate.signalId,
      startDate,
      endDate,
    });

    // Check if score series is empty
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
          spearmanIc: null,
          icir: null,
          hitRate: null,
          currentWeightInMomentumV1: candidate.currentWeightInMomentumV1,
          contributionAssessment: "not_available",
          warnings: ["missing_signal_score", "sample_universe_only"],
          sourceSignalCount: 1,
          calculatedAt,
          engineVersion: ENGINE_VERSION,
        });
      }
      continue;
    }

    // Extract unique dates and assets
    const dates = Array.from(new Set(scores.map((s) => s.date))).sort();
    const assetIds = Array.from(new Set(scores.map((s) => s.assetId)));

    for (const h of horizons) {
      // 3. Load forward return series
      const returns = await loadForwardReturnSeries({
        universeId,
        horizon: h,
        dates,
        assetIds,
      });

      // Map returns for quick lookup by (date, assetId)
      const returnMap = new Map<string, number | null>();
      const returnWarningsMap = new Map<string, string[]>();
      let hasMissingReturn = false;
      let hasPersonalFallbackPrice = false;

      for (const ret of returns) {
        const key = `${ret.date}_${ret.assetId}`;
        returnMap.set(key, ret.forwardReturn);
        returnWarningsMap.set(key, ret.warnings);
        if (ret.forwardReturn === null) {
          hasMissingReturn = true;
        }
        if (ret.warnings.includes("personal_fallback_used")) {
          hasPersonalFallbackPrice = true;
        }
      }

      // Group valid pairs by date
      const dailyPairs = new Map<string, { score: number; forwardReturn: number }[]>();
      const allValidPairs: { score: number; forwardReturn: number; date: string }[] = [];
      let hasPersonalFallbackScore = false;

      for (const sc of scores) {
        const key = `${sc.date}_${sc.assetId}`;
        const forwardReturn = returnMap.get(key);

        if (sc.warnings.includes("personal_fallback_used")) {
          hasPersonalFallbackScore = true;
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

      // Filter daily groups to those with at least 3 pairs
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

      const sampleSize = allValidPairs.length;
      const uniqueAssets = Array.from(new Set(allValidPairs.map((p) => p.date))); // Wait, asset count is unique assetIds!
      const uniqueAssetIdsObserved = Array.from(new Set(scores.filter((s) => s.score !== null).map((s) => s.assetId)));

      let spearmanIc: number | null = null;
      let icir: number | null = null;

      if (dailyIcs.length >= 2) {
        const sum = dailyIcs.reduce((a, b) => a + b, 0);
        spearmanIc = sum / dailyIcs.length;

        const variance = dailyIcs.reduce((s, ic) => s + (ic - spearmanIc!) ** 2, 0) / dailyIcs.length;
        const std = Math.sqrt(variance);
        icir = std > 0 ? spearmanIc / std : null;

        // Round to 4 decimal places
        spearmanIc = Math.round(spearmanIc * 10000) / 10000;
        if (icir !== null) {
          icir = Math.round(icir * 10000) / 10000;
        }
      } else if (dailyIcs.length === 1) {
        spearmanIc = Math.round(dailyIcs[0] * 10000) / 10000;
      }

      // 4. Hit Rate calculation: score > medianScore인 그룹의 forwardReturn > 0 비율
      let hitRate: number | null = null;
      let hitCount = 0;
      let totalAboveMedianCount = 0;

      // Group valid pairs by date again to find date-specific medians
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
        hitRate = Math.round((hitCount / totalAboveMedianCount) * 10000) / 10000;
      }

      // 5. Construct warnings and contribution assessment
      const warnings: SignalAuditWarning[] = ["sample_universe_only"];

      if (sampleSize < 30) {
        warnings.push("insufficient_sample");
      }
      if (calculatedDateCount < 3) {
        warnings.push("not_enough_time_series");
      }
      if (uniqueAssetIdsObserved.length < 3) {
        warnings.push("not_enough_cross_section");
      }
      if (spearmanIc !== null && spearmanIc < 0) {
        warnings.push("negative_contribution");
      }
      if (
        spearmanIc !== null &&
        Math.abs(spearmanIc) < 0.01 &&
        candidate.currentWeightInMomentumV1 !== null &&
        candidate.currentWeightInMomentumV1 >= 0.10
      ) {
        warnings.push("weak_signal_high_weight");
      }
      if (icir !== null && icir < 0) {
        warnings.push("unstable_signal");
      }
      if (hasMissingReturn) {
        warnings.push("missing_forward_return");
      }
      if (hasPersonalFallbackScore || hasPersonalFallbackPrice) {
        warnings.push("personal_fallback_used");
      }

      // Assess contribution
      let assessment: SignalContributionAssessment = "neutral";
      if (sampleSize < 30) {
        assessment = "insufficient_sample";
      } else if (spearmanIc !== null && spearmanIc < 0) {
        assessment = "negative";
      } else if (spearmanIc !== null && spearmanIc > 0.02 && sampleSize >= 30) {
        assessment = "positive";
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
        spearmanIc,
        icir,
        hitRate,
        currentWeightInMomentumV1: candidate.currentWeightInMomentumV1,
        contributionAssessment: assessment,
        warnings,
        sourceSignalCount: 1,
        calculatedAt,
        engineVersion: ENGINE_VERSION,
      });
    }
  }

  return results;
}
