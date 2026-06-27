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

export async function saveOutcomeRecord(record: SignalOutcomeJournalRecord): Promise<void> {
  const dir = getOutcomeDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = getOutcomePath(record.id);
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
          // ignore
        }
      }
    }

    return records;
  } catch {
    return [];
  }
}
