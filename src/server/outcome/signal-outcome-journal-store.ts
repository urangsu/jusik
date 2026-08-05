import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "../storage/runtime-store-root";
import { writeAtomic } from "../storage/atomic-write";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

function getOutcomeDir(): string {
  return resolveRuntimeDataPath("data", "outcome-journals");
}

function getOutcomePath(id: string): string {
  return resolveRuntimeDataPath("data", "outcome-journals", `${id}.json`);
}

/**
 * Persist an outcome record.
 *
 * Immutability rule:
 * - A record with the same `id` and identical content is a no-op (idempotent).
 * - A record with the same `id` but different content is rejected with an error.
 *   Observation must always create a new ID (higher revision).
 */
export async function saveOutcomeRecord(record: SignalOutcomeJournalRecord): Promise<void> {
  const dir = getOutcomeDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = getOutcomePath(record.id);

  // Immutability guard: reject conflicting writes
  try {
    const existing = await fs.readFile(filePath, "utf-8");
    const existingRecord = JSON.parse(existing) as SignalOutcomeJournalRecord;
    const existingJson = JSON.stringify(existingRecord);
    const incomingJson = JSON.stringify(record);
    if (existingJson !== incomingJson) {
      throw new Error(
        `Immutability violation: outcome record ${record.id} already exists with different content. ` +
          `Create a new revision instead of overwriting.`,
      );
    }
    // Identical content — idempotent, no write needed
    return;
  } catch (err: unknown) {
    // If the file does not exist, proceed with write
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      // Re-throw any other error (including immutability violations)
      throw err;
    }
  }

  const payload = JSON.stringify(record, null, 2);
  await writeAtomic(filePath, payload);
}

export async function getOutcomeRecord(id: string): Promise<SignalOutcomeJournalRecord | null> {
  const filePath = getOutcomePath(id);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as SignalOutcomeJournalRecord;
  } catch {
    return null;
  }
}

export async function listOutcomeRecords(query?: {
  subjectId?: string;
  subjectType?: string;
}): Promise<SignalOutcomeJournalRecord[]> {
  const dir = getOutcomeDir();
  try {
    const files = await fs.readdir(dir);
    const records: SignalOutcomeJournalRecord[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(dir, file);
        try {
          const data = await fs.readFile(filePath, "utf-8");
          const record = JSON.parse(data) as SignalOutcomeJournalRecord;

          let matches = true;
          if (query?.subjectId && record.subjectId !== query.subjectId) {
            matches = false;
          }
          if (query?.subjectType && record.subjectType !== query.subjectType) {
            matches = false;
          }

          if (matches) {
            records.push(record);
          }
        } catch {
          // ignore corrupt files
        }
      }
    }

    return records;
  } catch {
    return [];
  }
}

/**
 * Returns only the latest revision for each `rootOutcomeId`.
 * Use this when the UI needs one record per logical outcome.
 */
export async function listLatestOutcomeRecords(query?: {
  subjectId?: string;
  subjectType?: string;
}): Promise<SignalOutcomeJournalRecord[]> {
  const all = await listOutcomeRecords(query);
  const latestByRoot = new Map<string, SignalOutcomeJournalRecord>();
  for (const record of all) {
    const existing = latestByRoot.get(record.rootOutcomeId);
    if (!existing || record.revision > existing.revision) {
      latestByRoot.set(record.rootOutcomeId, record);
    }
  }
  return Array.from(latestByRoot.values());
}
