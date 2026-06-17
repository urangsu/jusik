import path from "path";
import fs from "fs/promises";
import { ReliabilitySummary } from "@/domain/reliability/reliability-summary";
import { writeAtomic } from "@/server/storage/atomic-write";

const RELIABILITY_DIR = path.join(process.cwd(), "data", "reliability");
const HISTORY_DIR = path.join(RELIABILITY_DIR, "history");

async function ensureDirs(): Promise<void> {
  await fs.mkdir(RELIABILITY_DIR, { recursive: true });
  await fs.mkdir(HISTORY_DIR, { recursive: true });
}

export async function saveReliabilitySummary(
  summary: ReliabilitySummary,
  runId?: string
): Promise<void> {
  await ensureDirs();

  // 1. Save to data/reliability/{universeId}.latest.json
  const latestPath = path.join(RELIABILITY_DIR, `${summary.universeId}.latest.json`);
  const jsonContent = JSON.stringify(summary, null, 2);
  await writeAtomic(latestPath, jsonContent);

  // 2. If runId is provided, save to data/reliability/history/{runId}.json
  if (runId) {
    const historyPath = path.join(HISTORY_DIR, `${runId}.json`);
    await writeAtomic(historyPath, jsonContent);
  }
}

export async function getLatestReliabilitySummary(
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE"
): Promise<ReliabilitySummary | null> {
  await ensureDirs();
  const latestPath = path.join(RELIABILITY_DIR, `${universeId}.latest.json`);

  try {
    const content = await fs.readFile(latestPath, "utf8");
    return JSON.parse(content) as ReliabilitySummary;
  } catch {
    return null;
  }
}

export async function getReliabilityHistory(
  runId: string
): Promise<ReliabilitySummary | null> {
  await ensureDirs();
  const historyPath = path.join(HISTORY_DIR, `${runId}.json`);

  try {
    const content = await fs.readFile(historyPath, "utf8");
    return JSON.parse(content) as ReliabilitySummary;
  } catch {
    return null;
  }
}
