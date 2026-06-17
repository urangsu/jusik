import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { loadOhlcvHistory } from "./ohlcv-history-loader";
import { calculateTechnicalSignals } from "./technical-signal-engine";
import { calculateAtomicSignals } from "./atomic-signal-calculator";
import { calculateMomentumFactorV1 } from "./momentum-factor-v1";
import { saveFactorValues, saveTechnicalSignalSnapshot } from "./factor-store";
import {
  saveSignalHistory,
  saveCurrentSignals,
  getCurrentSignals,
} from "../signals/signal-history-store";
import { SignalHistoryRecord } from "@/domain/signals/signal-history";
import { SignalVersion } from "@/domain/signals/signal-version";
import { FactorValue } from "@/domain/factors/factor-value";
import { AtomicSignal } from "@/domain/factors/atomic-signal";

export type TechnicalJobSummary = {
  universeId: string;
  totalAssets: number;
  processedAssets: number;
  failedAssets: number;
  timestamp: string;
};

export async function runTechnicalFactorJob(
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE"
): Promise<TechnicalJobSummary> {
  const constituents =
    universeId === "KOSPI_SAMPLE" ? KOSPI_SAMPLE_CONSTITUENTS : SP500_SAMPLE_CONSTITUENTS;

  console.log(`[TechnicalFactorJob] Starting calculation for universe ${universeId} with ${constituents.length} assets.`);

  const calculatedAt = new Date().toISOString();
  
  const signalVersion: SignalVersion = {
    signalVersionId: "technical_v1",
    engine: {
      engineId: "technical_factor_engine",
      engineVersion: "1.0.0",
      configHash: "default",
      createdAt: calculatedAt,
    },
    dataVersionId: "yfinance",
    calculatedAt,
    expiryAt: null,
  };

  let processedAssets = 0;
  let failedAssets = 0;

  const snapshotAssets: Record<string, any> = {};
  const allNewFactorValues: FactorValue[] = [];
  const allNewHistoryRecords: SignalHistoryRecord<AtomicSignal>[] = [];

  for (const c of constituents) {
    const { assetId, symbol } = c;
    console.log(`[TechnicalFactorJob] Processing ${symbol} (${assetId})...`);

    const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);
    if (!ohlcvEnv.value || ohlcvEnv.value.length === 0) {
      console.warn(`[TechnicalFactorJob] No history found for ${symbol}. Skipping.`);
      failedAssets++;
      continue;
    }

    const bars = ohlcvEnv.value;
    const latestIndex = bars.length - 1;
    const latestBar = bars[latestIndex];
    const date = latestBar.date;

    try {
      // 1. Calculate raw indicators
      const techResult = calculateTechnicalSignals(bars, latestIndex);

      // 2. Standardize into atomic signals
      const atomicSigs = calculateAtomicSignals(
        techResult,
        ohlcvEnv.status,
        latestBar.close,
        latestBar.open
      );

      // 3. Aggregate into Momentum Factor v1
      const momentumResult = calculateMomentumFactorV1(
        assetId,
        universeId,
        date,
        atomicSigs,
        ohlcvEnv.status
      );

      // Collect data
      allNewFactorValues.push(momentumResult.factorValue);
      
      for (const sig of atomicSigs) {
        const historyId = `${assetId}_${sig.factorId}_${date}`.replace(/:/g, "_");
        allNewHistoryRecords.push({
          signalHistoryId: historyId,
          assetId,
          date,
          version: signalVersion,
          signal: sig,
        });
      }

      // Prepare snapshot record for this asset
      snapshotAssets[assetId] = {
        assetId,
        symbol,
        nameKo: c.nameKo,
        nameEn: c.nameEn,
        technicalSignals: techResult,
        atomicSignals: atomicSigs,
        momentum: momentumResult,
      };

      processedAssets++;
    } catch (err) {
      console.error(`[TechnicalFactorJob] Error processing ${symbol}:`, err);
      failedAssets++;
    }
  }

  // Persist factor values
  if (allNewFactorValues.length > 0) {
    await saveFactorValues(allNewFactorValues);
  }

  // Persist signal history
  if (allNewHistoryRecords.length > 0) {
    await saveSignalHistory(allNewHistoryRecords);
  }

  // Save latest universe snapshot of signals
  const universeSnapshot = {
    universeId,
    updatedAt: calculatedAt,
    assets: snapshotAssets,
  };
  await saveTechnicalSignalSnapshot(universeId, universeSnapshot);

  // Update central current-signals.json
  const currentSignals = (await getCurrentSignals()) || {};
  for (const assetId of Object.keys(snapshotAssets)) {
    currentSignals[assetId] = snapshotAssets[assetId];
  }
  await saveCurrentSignals(currentSignals);

  console.log(
    `[TechnicalFactorJob] Completed universe ${universeId}. Processed: ${processedAssets}, Failed: ${failedAssets}.`
  );

  return {
    universeId,
    totalAssets: constituents.length,
    processedAssets,
    failedAssets,
    timestamp: calculatedAt,
  };
}
