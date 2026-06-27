import { saveOutcomeRecord, getOutcomeRecord } from "./signal-outcome-journal-store";
import type { SignalOutcomeJournalRecord, OutcomeSubjectType, OutcomeHorizon } from "@/domain/outcome/signal-outcome-journal";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";

const HORIZON_DAYS: Record<OutcomeHorizon, number> = {
  forward_5d: 5,
  forward_20d: 20,
  forward_60d: 60,
};

const HORIZON_BENCHMARK_RETURNS: Record<OutcomeHorizon, number> = {
  forward_5d: 0.005,  // 0.5%
  forward_20d: 0.02,   // 2.0%
  forward_60d: 0.06,   // 6.0%
};

export async function createPendingOutcomeRecord(input: {
  subjectType: OutcomeSubjectType;
  subjectId: string;
  assetId?: string | null;
  signalId?: string | null;
  horizon: OutcomeHorizon;
  evidencePackIds?: string[];
}): Promise<SignalOutcomeJournalRecord> {
  const { subjectType, subjectId, assetId = null, signalId = null, horizon, evidencePackIds = [] } = input;
  const nowStr = new Date().toISOString();

  const record: SignalOutcomeJournalRecord = {
    id: `out_${subjectId}_${horizon}_${Date.now()}`,
    subjectType,
    subjectId,
    assetId,
    signalId,
    strategyId: null,
    horizon,
    observedForwardReturn: null,
    benchmarkReturn: null,
    alphaReturn: null,
    initialWarnings: [],
    finalWarnings: [],
    outcomeStatus: "pending",
    lesson: null,
    confidenceAdjustment: "not_applicable",
    evidencePackIds,
    benchmarkSourceRef: null,
    createdAt: nowStr,
    observedAt: null,
  };

  await saveOutcomeRecord(record);
  return record;
}

export async function observeOutcome(recordId: string): Promise<SignalOutcomeJournalRecord> {
  const record = await getOutcomeRecord(recordId);
  if (!record) {
    throw new Error(`Outcome record not found: ${recordId}`);
  }

  // If already observed, do not overwrite
  if (record.outcomeStatus === "observed") {
    return record;
  }

  const nowStr = new Date().toISOString();

  // Try to load OHLCV history for return observation
  const isKr = record.assetId?.includes(".KS") || 
               (record.assetId && /^\d+$/.test(record.assetId)) ||
               (record.assetId && record.assetId.startsWith("KR_"));
  const universeId = isKr ? "KOSPI_SAMPLE" : "SP500_SAMPLE";
  const benchmarkAssetId = isKr ? "KR_INDEX_KOSPI" : "US_SPY";
  const benchmarkSourceRef = `ohlcv_${universeId}_${benchmarkAssetId}`;

  const assetId = record.assetId || "AAPL";
  const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);

  if (!ohlcvEnv.value || ohlcvEnv.value.length < 2) {
    record.outcomeStatus = "insufficient_data";
    record.lesson = "Insufficient OHLCV history to observe forward outcome.";
    record.observedAt = nowStr;
    await saveOutcomeRecord(record);
    return record;
  }

  const bars = ohlcvEnv.value;
  const days = HORIZON_DAYS[record.horizon];

  if (bars.length <= days) {
    record.outcomeStatus = "insufficient_data";
    record.lesson = `Not enough bars to observe a ${days}-day horizon (bars: ${bars.length}).`;
    record.observedAt = nowStr;
    await saveOutcomeRecord(record);
    return record;
  }

  const baseBar = bars[bars.length - days - 1];
  const targetBar = bars[bars.length - 1];

  const basePrice = baseBar.close;
  const targetPrice = targetBar.close;

  if (basePrice <= 0) {
    record.outcomeStatus = "error";
    record.lesson = "Invalid base price (zero or negative).";
    record.observedAt = nowStr;
    await saveOutcomeRecord(record);
    return record;
  }

  const observedForwardReturn = (targetPrice - basePrice) / basePrice;

  // Calculate benchmark return
  let benchmarkReturn: number | null = null;
  let alphaReturn: number | null = null;
  const finalWarnings = [...record.finalWarnings];

  try {
    const benchmarkEnv = await loadOhlcvHistory(universeId, benchmarkAssetId);
    if (benchmarkEnv.value && benchmarkEnv.value.length > days) {
      const baseBenchBar = benchmarkEnv.value[benchmarkEnv.value.length - days - 1];
      const targetBenchBar = benchmarkEnv.value[benchmarkEnv.value.length - 1];
      if (baseBenchBar.close > 0) {
        benchmarkReturn = (targetBenchBar.close - baseBenchBar.close) / baseBenchBar.close;
      }
    }
  } catch {
    // benchmark loading failed
  }

  if (benchmarkReturn !== null) {
    alphaReturn = observedForwardReturn - benchmarkReturn;
  } else {
    if (!finalWarnings.includes("benchmark_data_missing")) {
      finalWarnings.push("benchmark_data_missing");
    }
  }

  let confidenceAdjustment: SignalOutcomeJournalRecord["confidenceAdjustment"] = "unchanged";
  let lesson = `Observed return over ${days} days: ${(observedForwardReturn * 100).toFixed(2)}%.`;
  
  if (benchmarkReturn !== null && alphaReturn !== null) {
    lesson += ` Benchmark (${benchmarkAssetId}): ${(benchmarkReturn * 100).toFixed(2)}%. Alpha: ${(alphaReturn * 100).toFixed(2)}%.`;
    if (alphaReturn > 0.02) {
      confidenceAdjustment = "increase";
      lesson += " Outperformed benchmark. Increasing confidence.";
    } else if (alphaReturn < -0.02) {
      confidenceAdjustment = "decrease";
      lesson += " Underperformed benchmark. Decreasing confidence.";
    }
  } else {
    lesson += " Benchmark data missing. Alpha return could not be computed.";
    confidenceAdjustment = "not_applicable";
  }

  record.observedForwardReturn = observedForwardReturn;
  record.benchmarkReturn = benchmarkReturn;
  record.alphaReturn = alphaReturn;
  record.benchmarkSourceRef = benchmarkSourceRef;
  record.finalWarnings = finalWarnings;
  record.outcomeStatus = "observed";
  record.lesson = lesson;
  record.confidenceAdjustment = confidenceAdjustment;
  record.observedAt = nowStr;

  await saveOutcomeRecord(record);
  return record;
}
