import { saveOutcomeRecord, getOutcomeRecord } from "./signal-outcome-journal-store";
import type {
  SignalOutcomeJournalRecord,
  OutcomeSubjectType,
  OutcomeHorizon,
  BenchmarkMapping,
} from "@/domain/outcome/signal-outcome-journal";
import { loadVersionedOhlcvHistory } from "../factors/ohlcv-history-loader";
import { getBenchmarkMapping } from "./benchmark-mapping-store";

const HORIZON_BARS: Record<OutcomeHorizon, number> = {
  forward_5d: 5,
  forward_20d: 20,
  forward_60d: 60,
};

type PriceBar = { date: string; close: number; assetId?: string };

const CANONICAL_ASSET_ID_RE = /^(KR_\d+|US_[A-Z][A-Z0-9.]*)$/;

export function findBaseIndex(bars: PriceBar[], observationStartedAt: string): number {
  const startDate = observationStartedAt.slice(0, 10);
  return bars.findIndex((b) => b.date >= startDate);
}

export function findTargetBar(
  bars: PriceBar[],
  baseIndex: number,
  horizonBars: number
): PriceBar | null {
  return bars[baseIndex + horizonBars] ?? null;
}

function sortAndValidateBars(bars: PriceBar[]): PriceBar[] | null {
  const sorted = [...bars].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (!isFinite(b.close) || b.close <= 0) return null;
    if (i > 0 && sorted[i - 1].date === b.date) return null;
  }
  return sorted;
}

function nextRevisionId(pending: SignalOutcomeJournalRecord): string {
  return `${pending.rootOutcomeId}_r${pending.revision + 1}`;
}

export async function createPendingOutcomeRecord(input: {
  subjectType: OutcomeSubjectType;
  subjectId: string;
  assetId: string;
  universeId: string;
  observationStartedAt: string;
  signalId?: string | null;
  strategyId?: string | null;
  horizon: OutcomeHorizon;
  evidencePackIds?: string[];
}): Promise<SignalOutcomeJournalRecord> {
  const {
    subjectType,
    subjectId,
    assetId,
    universeId,
    observationStartedAt,
    signalId = null,
    strategyId = null,
    horizon,
    evidencePackIds = [],
  } = input;

  const nowStr = new Date().toISOString();
  const id = `out_${subjectId}_${horizon}_${Date.now()}`;

  const record: SignalOutcomeJournalRecord = {
    id,
    rootOutcomeId: id,
    supersedesOutcomeId: null,
    revision: 0,
    subjectType,
    subjectId,
    assetId,
    universeId,
    signalId,
    strategyId,
    observationStartedAt,
    basePriceDataVersionId: null,
    horizon,
    baseTradeDate: null,
    targetTradeDate: null,
    observedForwardReturn: null,
    marketBenchmarkAssetId: null,
    marketBenchmarkReturn: null,
    marketExcessReturn: null,
    marketBenchmarkDataVersionId: null,
    sectorBenchmarkAssetId: null,
    sectorBenchmarkReturn: null,
    sectorExcessReturn: null,
    sectorBenchmarkDataVersionId: null,
    initialWarnings: [],
    finalWarnings: [],
    outcomeStatus: "pending",
    lesson: null,
    confidenceAdjustment: "not_applicable",
    evidencePackIds,
    createdAt: nowStr,
    observedAt: null,
  };

  await saveOutcomeRecord(record);
  return record;
}

export async function observeOutcome(recordId: string): Promise<SignalOutcomeJournalRecord> {
  const pending = await getOutcomeRecord(recordId);
  if (!pending) {
    throw new Error(`Outcome record not found: ${recordId}`);
  }

  if (pending.outcomeStatus !== "pending") {
    return pending;
  }

  const nowStr = new Date().toISOString();

  const pRecord = pending;

  // Helper to create a terminal revision
  async function terminalRevision(
    status: "insufficient_data" | "error",
    fields: Partial<SignalOutcomeJournalRecord>
  ): Promise<SignalOutcomeJournalRecord> {
    const revision: SignalOutcomeJournalRecord = {
      ...pRecord,
      id: nextRevisionId(pRecord),
      supersedesOutcomeId: pRecord.id,
      revision: pRecord.revision + 1,
      outcomeStatus: status,
      observedAt: nowStr,
      ...fields,
    } as SignalOutcomeJournalRecord;
    await saveOutcomeRecord(revision);
    return revision;
  }

  // Validate pending record fields
  if (!pending.assetId || !CANONICAL_ASSET_ID_RE.test(pending.assetId)) {
    return terminalRevision("insufficient_data", {
      lesson: `Invalid or missing assetId format: "${pending.assetId}".`,
      finalWarnings: [...pending.finalWarnings, "invalid_asset_id"],
    });
  }

  if (!pending.universeId) {
    return terminalRevision("insufficient_data", {
      lesson: "universeId is required.",
      finalWarnings: [...pending.finalWarnings, "missing_universe_id"],
    });
  }

  const isKrAsset = pending.assetId.startsWith("KR_");
  const isUsAsset = pending.assetId.startsWith("US_");
  const isKrUniverse = pending.universeId === "KOSPI_SAMPLE" || pending.universeId === "KOSPI";
  const isUsUniverse = pending.universeId === "SP500_SAMPLE" || pending.universeId === "SP500";
  if ((isKrAsset && !isKrUniverse) || (isUsAsset && !isUsUniverse)) {
    return terminalRevision("insufficient_data", {
      lesson: `Universe ID "${pending.universeId}" is not compatible with asset region for "${pending.assetId}".`,
      finalWarnings: [...pending.finalWarnings, "universe_mismatch"],
    });
  }

  if (!pending.observationStartedAt || !/^\d{4}-\d{2}-\d{2}/.test(pending.observationStartedAt)) {
    return terminalRevision("insufficient_data", {
      lesson: `Invalid or missing observationStartedAt: "${pending.observationStartedAt}".`,
      finalWarnings: [...pending.finalWarnings, "invalid_observation_started_at"],
    });
  }

  if (!HORIZON_BARS[pending.horizon]) {
    return terminalRevision("error", {
      lesson: `Invalid outcome horizon: "${pending.horizon}".`,
      finalWarnings: [...pending.finalWarnings, "invalid_horizon"],
    });
  }

  // Load benchmarks dynamically via dynamic store
  const mapping = await getBenchmarkMapping(pending.universeId);
  const marketBenchmarkAssetId = mapping?.marketBenchmarkAssetId ?? null;
  const sectorBenchmarkAssetId = mapping?.sectorBenchmarkAssetId ?? null;

  // Use loadVersionedOhlcvHistory for point-in-time constraints
  const ohlcvEnv = await loadVersionedOhlcvHistory({
    assetId: pending.assetId,
    universeId: pending.universeId as any,
    asOfDate: nowStr.slice(0, 10),
    knownAt: nowStr,
  }).catch(() => null);

  if (!ohlcvEnv || ohlcvEnv.status === "insufficient_data" || !ohlcvEnv.value || ohlcvEnv.value.length === 0) {
    return terminalRevision("insufficient_data", {
      marketBenchmarkAssetId,
      sectorBenchmarkAssetId,
      lesson: "No versioned OHLCV history available for observation.",
      finalWarnings: [...pending.finalWarnings, "no_ohlcv_data"],
    });
  }

  if (ohlcvEnv.status === "error") {
    return terminalRevision("error", {
      marketBenchmarkAssetId,
      sectorBenchmarkAssetId,
      lesson: ohlcvEnv.message || "Failed to load versioned OHLCV.",
      finalWarnings: [...pending.finalWarnings, "ohlcv_load_failed"],
    });
  }

  const dataVersionId = ohlcvEnv.dataVersionId;
  if (!dataVersionId) {
    return terminalRevision("insufficient_data", {
      marketBenchmarkAssetId,
      sectorBenchmarkAssetId,
      lesson: "OHLCV file lacks dataVersionId metadata.",
      finalWarnings: [...pending.finalWarnings, "missing_ohlcv_data_version"],
    });
  }

  const rawBars = ohlcvEnv.value as PriceBar[];
  const bars = sortAndValidateBars(rawBars);
  if (!bars) {
    return terminalRevision("error", {
      marketBenchmarkAssetId,
      sectorBenchmarkAssetId,
      lesson: "OHLCV bars contain duplicate dates or non-finite prices.",
      finalWarnings: [...pending.finalWarnings, "invalid_ohlcv_bars"],
    });
  }

  const horizonBars = HORIZON_BARS[pending.horizon];
  const baseIndex = findBaseIndex(bars, pending.observationStartedAt);

  if (baseIndex === -1) {
    return pending; // Still pending (no base date trading data yet)
  }

  const baseBar = bars[baseIndex];
  if (baseBar.close <= 0) {
    return terminalRevision("error", {
      marketBenchmarkAssetId,
      sectorBenchmarkAssetId,
      lesson: `Invalid base price (${baseBar.close}) on ${baseBar.date}.`,
      finalWarnings: [...pending.finalWarnings, "invalid_base_price"],
    });
  }

  const targetBar = findTargetBar(bars, baseIndex, horizonBars);
  if (!targetBar) {
    return pending; // Still pending (target trade date has not arrived yet)
  }

  const observedForwardReturn = (targetBar.close - baseBar.close) / baseBar.close;
  const finalWarnings = [...pending.finalWarnings];

  // Load and check market benchmark
  let marketBenchmarkReturn: number | null = null;
  let marketExcessReturn: number | null = null;
  let marketBenchmarkDataVersionId: string | null = null;

  if (marketBenchmarkAssetId) {
    try {
      const benchEnv = await loadVersionedOhlcvHistory({
        assetId: marketBenchmarkAssetId,
        universeId: pending.universeId as any,
        asOfDate: nowStr.slice(0, 10),
        knownAt: nowStr,
      });

      if (benchEnv.status !== "error" && benchEnv.value && benchEnv.value.length > 0) {
        const benchBars = sortAndValidateBars(benchEnv.value as PriceBar[]);
        if (benchBars) {
          const benchBaseIdx = findBaseIndex(benchBars, pending.observationStartedAt);
          const benchTargetBar =
            benchBaseIdx !== -1 ? findTargetBar(benchBars, benchBaseIdx, horizonBars) : null;
          const benchBaseBar = benchBaseIdx !== -1 ? benchBars[benchBaseIdx] : null;

          // Align trading dates exactly
          if (
            benchBaseBar &&
            benchTargetBar &&
            benchBaseBar.date === baseBar.date &&
            benchTargetBar.date === targetBar.date &&
            benchBaseBar.close > 0
          ) {
            marketBenchmarkReturn =
              (benchTargetBar.close - benchBaseBar.close) / benchBaseBar.close;
            marketExcessReturn = observedForwardReturn - marketBenchmarkReturn;
            marketBenchmarkDataVersionId = benchEnv.dataVersionId;
          } else {
            finalWarnings.push("market_benchmark_date_mismatch");
          }
        }
      }
    } catch {
      finalWarnings.push("market_benchmark_load_failed");
    }
  }

  if (marketBenchmarkReturn === null) {
    finalWarnings.push("market_benchmark_missing");
  }

  // Load and check sector benchmark
  let sectorBenchmarkReturn: number | null = null;
  let sectorExcessReturn: number | null = null;
  let sectorBenchmarkDataVersionId: string | null = null;

  if (sectorBenchmarkAssetId) {
    try {
      const secEnv = await loadVersionedOhlcvHistory({
        assetId: sectorBenchmarkAssetId,
        universeId: pending.universeId as any,
        asOfDate: nowStr.slice(0, 10),
        knownAt: nowStr,
      });

      if (secEnv.status !== "error" && secEnv.value && secEnv.value.length > 0) {
        const secBars = sortAndValidateBars(secEnv.value as PriceBar[]);
        if (secBars) {
          const secBaseIdx = findBaseIndex(secBars, pending.observationStartedAt);
          const secTargetBar =
            secBaseIdx !== -1 ? findTargetBar(secBars, secBaseIdx, horizonBars) : null;
          const secBaseBar = secBaseIdx !== -1 ? secBars[secBaseIdx] : null;

          // Align trading dates exactly
          if (
            secBaseBar &&
            secTargetBar &&
            secBaseBar.date === baseBar.date &&
            secTargetBar.date === targetBar.date &&
            secBaseBar.close > 0
          ) {
            sectorBenchmarkReturn = (secTargetBar.close - secBaseBar.close) / secBaseBar.close;
            sectorExcessReturn = observedForwardReturn - sectorBenchmarkReturn;
            sectorBenchmarkDataVersionId = secEnv.dataVersionId;
          } else {
            finalWarnings.push("sector_benchmark_date_mismatch");
          }
        }
      }
    } catch {
      finalWarnings.push("sector_benchmark_load_failed");
    }
  }

  const lesson =
    `Observed return over ${horizonBars} bars: ${(observedForwardReturn * 100).toFixed(2)}%. ` +
    (marketBenchmarkReturn !== null
      ? `Market benchmark (${marketBenchmarkAssetId}): ${(marketBenchmarkReturn * 100).toFixed(2)}%. ` +
        `Market excess: ${(marketExcessReturn! * 100).toFixed(2)}%.`
      : "Market benchmark data missing.");

  // Save the terminal observation revision
  const observed: SignalOutcomeJournalRecord = {
    ...pending,
    id: nextRevisionId(pending),
    supersedesOutcomeId: pending.id,
    revision: pending.revision + 1,
    basePriceDataVersionId: dataVersionId,
    baseTradeDate: baseBar.date,
    targetTradeDate: targetBar.date,
    observedForwardReturn,
    marketBenchmarkAssetId,
    marketBenchmarkReturn,
    marketExcessReturn,
    marketBenchmarkDataVersionId,
    sectorBenchmarkAssetId,
    sectorBenchmarkReturn,
    sectorExcessReturn,
    sectorBenchmarkDataVersionId,
    finalWarnings,
    outcomeStatus: "observed",
    lesson,
    confidenceAdjustment: "not_applicable",
    observedAt: nowStr,
  };

  await saveOutcomeRecord(observed);
  return observed;
}
