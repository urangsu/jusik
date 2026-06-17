import fs from "fs";
import { DataEnvelope } from "@/domain/common/data-status";
import { PriceBar } from "@/domain/prices/price-bar";
import { getOhlcvHistoryPath } from "../storage/storage-paths";

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
