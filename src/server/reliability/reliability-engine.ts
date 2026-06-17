import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";
import { calculateTechnicalSignals } from "@/server/factors/technical-signal-engine";
import { calculateAtomicSignals } from "@/server/factors/atomic-signal-calculator";
import { calculateMomentumFactorV1 } from "@/server/factors/momentum-factor-v1";
import { ForwardReturnRecord, assertNoLookAheadBias } from "@/domain/backtest/forward-return";
import { ReliabilitySummary } from "@/domain/reliability/reliability-summary";
import { SignalReliabilityRecord, ReliabilityHorizon } from "@/domain/reliability/signal-reliability-record";
import { ReliabilityConfig, DEFAULT_RELIABILITY_CONFIG } from "@/domain/reliability/reliability-config";
import { ReliabilityWarning } from "@/domain/reliability/reliability-warning";
import { calculateReliabilityMetrics } from "./reliability-metric-calculator";
import { saveReliabilitySummary } from "./reliability-store";

const HORIZON_DAYS: Record<ReliabilityHorizon, number> = {
  "1w": 5,
  "1m": 20,
  "3m": 60,
};

export async function calculateSignalReliability(params: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  horizons?: ReliabilityHorizon[];
  config?: ReliabilityConfig;
}): Promise<ReliabilitySummary> {
  const { universeId, horizons = ["1w", "1m", "3m"] } = params;

  const constituents =
    universeId === "KOSPI_SAMPLE" ? KOSPI_SAMPLE_CONSTITUENTS : SP500_SAMPLE_CONSTITUENTS;

  const calculatedAt = new Date().toISOString();
  const engineVersion = "1.0.0";

  // Create full config
  const config: ReliabilityConfig = {
    ...DEFAULT_RELIABILITY_CONFIG,
    universeId,
    horizons,
    ...params.config,
  };

  // Phase 1: Generate historical signals & raw forward returns on-the-fly
  type RawObservation = {
    assetId: string;
    symbol: string;
    signalDate: string;
    entryDate: string;
    scores: Record<string, number | null>; // signalId -> score
    returns: Record<ReliabilityHorizon, number | null>; // horizon -> return
    dataStatus: any;
    sourceTier: any;
  };

  const observations: RawObservation[] = [];

  for (const constituent of constituents) {
    const { assetId, symbol } = constituent;
    const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);
    if (!ohlcvEnv.value || ohlcvEnv.value.length === 0) continue;

    const bars = ohlcvEnv.value;

    // We start at index 20 (or 25) so indicators like SMA(20) are fully warmed up
    // Lower indices can also be calculated, but values might be null, which engine handles.
    const startIdx = Math.min(25, bars.length - 1);

    for (let i = startIdx; i < bars.length; i++) {
      const currentBar = bars[i];
      const signalDate = currentBar.date;

      // Ensure we have a T+1 entry bar
      if (i + 1 >= bars.length) continue;
      const entryBar = bars[i + 1];
      const entryDate = entryBar.date;

      // Safe guard assertion
      assertNoLookAheadBias({ signalDate, entryDate });

      // Compute indicators & atomic signals
      const techResult = calculateTechnicalSignals(bars, i);
      const atomicSigs = calculateAtomicSignals(
        techResult,
        ohlcvEnv.status,
        currentBar.close,
        currentBar.open
      );

      // Compute aggregate Momentum Factor v1 as a 9th signal
      const momentumResult = calculateMomentumFactorV1(
        assetId,
        universeId,
        signalDate,
        atomicSigs,
        ohlcvEnv.status
      );

      const scores: Record<string, number | null> = {};
      for (const sig of atomicSigs) {
        scores[sig.factorId] = sig.score;
      }
      // momentum score (rawValue)
      scores["momentum"] = momentumResult.factorValue.rawValue;

      // Compute forward returns for each horizon
      const returns: Record<ReliabilityHorizon, number | null> = {
        "1w": null,
        "1m": null,
        "3m": null,
      };

      for (const h of horizons) {
        const exitIdx = i + 1 + HORIZON_DAYS[h];
        if (exitIdx < bars.length) {
          returns[h] = (bars[exitIdx].close - entryBar.close) / entryBar.close;
        }
      }

      observations.push({
        assetId,
        symbol,
        signalDate,
        entryDate,
        scores,
        returns,
        dataStatus: ohlcvEnv.status,
        sourceTier: ohlcvEnv.sourceTier,
      });
    }
  }

  // Phase 2: Compute benchmark returns daily cross-sectionally
  // benchmarkReturn for a (date, horizon) is the average return of all assets in that universe
  const benchmarkReturns: Record<string, Record<ReliabilityHorizon, number | null>> = {};

  for (const obs of observations) {
    const date = obs.signalDate;
    if (!benchmarkReturns[date]) {
      benchmarkReturns[date] = { "1w": null, "1m": null, "3m": null };
    }

    for (const h of horizons) {
      const ret = obs.returns[h];
      if (ret !== null) {
        if (benchmarkReturns[date][h] === null) {
          benchmarkReturns[date][h] = 0;
        }
        // We accumulate first, then divide by count.
        // Actually it's easier to compute counts and sums in a helper loop.
      }
    }
  }

  // Exact benchmark return computation
  const dateCounts: Record<string, Record<ReliabilityHorizon, number>> = {};
  const dateSums: Record<string, Record<ReliabilityHorizon, number>> = {};

  for (const obs of observations) {
    const date = obs.signalDate;
    if (!dateCounts[date]) {
      dateCounts[date] = { "1w": 0, "1m": 0, "3m": 0 };
      dateSums[date] = { "1w": 0, "1m": 0, "3m": 0 };
    }

    for (const h of horizons) {
      const ret = obs.returns[h];
      if (ret !== null) {
        dateCounts[date][h]++;
        dateSums[date][h] += ret;
      }
    }
  }

  for (const date of Object.keys(dateSums)) {
    for (const h of horizons) {
      const count = dateCounts[date][h];
      if (count > 0) {
        benchmarkReturns[date][h] = dateSums[date][h] / count;
      } else {
        benchmarkReturns[date][h] = null;
      }
    }
  }

  // Phase 3: Create complete ForwardReturnRecords list
  const forwardReturns: ForwardReturnRecord[] = [];

  for (const obs of observations) {
    const { assetId, symbol, signalDate, entryDate, scores, returns, dataStatus, sourceTier } = obs;

    for (const signalId of Object.keys(scores)) {
      const score = scores[signalId];

      for (const h of horizons) {
        const ret = returns[h];
        const benchRet = benchmarkReturns[signalDate][h];
        const excessReturn = (ret !== null && benchRet !== null) ? ret - benchRet : null;

        const id = `${assetId}_${signalId}_${h}_${signalDate}`.replace(/:/g, "_");

        forwardReturns.push({
          id,
          assetId,
          symbol,
          signalId,
          signalScore: score,
          signalDate,
          entryDate,
          horizon: h,
          forwardReturn: ret,
          benchmarkReturn: benchRet,
          excessReturn,
          adjustedForCosts: false,
          dataStatus,
          source: "yfinance",
          sourceTier,
          warnings: [],
          calculatedAt,
        });
      }
    }
  }

  // Phase 4: Group and calculate Reliability Record for each signal & horizon combination
  const signalIds = [
    "momentum_ichimoku",
    "momentum_darvas",
    "momentum_turtle",
    "momentum_weinstein",
    "momentum_ma_slope",
    "momentum_return",
    "momentum_volatility",
    "momentum_volume",
    "momentum", // Momentum Factor v1 overall
  ];

  const records: SignalReliabilityRecord[] = [];

  for (const signalId of signalIds) {
    for (const h of horizons) {
      const record = calculateReliabilityMetrics({
        signalId,
        universeId,
        horizon: h,
        forwardReturns,
        config,
      });
      records.push(record);
    }
  }

  // Phase 5: Compile summary report aggregates
  const totalSignals = records.length;
  const robustSignals = records.filter((r) => r.sampleStatus === "robust").length;
  const insufficientSampleSignals = records.filter((r) => r.sampleStatus === "insufficient_sample").length;
  const negativeIcSignals = records.filter((r) => r.spearmanIcMean !== null && r.spearmanIcMean < 0).length;
  const personalFallbackAffectedSignals = records.filter((r) => r.warnings.includes("personal_fallback_used")).length;

  const warnings: ReliabilityWarning[] = [
    "not_for_investment_decision",
    "sample_universe_only",
    "missing_adjusted_price",
    "no_historical_universe_membership",
  ];

  if (personalFallbackAffectedSignals > 0) {
    warnings.push("personal_fallback_used");
  }
  if (insufficientSampleSignals > 0) {
    warnings.push("insufficient_sample");
  }

  const summary: ReliabilitySummary = {
    universeId,
    calculatedAt,
    engineVersion,
    records,
    aggregate: {
      totalSignals,
      robustSignals,
      insufficientSampleSignals,
      negativeIcSignals,
      personalFallbackAffectedSignals,
    },
    warnings,
  };

  // Save to store
  await saveReliabilitySummary(summary);

  return summary;
}
