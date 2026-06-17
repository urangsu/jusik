import { FactorValue } from "@/domain/factors/factor-value";
import { JsonFileStore } from "../storage/json-file-store";
import { getFactorValuesPath, getTechnicalSignalSnapshotPath } from "../storage/storage-paths";
import fs from "fs";
import path from "path";

// Initialize JsonFileStore for central factor values
const factorValuesStore = new JsonFileStore<FactorValue[]>(getFactorValuesPath(), []);

export async function saveFactorValues(values: FactorValue[]): Promise<void> {
  const dir = path.dirname(getFactorValuesPath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existing = await factorValuesStore.read();
  
  // Merge by overwriting entries with same assetId, factorId, and date
  const valueMap = new Map<string, FactorValue>();
  for (const v of existing) {
    const key = `${v.assetId}_${v.factorId}_${v.dataAvailableAt}`;
    valueMap.set(key, v);
  }
  
  for (const v of values) {
    const key = `${v.assetId}_${v.factorId}_${v.dataAvailableAt}`;
    valueMap.set(key, v);
  }
  
  await factorValuesStore.write(Array.from(valueMap.values()));
}

export async function getFactorValues(): Promise<FactorValue[]> {
  return await factorValuesStore.read();
}

export async function saveTechnicalSignalSnapshot(
  universeId: string,
  snapshot: any
): Promise<void> {
  const filepath = getTechnicalSignalSnapshotPath(universeId);
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const store = new JsonFileStore<any>(filepath, null);
  await store.write(snapshot);
}

export async function getTechnicalSignalSnapshot(
  universeId: string
): Promise<any | null> {
  const filepath = getTechnicalSignalSnapshotPath(universeId);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  const store = new JsonFileStore<any>(filepath, null);
  return await store.read();
}
