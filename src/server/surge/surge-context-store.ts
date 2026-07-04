import fs from "fs/promises";
import path from "path";
import type { SurgeContextRecord } from "@/domain/surge/surge-context";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";

function contextPath(): string {
  return resolveRuntimeDataPath("data", "surge", "context.json");
}

export async function saveSurgeContexts(records: SurgeContextRecord[]): Promise<void> {
  const filePath = contextPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await writeAtomic(filePath, JSON.stringify(records, null, 2));
}

export async function getSurgeContext(assetId: string): Promise<SurgeContextRecord | null> {
  try {
    const records = JSON.parse(await fs.readFile(contextPath(), "utf8")) as SurgeContextRecord[];
    return records.find((record) => record.assetId === assetId) ?? null;
  } catch {
    return null;
  }
}
