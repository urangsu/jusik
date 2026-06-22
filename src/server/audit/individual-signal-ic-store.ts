import fs from "fs/promises";
import path from "path";
import { IndividualSignalIcResult } from "@/domain/audit/individual-signal-ic-result";
import { writeAtomic } from "../storage/atomic-write";
import {
  getIndividualSignalIcDir,
  getIndividualSignalIcLatestPath,
  getIndividualSignalIcHistoryDir,
  getIndividualSignalIcHistoryPath,
} from "./individual-signal-ic-store-paths";

export async function saveIndividualSignalIcResults(
  results: IndividualSignalIcResult[]
): Promise<void> {
  const dir = getIndividualSignalIcDir();
  const historyDir = getIndividualSignalIcHistoryDir();

  // Create directories if they do not exist
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(historyDir, { recursive: true });

  const latestPath = getIndividualSignalIcLatestPath();
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const historyPath = getIndividualSignalIcHistoryPath(timestamp);

  const serialized = JSON.stringify(results, null, 2);

  // Write atomically
  await writeAtomic(latestPath, serialized);
  await writeAtomic(historyPath, serialized);
}

export async function listIndividualSignalIcResults(query?: {
  universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  signalId?: string;
  horizon?: "1w" | "1m" | "3m";
}): Promise<IndividualSignalIcResult[]> {
  const latestPath = getIndividualSignalIcLatestPath();
  let results: IndividualSignalIcResult[] = [];

  try {
    const raw = await fs.readFile(latestPath, "utf8");
    results = JSON.parse(raw);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    return [];
  }

  if (query) {
    if (query.universeId) {
      results = results.filter((r) => r.universeId === query.universeId);
    }
    if (query.signalId) {
      results = results.filter((r) => r.signalId === query.signalId);
    }
    if (query.horizon) {
      results = results.filter((r) => r.horizon === query.horizon);
    }
  }

  return results;
}

export async function getLatestIndividualSignalIcResults(): Promise<IndividualSignalIcResult[]> {
  return await listIndividualSignalIcResults();
}
