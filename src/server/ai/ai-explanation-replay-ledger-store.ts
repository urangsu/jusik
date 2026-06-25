import fs from "fs/promises";
import path from "path";
import { AiExplanationReplayRecord, AiReplayMode, AiReplayOutcome } from "@/domain/ai/ai-explanation-replay-ledger";
import { writeAtomic } from "../storage/atomic-write";
import {
  getAiExplanationReplayDir,
  getAiExplanationReplayLatestPath,
  getAiExplanationReplayHistoryDir,
  getAiExplanationReplayHistoryPath,
  getAiExplanationReplayByFindingDir,
  getAiExplanationReplayByFindingPath,
} from "./ai-explanation-replay-ledger-store-paths";

export async function saveAiExplanationReplayRecord(
  record: AiExplanationReplayRecord
): Promise<void> {
  const historyDir = getAiExplanationReplayHistoryDir();
  await fs.mkdir(historyDir, { recursive: true });

  const findingDir = path.join(getAiExplanationReplayByFindingDir(), record.findingId);
  await fs.mkdir(findingDir, { recursive: true });

  const serialized = JSON.stringify(record, null, 2);

  // 1. Save in history
  const historyPath = getAiExplanationReplayHistoryPath(record.id);
  await writeAtomic(historyPath, serialized);

  // 2. Save in by-finding
  const byFindingPath = getAiExplanationReplayByFindingPath(record.findingId, record.id);
  await writeAtomic(byFindingPath, serialized);

  // 3. Update latest.json
  const latestPath = getAiExplanationReplayLatestPath();
  let latestRecords: AiExplanationReplayRecord[] = [];
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    latestRecords = JSON.parse(raw);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  // Deduplicate: key is findingId|requestHash|mode|engineVersion
  const buildDedupeKey = (r: AiExplanationReplayRecord) =>
    `${r.findingId}|${r.requestHash}|${r.mode}|${r.engineVersion}`;

  const currentKey = buildDedupeKey(record);
  latestRecords = latestRecords.filter((r) => buildDedupeKey(r) !== currentKey);
  latestRecords.unshift(record);

  // Keep latest 100 records in latest.json to prevent oversized file
  if (latestRecords.length > 100) {
    latestRecords = latestRecords.slice(0, 100);
  }

  await writeAtomic(latestPath, JSON.stringify(latestRecords, null, 2));
}

export async function listAiExplanationReplayRecords(query?: {
  findingId?: string;
  mode?: AiReplayMode;
  outcome?: AiReplayOutcome;
  passed?: boolean;
}): Promise<AiExplanationReplayRecord[]> {
  const historyDir = getAiExplanationReplayHistoryDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(historyDir);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const records: AiExplanationReplayRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(historyDir, file), "utf8");
      records.push(JSON.parse(raw));
    } catch {
      // Ignore malformed files
    }
  }

  // Apply filters
  let filtered = records;
  if (query) {
    if (query.findingId) {
      filtered = filtered.filter((r) => r.findingId === query.findingId);
    }
    if (query.mode) {
      filtered = filtered.filter((r) => r.mode === query.mode);
    }
    if (query.outcome) {
      filtered = filtered.filter((r) => r.outcome === query.outcome);
    }
    if (query.passed !== undefined) {
      filtered = filtered.filter((r) => r.passed === query.passed);
    }
  }

  // Sort by createdAt descending
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return filtered;
}

export async function getLatestAiExplanationReplayRecords(): Promise<AiExplanationReplayRecord[]> {
  const latestPath = getAiExplanationReplayLatestPath();
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    return JSON.parse(raw);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}
