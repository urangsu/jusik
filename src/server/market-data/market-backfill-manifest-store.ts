import fs from "fs/promises";
import path from "path";
import type { MarketBackfillManifest } from "@/domain/market/backfill-manifest";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";

function latestManifestPath(): string {
  return resolveRuntimeDataPath("data", "market", "backfill", "manifest.latest.json");
}

export async function saveMarketBackfillManifest(manifest: MarketBackfillManifest): Promise<void> {
  const filePath = latestManifestPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await writeAtomic(filePath, JSON.stringify(manifest, null, 2));
}

export async function getLatestMarketBackfillManifest(): Promise<MarketBackfillManifest | null> {
  try {
    return JSON.parse(await fs.readFile(latestManifestPath(), "utf8")) as MarketBackfillManifest;
  } catch {
    return null;
  }
}
