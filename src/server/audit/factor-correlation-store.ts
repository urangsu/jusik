import fs from "fs/promises";
import { FactorCorrelationResult, FactorCorrelationSeverity, FactorCorrelationMethod } from "@/domain/audit/factor-correlation-result";
import { writeAtomic } from "../storage/atomic-write";
import {
  getFactorCorrelationDir,
  getFactorCorrelationLatestPath,
  getFactorCorrelationHistoryDir,
  getFactorCorrelationHistoryPath,
} from "./factor-correlation-store-paths";

export async function saveFactorCorrelationResults(
  results: FactorCorrelationResult[]
): Promise<void> {
  const dir = getFactorCorrelationDir();
  const historyDir = getFactorCorrelationHistoryDir();

  // Create directories if they do not exist
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(historyDir, { recursive: true });

  const latestPath = getFactorCorrelationLatestPath();
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const historyPath = getFactorCorrelationHistoryPath(timestamp);

  const serialized = JSON.stringify(results, null, 2);

  // Write atomically
  await writeAtomic(latestPath, serialized);
  await writeAtomic(historyPath, serialized);
}

export async function listFactorCorrelationResults(query?: {
  universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  factorId?: string;
  severity?: FactorCorrelationSeverity;
  method?: FactorCorrelationMethod;
}): Promise<FactorCorrelationResult[]> {
  const latestPath = getFactorCorrelationLatestPath();
  let results: FactorCorrelationResult[] = [];

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
    if (query.factorId) {
      results = results.filter(
        (r) => r.factorA === query.factorId || r.factorB === query.factorId
      );
    }
    if (query.severity) {
      results = results.filter((r) => r.severity === query.severity);
    }
    if (query.method) {
      results = results.filter((r) => r.method === query.method);
    }
  }

  return results;
}
