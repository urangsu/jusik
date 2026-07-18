/**
 * Research Evidence Record Store (file-based, append-only).
 *
 * Stores and retrieves ResearchEvidenceRecord instances by evidenceId.
 * Records are stored as individual JSON files under:
 *   {JUSIK_DATA_ROOT}/research/evidence/{evidenceId}.json
 *
 * Production rules:
 * - Never fabricate a record; return null if not found.
 * - Never write to production store during tests (use JUSIK_TEST_DATA_ROOT).
 */

import fs from "fs";
import path from "path";
import { getRuntimeStoreRoot } from "@/server/storage/runtime-store-root";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";

function getEvidenceDir(): string {
  return path.join(getRuntimeStoreRoot(), "research", "evidence");
}

export async function getEvidenceRecord(evidenceId: string): Promise<ResearchEvidenceRecord | null> {
  const dir = getEvidenceDir();
  const filePath = path.join(dir, `${evidenceId}.json`);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const record = JSON.parse(raw) as ResearchEvidenceRecord;
    return record;
  } catch {
    return null;
  }
}

export async function listEvidenceRecordsForAsset(assetId: string): Promise<ResearchEvidenceRecord[]> {
  const dir = getEvidenceDir();

  try {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    const records: ResearchEvidenceRecord[] = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
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
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${record.evidenceId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");
}
