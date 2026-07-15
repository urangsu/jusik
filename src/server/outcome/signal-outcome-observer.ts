import { saveOutcomeRecord, getOutcomeRecord } from "./signal-outcome-journal-store";
import { getSymbolMasterRecord } from "@/server/symbols/symbol-master-store";
import type {
  SignalOutcomeJournalRecord,
  OutcomeSubjectType,
  OutcomeHorizon,
} from "@/domain/outcome/signal-outcome-journal";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";

const HORIZON_BARS: Record<OutcomeHorizon, number> = {
  forward_5d: 5,
  forward_20d: 20,
  forward_60d: 60,
};

type PriceBar = { date: string; close: number };

/**
 * Returns the index of the first bar whose date >= observationStartedAt (YYYY-MM-DD prefix).
 * Returns -1 if no such bar exists.
 */
export function findBaseIndex(bars: PriceBar[], observationStartedAt: string): number {
  const startDate = observationStartedAt.slice(0, 10);
  return bars.findIndex((b) => b.date >= startDate);
}

/**
 * Returns the bar exactly `horizonBars` positions after `baseIndex`, or null if out of range.
 */
export function findTargetBar(
  bars: PriceBar[],
  baseIndex: number,
  horizonBars: number,
): PriceBar | null {
  return bars[baseIndex + horizonBars] ?? null;
}

/**
 * Sort bars by date ascending and validate:
 * - No duplicate dates
 * - Finite, positive close prices
 */
function sortAndValidateBars(bars: PriceBar[]): PriceBar[] | null {
  const sorted = [...bars].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (!isFinite(b.close) || b.close <= 0) return null;
    if (i > 0 && sorted[i - 1].date === b.date) return null;
  }
  return sorted;
}

/**
 * Build the next revision ID from a pending record.
 */
function nextRevisionId(pending: SignalOutcomeJournalRecord): string {
  return `${pending.rootOutcomeId}_r${pending.revision + 1}`;
}

export async function createPendingOutcomeRecord(input: {
  subjectType: OutcomeSubjectType;
  subjectId: string;
  assetId?: string | null;
  signalId?: string | null;
  strategyId?: string | null;
  horizon: OutcomeHorizon;
  evidencePackIds?: string[];
  observationStartedAt?: string | null;
}): Promise<SignalOutcomeJournalRecord> {
  const {
    subjectType,
    subjectId,
    assetId = null,
    signalId = null,
    strategyId = null,
    horizon,
    evidencePackIds = [],
    observationStartedAt = null,
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

/**
 * Observe an outcome record.
 *
 * All terminal state transitions (observed / insufficient_data / error) create a NEW revision
 * record and preserve the original pending record unchanged (append-only / immutable design).
 *
 * When the target trading bar has not yet arrived the existing pending record is returned
 * without any write so the immutability guard is never triggered.
 */
export async function observeOutcome(recordId: string): Promise<SignalOutcomeJournalRecord> {
  const pending = await getOutcomeRecord(recordId);
  if (!pending) {
    throw new Error(`Outcome record not found: ${recordId}`);
  }

  // Already in a terminal state — return as-is
  if (pending.outcomeStatus !== "pending") {
    return pending;
  }

  const nowStr = new Date().toISOString();

  const pendingRecord: SignalOutcomeJournalRecord = pending;
  // Helper: create a terminal revision (insufficient_data or error)
  async function terminalRevision(
    status: "insufficient_data" | "error",
    fields: Partial<SignalOutcomeJournalRecord>,
  ): Promise<SignalOutcomeJournalRecord> {
    const revision: SignalOutcomeJournalRecord = {
      ...pendingRecord,
      id: nextRevisionId(pendingRecord),
      supersedesOutcomeId: pendingRecord.id,
      revision: pendingRecord.revision + 1,
      outcomeStatus: status,
      observedAt: nowStr,
      ...fields,
    } as SignalOutcomeJournalRecord;
    await saveOutcomeRecord(revision);
    return revision;
  }

  // Guard 1: assetId must be present — never fall back to a default ticker
  if (!pending.assetId) {
    return terminalRevision("insufficient_data", {
      lesson: "assetId is required for outcome observation. No default ticker is allowed.",
      finalWarnings: [...pending.finalWarnings, "missing_asset_id"],
    });
  }

  // Guard 2: observationStartedAt must be present
  if (!pending.observationStartedAt) {
    return terminalRevision("insufficient_data", {
      lesson: "observationStartedAt is required for date-aligned outcome observation.",
      finalWarnings: [...pending.finalWarnings, "missing_observation_started_at"],
    });
  }

  // Resolve benchmark IDs from Symbol Master (seed metadata)
  const symbolRecord = await getSymbolMasterRecord(pending.assetId).catch(() => null);
  const marketBenchmarkAssetId = symbolRecord?.marketBenchmarkId ?? null;
  const sectorBenchmarkAssetId = symbolRecord?.sectorBenchmarkId ?? null;

  // Determine universeId for OHLCV loader
  const isKr =
    pending.assetId.startsWith("KR_") ||
    pending.assetId.includes(".KS") ||
    /^\d+$/.test(pending.assetId);
  const universeId = isKr ? "KOSPI_SAMPLE" : "SP500_SAMPLE";

  const ohlcvEnv = await loadOhlcvHistory(universeId, pending.assetId);
  const dataVersionId = (ohlcvEnv as unknown as { dataVersionId?: string }).dataVersionId;

  if (!ohlcvEnv.value || ohlcvEnv.value.length === 0) {
    return terminalRevision("insufficient_data", {
      marketBenchmarkAssetId,
      sectorBenchmarkAssetId,
      lesson: "No OHLCV history available for observation.",
      finalWarnings: [...pending.finalWarnings, "no_ohlcv_data"],
    });
  }

  // Guard 3: OHLCV must carry a dataVersionId
  if (!dataVersionId) {
    return terminalRevision("insufficient_data", {
      marketBenchmarkAssetId,
      sectorBenchmarkAssetId,
      basePriceDataVersionId: null,
      lesson: "OHLCV loader did not return a dataVersionId; cannot record a versioned observation.",
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

  // No qualifying base bar found — still waiting (no write, just return existing)
  if (baseIndex === -1) {
    return pending;
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

  // Target bar does not yet exist → still pending (no write, return existing record)
  if (!targetBar) {
    return pending;
  }

  const observedForwardReturn = (targetBar.close - baseBar.close) / baseBar.close;
  const finalWarnings = [...pending.finalWarnings];

  // Load market benchmark
  let marketBenchmarkReturn: number | null = null;
  let marketExcessReturn: number | null = null;
  let marketBenchmarkDataVersionId: string | null = null;

  if (marketBenchmarkAssetId) {
    try {
      const benchEnv = await loadOhlcvHistory(universeId, marketBenchmarkAssetId);
      const benchVersionId = (benchEnv as unknown as { dataVersionId?: string }).dataVersionId;
      if (benchEnv.value && benchEnv.value.length > 0) {
        const benchBars = sortAndValidateBars(benchEnv.value as PriceBar[]);
        if (benchBars) {
          const benchBaseIdx = findBaseIndex(benchBars, pending.observationStartedAt!);
          const benchTargetBar =
            benchBaseIdx !== -1 ? findTargetBar(benchBars, benchBaseIdx, horizonBars) : null;
          const benchBaseBar = benchBaseIdx !== -1 ? benchBars[benchBaseIdx] : null;

          if (benchBaseBar && benchTargetBar && benchBaseBar.close > 0) {
            marketBenchmarkReturn =
              (benchTargetBar.close - benchBaseBar.close) / benchBaseBar.close;
            marketExcessReturn = observedForwardReturn - marketBenchmarkReturn;
            marketBenchmarkDataVersionId = benchVersionId ?? null;
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

  // Load sector benchmark
  let sectorBenchmarkReturn: number | null = null;
  let sectorExcessReturn: number | null = null;
  let sectorBenchmarkDataVersionId: string | null = null;

  if (sectorBenchmarkAssetId) {
    try {
      const secEnv = await loadOhlcvHistory(universeId, sectorBenchmarkAssetId);
      const secVersionId = (secEnv as unknown as { dataVersionId?: string }).dataVersionId;
      if (secEnv.value && secEnv.value.length > 0) {
        const secBars = sortAndValidateBars(secEnv.value as PriceBar[]);
        if (secBars) {
          const secBaseIdx = findBaseIndex(secBars, pending.observationStartedAt!);
          const secTargetBar =
            secBaseIdx !== -1 ? findTargetBar(secBars, secBaseIdx, horizonBars) : null;
          const secBaseBar = secBaseIdx !== -1 ? secBars[secBaseIdx] : null;

          if (secBaseBar && secTargetBar && secBaseBar.close > 0) {
            sectorBenchmarkReturn = (secTargetBar.close - secBaseBar.close) / secBaseBar.close;
            sectorExcessReturn = observedForwardReturn - sectorBenchmarkReturn;
            sectorBenchmarkDataVersionId = secVersionId ?? null;
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

  // Observation creates a new revision (immutable append-only)
  const observedRevision = pending.revision + 1;
  const observed: SignalOutcomeJournalRecord = {
    ...pending,
    id: nextRevisionId(pending),
    supersedesOutcomeId: pending.id,
    revision: observedRevision,
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
