import {
  IndividualSignalIcResult,
  SignalContributionAssessment,
} from "@/domain/audit/individual-signal-ic-result";
import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";
import { calculateTechnicalSignals } from "@/server/factors/technical-signal-engine";
import { calculateAtomicSignals } from "@/server/factors/atomic-signal-calculator";
import { assertNoLookAheadBias } from "@/domain/backtest/forward-return";
import { calculateSpearmanIC } from "@/server/backtest/backtest-ic-calculator";
import {
  KOSPI_SAMPLE_CONSTITUENTS,
  SP500_SAMPLE_CONSTITUENTS,
} from "@/domain/universe/market-universe";

/**
 * 개별 atomic signal의 예상 가중치 (Momentum v1 기준).
 * 신호가 universe에 없으면 null.
 */
const MOMENTUM_V1_WEIGHTS: Record<string, number | null> = {
  momentum_ichimoku: 0.15,
  momentum_darvas: 0.125,
  momentum_turtle: 0.125,
  momentum_weinstein: 0.125,
  momentum_ma_slope: 0.125,
  momentum_return: 0.15,
  momentum_volatility: 0.05,
  momentum_volume: 0.15,
  // return_20d / return_60d / volume_zscore_60 are sub-components mapped to
  // momentum_return / momentum_volume — show as null weight
  return_20d: null,
  return_60d: null,
  volume_zscore_60: null,
};

const HORIZON_DAYS: Record<"1w" | "1m" | "3m", number> = {
  "1w": 5,
  "1m": 20,
  "3m": 60,
};

const MIN_SAMPLE = 30;

function assessContribution(
  sampleSize: number,
  spearmanIc: number | null,
  icir: number | null,
  currentWeight: number | null
): { assessment: SignalContributionAssessment; warning: string | null } {
  if (sampleSize < MIN_SAMPLE) {
    return {
      assessment: "insufficient_sample",
      warning: `표본 수 부족 (n=${sampleSize}, 최소 ${MIN_SAMPLE} 필요)`,
    };
  }

  if (spearmanIc === null) {
    return {
      assessment: "insufficient_sample",
      warning: "IC 계산 불가",
    };
  }

  if (spearmanIc < 0) {
    return {
      assessment: "negative",
      warning: `IC 음수 (${spearmanIc.toFixed(4)}): 이 신호는 현재 방향성을 거스를 수 있습니다.`,
    };
  }

  if (icir !== null && icir < 0) {
    return {
      assessment: "negative",
      warning: `ICIR 음수 (${icir.toFixed(4)}): 신호가 불안정합니다.`,
    };
  }

  if (
    Math.abs(spearmanIc) < 0.01 &&
    currentWeight !== null &&
    currentWeight > 0.1
  ) {
    return {
      assessment: "neutral",
      warning: `IC 미미 (${spearmanIc.toFixed(4)})이나 가중치 높음 (${(currentWeight * 100).toFixed(0)}%): 재검토 필요`,
    };
  }

  if (spearmanIc >= 0.01) {
    return {
      assessment: "positive",
      warning: null,
    };
  }

  return {
    assessment: "neutral",
    warning: null,
  };
}

/**
 * 개별 atomic signal별 IC를 계산한다.
 * Momentum v1 composite IC만 보지 않고, 각 신호의 기여도를 개별 측정한다.
 *
 * 이 결과는 설명 목적이며, 주문 추천 또는 자동 전략 활성화와 연결되지 않는다.
 */
export async function auditIndividualSignalIc(params: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  horizons?: ("1w" | "1m" | "3m")[];
}): Promise<IndividualSignalIcResult[]> {
  const { universeId, horizons = ["1w", "1m", "3m"] } = params;

  const constituents =
    universeId === "KOSPI_SAMPLE"
      ? KOSPI_SAMPLE_CONSTITUENTS
      : SP500_SAMPLE_CONSTITUENTS;

  // Collect (signalId, horizon, date) → (score, forwardReturn) observations
  type Observation = { score: number; forwardReturn: number; date: string };
  const signalObs: Record<string, Record<string, Observation[]>> = {};
  // key: signalId, subkey: horizon

  for (const constituent of constituents) {
    const { assetId } = constituent;
    const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);
    if (!ohlcvEnv.value || ohlcvEnv.value.length < 30) continue;

    const bars = ohlcvEnv.value;
    const startIdx = Math.min(25, bars.length - 1);

    for (let i = startIdx; i < bars.length; i++) {
      const currentBar = bars[i];
      const signalDate = currentBar.date;
      if (i + 1 >= bars.length) continue;
      const entryBar = bars[i + 1];
      assertNoLookAheadBias({ signalDate, entryDate: entryBar.date });

      const techResult = calculateTechnicalSignals(bars, i);
      const atomicSigs = calculateAtomicSignals(
        techResult,
        ohlcvEnv.status,
        currentBar.close,
        currentBar.open
      );

      for (const sig of atomicSigs) {
        if (sig.score === null) continue;

        for (const h of horizons) {
          const exitIdx = i + 1 + HORIZON_DAYS[h];
          if (exitIdx >= bars.length) continue;
          const forwardReturn =
            (bars[exitIdx].close - entryBar.close) / entryBar.close;

          if (!signalObs[sig.factorId]) signalObs[sig.factorId] = {};
          if (!signalObs[sig.factorId][h]) signalObs[sig.factorId][h] = [];
          signalObs[sig.factorId][h].push({
            score: sig.score,
            forwardReturn,
            date: signalDate,
          });
        }
      }
    }
  }

  const results: IndividualSignalIcResult[] = [];

  for (const [signalId, horizonMap] of Object.entries(signalObs)) {
    for (const h of horizons) {
      const obs = horizonMap[h] ?? [];

      if (obs.length < MIN_SAMPLE) {
        results.push({
          signalId,
          universeId,
          horizon: h,
          sampleSize: obs.length,
          spearmanIc: null,
          icir: null,
          hitRate: null,
          currentWeightInMomentumV1: MOMENTUM_V1_WEIGHTS[signalId] ?? null,
          contributionAssessment: "insufficient_sample",
          warning: `표본 수 부족 (n=${obs.length})`,
        });
        continue;
      }

      // Group by date for daily cross-sectional IC
      const byDate: Record<string, { score: number; forwardReturn: number }[]> =
        {};
      for (const o of obs) {
        if (!byDate[o.date]) byDate[o.date] = [];
        byDate[o.date].push({ score: o.score, forwardReturn: o.forwardReturn });
      }

      const dailyIcs: number[] = [];
      for (const dateObs of Object.values(byDate)) {
        const result = calculateSpearmanIC(
          dateObs.map((o) => ({
            score: o.score,
            forwardReturn: o.forwardReturn,
          }))
        );
        if (result.ic !== null) dailyIcs.push(result.ic);
      }

      let spearmanIc: number | null = null;
      let icir: number | null = null;

      if (dailyIcs.length >= 2) {
        spearmanIc = dailyIcs.reduce((a, b) => a + b, 0) / dailyIcs.length;
        const variance =
          dailyIcs.reduce((s, ic) => s + (ic - spearmanIc!) ** 2, 0) /
          dailyIcs.length;
        const std = Math.sqrt(variance);
        icir = std > 0 ? spearmanIc / std : null;
        spearmanIc = Math.round(spearmanIc * 10000) / 10000;
        if (icir !== null) icir = Math.round(icir * 10000) / 10000;
      } else if (dailyIcs.length === 1) {
        spearmanIc = Math.round(dailyIcs[0] * 10000) / 10000;
      }

      // Hit rate
      let hits = 0;
      for (const o of obs) {
        if (
          (o.score > 0 && o.forwardReturn > 0) ||
          (o.score < 0 && o.forwardReturn < 0)
        ) {
          hits++;
        }
      }
      const hitRate = Math.round((hits / obs.length) * 10000) / 10000;

      const currentWeight = MOMENTUM_V1_WEIGHTS[signalId] ?? null;
      const { assessment, warning } = assessContribution(
        obs.length,
        spearmanIc,
        icir,
        currentWeight
      );

      results.push({
        signalId,
        universeId,
        horizon: h,
        sampleSize: obs.length,
        spearmanIc,
        icir,
        hitRate,
        currentWeightInMomentumV1: currentWeight,
        contributionAssessment: assessment,
        warning,
      });
    }
  }

  return results;
}
