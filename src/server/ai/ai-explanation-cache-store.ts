import fs from "fs/promises";
import path from "path";
import {
  AiExplanationCacheRecord,
  AiExplanationBlockedRecord,
  AiExplanationRequestSourceType,
} from "@/domain/ai/ai-explanation-request";
import { AiOutputIntent } from "@/domain/ai/structured-ai-output";
import { writeAtomic } from "../storage/atomic-write";
import {
  getAiExplanationCacheDir,
  getAiExplanationCacheByHashDir,
  getAiExplanationCacheByHashPath,
  getAiExplanationCacheLatestPath,
  getAiExplanationCacheBlockedDir,
  getAiExplanationCacheBlockedPath,
} from "./ai-explanation-cache-store-paths";

export async function getAiExplanationCacheByHash(
  requestHash: string
): Promise<AiExplanationCacheRecord | null> {
  const filePath = getAiExplanationCacheByHashPath(requestHash);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function saveAiExplanationCacheRecord(
  record: AiExplanationCacheRecord
): Promise<void> {
  if (record.output.isBlocked) {
    throw new Error("Blocked AI output cannot be saved to normal cache store.");
  }

  const byHashDir = getAiExplanationCacheByHashDir();
  await fs.mkdir(byHashDir, { recursive: true });

  const cachePath = getAiExplanationCacheByHashPath(record.requestHash);
  const serialized = JSON.stringify(record, null, 2);
  await writeAtomic(cachePath, serialized);

  // Update latest.json
  const latestPath = getAiExplanationCacheLatestPath();
  let latestRecords: AiExplanationCacheRecord[] = [];
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    latestRecords = JSON.parse(raw);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  // Prepend and filter duplicates
  latestRecords = latestRecords.filter((r) => r.requestHash !== record.requestHash);
  latestRecords.unshift(record);

  // Keep latest 50 records
  if (latestRecords.length > 50) {
    latestRecords = latestRecords.slice(0, 50);
  }

  await writeAtomic(latestPath, JSON.stringify(latestRecords, null, 2));
}

export async function saveAiExplanationBlockedRecord(
  record: AiExplanationBlockedRecord
): Promise<void> {
  const blockedDir = getAiExplanationCacheBlockedDir();
  await fs.mkdir(blockedDir, { recursive: true });

  const blockedPath = getAiExplanationCacheBlockedPath(record.requestHash);
  const serialized = JSON.stringify(record, null, 2);
  await writeAtomic(blockedPath, serialized);
}

export async function listAiExplanationCacheRecords(query?: {
  intent?: AiOutputIntent;
  sourceType?: AiExplanationRequestSourceType;
  sourceId?: string;
}): Promise<AiExplanationCacheRecord[]> {
  const byHashDir = getAiExplanationCacheByHashDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(byHashDir);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const records: AiExplanationCacheRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(byHashDir, file), "utf8");
      records.push(JSON.parse(raw));
    } catch {
      // ignore malformed files
    }
  }

  return filterRecords(records, query);
}

export async function listAiExplanationBlockedRecords(query?: {
  intent?: AiOutputIntent;
  sourceType?: AiExplanationRequestSourceType;
  sourceId?: string;
}): Promise<AiExplanationBlockedRecord[]> {
  const blockedDir = getAiExplanationCacheBlockedDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(blockedDir);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const records: AiExplanationBlockedRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(blockedDir, file), "utf8");
      records.push(JSON.parse(raw));
    } catch {
      // ignore malformed files
    }
  }

  return filterRecords(records, query);
}

function filterRecords<T extends { request: { intent: string; sourceType: string; sourceId: string } }>(
  records: T[],
  query?: { intent?: string; sourceType?: string; sourceId?: string }
): T[] {
  if (!query) return records;
  let filtered = records;
  if (query.intent) {
    filtered = filtered.filter((r) => r.request.intent === query.intent);
  }
  if (query.sourceType) {
    filtered = filtered.filter((r) => r.request.sourceType === query.sourceType);
  }
  if (query.sourceId) {
    filtered = filtered.filter((r) => r.request.sourceId === query.sourceId);
  }
  return filtered;
}
