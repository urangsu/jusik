/**
 * Research Evidence Record Store (file-based, append-only).
 *
 * Stores and retrieves ResearchEvidenceRecord instances by evidenceId.
 * Records are stored as individual JSON files under:
 *   {JUSIK_DATA_ROOT}/data/research/evidence/{evidenceId}.json
 *
 * Production rules:
 * - Never fabricate a record; return null if not found.
 * - Never write to production store during tests (use JUSIK_TEST_DATA_ROOT).
 */

import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";

function getEvidenceDir(): string {
  return resolveRuntimeDataPath("data", "research", "evidence");
}

function getEvidencePath(evidenceId: string): string {
  return path.join(getEvidenceDir(), `${evidenceId}.json`);
}

export async function getEvidenceRecord(evidenceId: string): Promise<ResearchEvidenceRecord | null> {
  const filePath = getEvidencePath(evidenceId);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const record = JSON.parse(raw) as ResearchEvidenceRecord;
    return record;
  } catch {
    return null;
  }
}

export async function listEvidenceRecordsForAsset(assetId: string): Promise<ResearchEvidenceRecord[]> {
  const dir = getEvidenceDir();

  try {
    const files = await fs.readdir(dir);
    const records: ResearchEvidenceRecord[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf-8");
        const record = JSON.parse(raw) as ResearchEvidenceRecord;
        if (record.assetId === assetId) {
          records.push(record);
        }
      } catch {
        // Skip malformed files
      }
    }
    return records;
  } catch {
    return [];
  }
}

export async function saveEvidenceRecord(record: ResearchEvidenceRecord): Promise<void> {
  const dir = getEvidenceDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = getEvidencePath(record.evidenceId);

  // Path resolution traversal guard
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(dir + path.sep)) {
    throw new Error("Path traversal attempt blocked.");
  }

  // Idempotent and immutability guard
  try {
    const existingData = await fs.readFile(filePath, "utf-8");
    const existingRecord = JSON.parse(existingData) as ResearchEvidenceRecord;
    if (existingRecord.contentHash !== record.contentHash) {
      throw new Error(
        `Immutable evidence violation: evidence record "${record.evidenceId}" already exists with a different content hash.`
      );
    }
    // Idempotent: identical contents -> skip
    return;
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  await writeAtomic(filePath, JSON.stringify(record, null, 2));
}

export async function clearAllResearchEvidence(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Clear operations are only allowed in test environment.");
  }
  try {
    await fs.rm(getEvidenceDir(), { recursive: true, force: true });
  } catch {
    // ignore
  }
}
