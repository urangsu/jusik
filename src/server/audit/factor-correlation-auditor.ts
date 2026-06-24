import {
  FactorCorrelationResult,
  FactorCorrelationMethod,
  FactorCorrelationSeverity,
  FactorCorrelationWarning,
} from "@/domain/audit/factor-correlation-result";
import { resolveSignalAuditCandidates } from "./signal-candidate-resolver";
import { loadSignalScoreSeries } from "./signal-score-series-loader";

const ENGINE_VERSION = "1.0.0";

/**
 * Pearson 상관계수를 계산한다.
 */
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

/**
 * 배열을 순위 배열로 변환한다 (1부터 시작, 동점은 평균 순위).
 */
function toRanks(values: number[]): number[] {
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

/**
 * 모든 available atomic signal 간의 상관관계를 감사한다.
 */
export async function auditAllFactorCorrelations(input: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  method?: FactorCorrelationMethod;
  startDate?: string;
  endDate?: string;
  minSampleSize?: number;
}): Promise<FactorCorrelationResult[]> {
  const universeId = input.universeId;
  const method = input.method ?? "spearman";
  const minSampleSize = input.minSampleSize ?? 30;
  const { startDate, endDate } = input;

  const calculatedAt = new Date().toISOString();
  const timestampStr = calculatedAt.replace(/[-:TZ.]/g, "").slice(0, 14);

  // 1. Resolve candidates
  const allCandidates = await resolveSignalAuditCandidates({ universeId });
  const activeCandidates = allCandidates
    .filter((c) => c.available)
    .sort((a, b) => a.signalId.localeCompare(b.signalId));

  const results: FactorCorrelationResult[] = [];

  // 2. Load score series for each active candidate
  const scoresByFactor = new Map<string, any[]>();
  for (const candidate of activeCandidates) {
    const scores = await loadSignalScoreSeries({
      universeId,
      signalId: candidate.signalId,
      startDate,
      endDate,
    });
    scoresByFactor.set(candidate.signalId, scores);
  }

  // 3. Make unique pairs (alphabetical order factorA < factorB)
  for (let i = 0; i < activeCandidates.length; i++) {
    for (let j = i + 1; j < activeCandidates.length; j++) {
      const factorA = activeCandidates[i].signalId;
      const factorB = activeCandidates[j].signalId;

      const scoresA = scoresByFactor.get(factorA) || [];
      const scoresB = scoresByFactor.get(factorB) || [];

      const resultId = `factor_correlation_${universeId}_${factorA}_${factorB}_${method}_${timestampStr}`;

      if (scoresA.length === 0 || scoresB.length === 0) {
        results.push({
          id: resultId,
          universeId,
          factorA,
          factorB,
          method,
          sampleSize: 0,
          dateCount: 0,
          assetCount: 0,
          correlation: null,
          absCorrelation: null,
          severity: "not_available",
          warnings: ["missing_factor_score", "sample_universe_only"],
          sourceTierSummary: "unknown",
          calculatedAt,
          engineVersion: ENGINE_VERSION,
        });
        continue;
      }

      // Map scores for Quick lookup by (date, assetId)
      const mapB = new Map<string, { score: number | null; sourceTier: string }>();
      for (const sc of scoresB) {
        if (sc.score !== null && Number.isFinite(sc.score)) {
          mapB.set(`${sc.date}_${sc.assetId}`, { score: sc.score, sourceTier: sc.sourceTier });
        }
      }

      const overlappingPairs: { date: string; assetId: string; scoreA: number; scoreB: number; tierA: string; tierB: string }[] = [];

      for (const scA of scoresA) {
        if (scA.score !== null && Number.isFinite(scA.score)) {
          const key = `${scA.date}_${scA.assetId}`;
          const valB = mapB.get(key);
          if (valB) {
            overlappingPairs.push({
              date: scA.date,
              assetId: scA.assetId,
              scoreA: scA.score,
              scoreB: valB.score!,
              tierA: scA.sourceTier,
              tierB: valB.sourceTier,
            });
          }
        }
      }

      const sampleSize = overlappingPairs.length;
      const uniqueDates = Array.from(new Set(overlappingPairs.map((p) => p.date)));
      const uniqueAssets = Array.from(new Set(overlappingPairs.map((p) => p.assetId)));

      const warnings: FactorCorrelationWarning[] = ["sample_universe_only"];
      let severity: FactorCorrelationSeverity = "ok";
      let correlation: number | null = null;
      let absCorrelation: number | null = null;

      // Source tier summary
      const uniqueTiers = Array.from(new Set(
        overlappingPairs.flatMap((p) => [p.tierA, p.tierB])
      ));

      let sourceTierSummary: FactorCorrelationResult["sourceTierSummary"] = "unknown";
      if (uniqueTiers.length === 1) {
        sourceTierSummary = uniqueTiers[0] as any;
      } else if (uniqueTiers.length > 1) {
        sourceTierSummary = "mixed";
        warnings.push("source_tier_mixed");
      }

      if (uniqueTiers.includes("personal_fallback")) {
        warnings.push("personal_fallback_used");
      }

      if (sampleSize < minSampleSize) {
        severity = "insufficient_sample";
        warnings.push("insufficient_sample");
        results.push({
          id: resultId,
          universeId,
          factorA,
          factorB,
          method,
          sampleSize,
          dateCount: uniqueDates.length,
          assetCount: uniqueAssets.length,
          correlation: null,
          absCorrelation: null,
          severity,
          warnings,
          sourceTierSummary,
          calculatedAt,
          engineVersion: ENGINE_VERSION,
        });
        continue;
      }

      const rawA = overlappingPairs.map((p) => p.scoreA);
      const rawB = overlappingPairs.map((p) => p.scoreB);

      let r: number | null = null;
      if (method === "spearman") {
        const ranksA = toRanks(rawA);
        const ranksB = toRanks(rawB);
        r = pearson(ranksA, ranksB);
      } else {
        r = pearson(rawA, rawB);
      }

      if (r !== null && Number.isFinite(r)) {
        correlation = Math.round(r * 10000) / 10000;
        absCorrelation = Math.abs(correlation);

        if (absCorrelation >= 0.75) {
          severity = "danger";
          warnings.push("very_high_correlation");
        } else if (absCorrelation >= 0.50) {
          severity = "warn";
          warnings.push("high_correlation");
        }
      }

      results.push({
        id: resultId,
        universeId,
        factorA,
        factorB,
        method,
        sampleSize,
        dateCount: uniqueDates.length,
        assetCount: uniqueAssets.length,
        correlation,
        absCorrelation,
        severity,
        warnings,
        sourceTierSummary,
        calculatedAt,
        engineVersion: ENGINE_VERSION,
      });
    }
  }

  return results;
}
