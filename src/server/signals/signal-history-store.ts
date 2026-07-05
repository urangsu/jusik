import { SignalHistoryRecord } from "@/domain/signals/signal-history";
import { JsonFileStore } from "../storage/json-file-store";
import { getSignalHistoryPath, getCurrentSignalsPath } from "../storage/storage-paths";
import fs from "fs";
import path from "path";

const signalHistoryStore = new JsonFileStore<SignalHistoryRecord<any>[]>(
  getSignalHistoryPath(),
  []
);

const currentSignalsStore = new JsonFileStore<any>(
  getCurrentSignalsPath(),
  null
);

export async function saveSignalHistory(
  records: SignalHistoryRecord<any>[]
): Promise<void> {
  const filepath = getSignalHistoryPath();
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existing = await signalHistoryStore.read();
  
  // Merge by overwriting entries with same assetId, signalId, and date.
  // signalId extraction matches the logic in calculateCrossSectionalRankCorrelation
  // and calculateSignalStability: signalId → strategyId → factorId → id → "unknown".
  function extractSignalId(sig: unknown): string {
    if (!sig || typeof sig !== "object") return "unknown";
    const candidate = sig as Record<string, unknown>;
    return String(
      candidate.signalId ??
        candidate.strategyId ??
        candidate.factorId ??
        candidate.id ??
        "unknown"
    );
  }

  const recordMap = new Map<string, SignalHistoryRecord<any>>();
  
  for (const r of existing) {
    const key = `${r.assetId}_${extractSignalId(r.signal)}_${r.date}`;
    recordMap.set(key, r);
  }

  for (const r of records) {
    const key = `${r.assetId}_${extractSignalId(r.signal)}_${r.date}`;
    recordMap.set(key, r);
  }

  await signalHistoryStore.write(Array.from(recordMap.values()));
}

export async function getSignalHistory(): Promise<SignalHistoryRecord<any>[]> {
  return await signalHistoryStore.read();
}

export async function saveCurrentSignals(signals: any): Promise<void> {
  const filepath = getCurrentSignalsPath();
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await currentSignalsStore.write(signals);
}

export async function getCurrentSignals(): Promise<any> {
  return await currentSignalsStore.read();
}
