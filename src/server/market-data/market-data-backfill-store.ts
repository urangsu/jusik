import fs from "fs/promises";
import path from "path";
import type { DataEnvelope } from "@/domain/common/data-status";
import type {
  MarketBackfillCapability,
  MarketBackfillReport,
  MarketBackfillUniverse,
} from "@/domain/market/market-data-backfill";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";

export function getMarketBackfillLatestPath(): string {
  return resolveRuntimeDataPath("data", "market", "backfill", "latest.json");
}

export function getMarketBackfillHistoryPath(reportId: string): string {
  return resolveRuntimeDataPath("data", "market", "backfill", "history", `${reportId}.json`);
}

export function getMarketEnvelopePath(params: {
  universe: MarketBackfillUniverse;
  capability: MarketBackfillCapability;
  assetId: string;
}): string {
  const safeAssetId = params.assetId.replace(/[:/]/g, "_");
  const folder = params.capability === "quote" ? "quotes" : "ohlcv";
  return resolveRuntimeDataPath("data", "market", folder, params.universe, `${safeAssetId}.json`);
}

import crypto from "crypto";

export async function saveMarketEnvelope(params: {
  path: string;
  envelope: DataEnvelope<unknown>;
  universe?: string;
  assetId?: string;
  capability?: string;
}): Promise<void> {
  const { path: filePath, envelope, universe, assetId, capability } = params;
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const output: any = { ...envelope };

  if (capability === "ohlcv" || filePath.includes("/ohlcv/")) {
    const bars = (envelope.value as any[]) || [];
    output.bars = bars;
    output.assetId = assetId || (envelope as any).assetId || "";
    output.universeId = universe || (envelope as any).universeId || "";

    if (!output.dataVersionId) {
      output.dataVersionId = `dv_${crypto.createHash("sha256").update(JSON.stringify(bars)).digest("hex").slice(0, 16)}`;
    }
    if (!output.asOfDate) {
      output.asOfDate = bars.length ? bars.reduce((max, b) => (b.date > max ? b.date : max), bars[0].date) : null;
    }
    if (!output.effectiveAt) {
      output.effectiveAt = new Date().toISOString();
    }
    if (!output.ingestedAt) {
      output.ingestedAt = new Date().toISOString();
    }
  }

  await writeAtomic(filePath, JSON.stringify(output, null, 2));
}

export async function saveMarketBackfillReport(report: MarketBackfillReport): Promise<void> {
  const latestPath = getMarketBackfillLatestPath();
  const historyPath = getMarketBackfillHistoryPath(report.id);
  await fs.mkdir(path.dirname(latestPath), { recursive: true });
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  const payload = JSON.stringify(report, null, 2);
  await writeAtomic(latestPath, payload);
  await writeAtomic(historyPath, payload);
}

export async function getLatestMarketBackfillReport(): Promise<MarketBackfillReport | null> {
  try {
    const raw = await fs.readFile(getMarketBackfillLatestPath(), "utf8");
    return JSON.parse(raw) as MarketBackfillReport;
  } catch {
    return null;
  }
}
