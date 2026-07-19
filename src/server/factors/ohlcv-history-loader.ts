import fs from "fs";
import { DataEnvelope } from "@/domain/common/data-status";
import { PriceBar } from "@/domain/prices/price-bar";
import { getOhlcvHistoryPath } from "../storage/storage-paths";
import type { MarketUniverseId } from "@/domain/universe/market-universe";

export type VersionedOhlcvEnvelope = DataEnvelope<PriceBar[]> & {
  assetId: string;
  universeId: MarketUniverseId;
  dataVersionId: string | null;
  asOfDate: string | null;
  effectiveAt: string | null;
  ingestedAt: string | null;
};

export type LoadVersionedOhlcvInput = {
  assetId: string;
  universeId: MarketUniverseId;
  asOfDate: string;
  knownAt: string;
};

export async function loadOhlcvHistory(
  universeId: string,
  assetId: string
): Promise<DataEnvelope<PriceBar[]>> {
  const filepath = getOhlcvHistoryPath(universeId, assetId);

  if (!fs.existsSync(filepath)) {
    return {
      value: null,
      status: "insufficient_data",
      source: "Local Filesystem",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: null,
      message: `OHLCV history file not found for asset ${assetId} in universe ${universeId}`,
    };
  }

  try {
    const raw = fs.readFileSync(filepath, "utf8");
    const data = JSON.parse(raw);

    return {
      value: data.bars || [],
      status: data.dataStatus || "cached",
      source: data.source || "Local Filesystem",
      sourceTier: data.sourceTier || "personal_fallback",
      warnings: data.warnings || ["unofficial", "personal_use_only"],
      updatedAt: data.updatedAt || null,
    };
  } catch (error: any) {
    return {
      value: null,
      status: "error",
      source: "Local Filesystem",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: null,
      message: `Failed to load or parse OHLCV history: ${error?.message || String(error)}`,
    };
  }
}

export async function loadVersionedOhlcvHistory(
  input: LoadVersionedOhlcvInput
): Promise<VersionedOhlcvEnvelope> {
  const { assetId, universeId, asOfDate, knownAt } = input;
  const filepath = getOhlcvHistoryPath(universeId, assetId);

  const unavailableEnvelope = (
    status: "insufficient_data" | "error",
    message: string
  ): VersionedOhlcvEnvelope => ({
    value: null,
    status,
    source: "Local Filesystem",
    sourceTier: "personal_fallback",
    warnings: ["unofficial"],
    updatedAt: null,
    message,
    assetId,
    universeId,
    dataVersionId: null,
    asOfDate: null,
    effectiveAt: null,
    ingestedAt: null,
  });

  if (!fs.existsSync(filepath)) {
    return unavailableEnvelope(
      "insufficient_data",
      `OHLCV file not found for asset ${assetId} in universe ${universeId}`
    );
  }

  let data: any;
  try {
    const raw = fs.readFileSync(filepath, "utf8");
    data = JSON.parse(raw);
  } catch (err: any) {
    return unavailableEnvelope(
      "error",
      `Failed to parse OHLCV file: ${err.message || String(err)}`
    );
  }

  // 1. Check version metadata fields
  if (
    data.dataVersionId === undefined ||
    data.effectiveAt === undefined ||
    data.ingestedAt === undefined
  ) {
    return unavailableEnvelope(
      "insufficient_data",
      "OHLCV history lacks version metadata (dataVersionId, effectiveAt, ingestedAt)."
    );
  }

  // 2. Ingestion timeline check
  if (data.ingestedAt !== null && data.ingestedAt > knownAt) {
    return unavailableEnvelope(
      "insufficient_data",
      `OHLCV data was ingested at ${data.ingestedAt}, which is after the point-in-time threshold of ${knownAt}.`
    );
  }

  // 3. Filter bars <= asOfDate
  const rawBars = data.bars || [];
  const filteredBars = rawBars.filter((bar: PriceBar) => bar.date <= asOfDate);

  // 4. Strict series validations
  const seenDates = new Set<string>();
  for (const bar of filteredBars) {
    // Match canonical assetId exactly (no implicit ":" to "_" translations allowed)
    if (bar.assetId !== assetId) {
      return unavailableEnvelope(
        "error",
        `Asset ID mismatch in bar: expected "${assetId}", got "${bar.assetId}".`
      );
    }

    if (seenDates.has(bar.date)) {
      return unavailableEnvelope(
        "error",
        `Duplicate trading date detected: "${bar.date}".`
      );
    }
    seenDates.add(bar.date);

    const { open, high, low, close, volume } = bar;
    if (
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      !Number.isFinite(volume)
    ) {
      return unavailableEnvelope(
        "error",
        `Non-finite numerical price/volume in bar for date "${bar.date}".`
      );
    }

    if (volume < 0) {
      return unavailableEnvelope(
        "error",
        `Negative volume detected in bar for date "${bar.date}": ${volume}.`
      );
    }

    if (high < low || high < open || high < close || low > open || low > close) {
      return unavailableEnvelope(
        "error",
        `Invalid OHLC relationship in bar for date "${bar.date}": open=${open}, high=${high}, low=${low}, close=${close}.`
      );
    }
  }

  return {
    value: filteredBars,
    status: data.dataStatus || "cached",
    source: data.source || "Local Filesystem",
    sourceTier: data.sourceTier || "personal_fallback",
    warnings: data.warnings || [],
    updatedAt: data.updatedAt || null,
    assetId,
    universeId,
    dataVersionId: data.dataVersionId,
    asOfDate: data.asOfDate || null,
    effectiveAt: data.effectiveAt || null,
    ingestedAt: data.ingestedAt || null,
  };
}
