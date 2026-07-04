import type { DataEnvelope } from "@/domain/common/data-status";
import type {
  MarketBackfillAsset,
  MarketBackfillAssetResult,
  MarketBackfillReport,
  MarketBackfillRequest,
} from "@/domain/market/market-data-backfill";
import { marketDataService } from "@/server/services/market-data-service";
import {
  getMarketEnvelopePath,
  saveMarketBackfillReport,
  saveMarketEnvelope,
} from "./market-data-backfill-store";
import { saveMarketBackfillManifest } from "./market-backfill-manifest-store";
import { getRuntimeStoreRoot } from "@/server/storage/runtime-store-root";

const ENGINE_VERSION = "market-backfill-v1";

const UNIVERSE_ASSETS: Record<MarketBackfillRequest["universe"], MarketBackfillAsset[]> = {
  KOSPI_SAMPLE: [
    { assetId: "KR_005930", symbol: "005930", market: "KR" },
    { assetId: "KR_000660", symbol: "000660", market: "KR" },
    { assetId: "KR_035420", symbol: "035420", market: "KR" },
  ],
  SP500_SAMPLE: [
    { assetId: "US_AAPL", symbol: "AAPL", market: "US" },
    { assetId: "US_MSFT", symbol: "MSFT", market: "US" },
    { assetId: "US_NVDA", symbol: "NVDA", market: "US" },
  ],
};

function normalizeRequest(input: MarketBackfillRequest): Required<MarketBackfillRequest> {
  return {
    universe: input.universe,
    capability: input.capability,
    range: input.range ?? "1M",
    interval: input.interval ?? "1D",
  };
}

function hasData(envelope: DataEnvelope<unknown>): boolean {
  return envelope.value !== null && ["real_time", "delayed", "eod", "cached", "stale"].includes(envelope.status);
}

async function runAssetBackfill(
  request: Required<MarketBackfillRequest>,
  asset: MarketBackfillAsset,
): Promise<MarketBackfillAssetResult> {
  try {
    const envelope =
      request.capability === "quote"
        ? await marketDataService.getQuote(asset.symbol, asset.market)
        : await marketDataService.getOhlcv({
            symbol: asset.symbol,
            region: asset.market,
            range: request.range,
            interval: request.interval,
          });

    const storedPath = getMarketEnvelopePath({
      universe: request.universe,
      capability: request.capability,
      assetId: asset.assetId,
    });
    await saveMarketEnvelope({ path: storedPath, envelope: envelope as DataEnvelope<unknown> });

    return {
      assetId: asset.assetId,
      symbol: asset.symbol,
      market: asset.market,
      capability: request.capability,
      envelopeStatus: envelope.status,
      dataAvailable: hasData(envelope as DataEnvelope<unknown>),
      storedPath,
      warnings: envelope.warnings,
      message: envelope.message ?? null,
    };
  } catch (error) {
    return {
      assetId: asset.assetId,
      symbol: asset.symbol,
      market: asset.market,
      capability: request.capability,
      envelopeStatus: "error",
      dataAvailable: false,
      storedPath: null,
      warnings: [],
      message: error instanceof Error ? error.message : "Market backfill failed.",
    };
  }
}

export async function runMarketDataBackfill(input: MarketBackfillRequest): Promise<MarketBackfillReport> {
  const request = normalizeRequest(input);
  const assets = UNIVERSE_ASSETS[request.universe];
  const results: MarketBackfillAssetResult[] = [];

  for (const asset of assets) {
    results.push(await runAssetBackfill(request, asset));
  }

  const errorCount = results.filter((result) => result.envelopeStatus === "error").length;
  const dataAvailableCount = results.filter((result) => result.dataAvailable).length;
  const apiRequiredCount = results.filter((result) => result.envelopeStatus === "api_required").length;
  const status = errorCount === results.length ? "failed" : dataAvailableCount === results.length ? "completed" : "partial";
  const createdAt = new Date().toISOString();

  const report: MarketBackfillReport = {
    id: `market_backfill_${Date.now()}`,
    request,
    status,
    totalCount: results.length,
    dataAvailableCount,
    apiRequiredCount,
    errorCount,
    results,
    generatedDataRoot: getRuntimeStoreRoot(),
    createdAt,
    engineVersion: ENGINE_VERSION,
  };

  await saveMarketBackfillReport(report);
  await saveMarketBackfillManifest({
    manifestId: `market_backfill_manifest_${Date.now()}`,
    backfillReportId: report.id,
    universe: request.universe,
    capability: request.capability,
    generatedDataRoot: report.generatedDataRoot,
    generatedPaths: results.flatMap((result) => (result.storedPath ? [result.storedPath] : [])),
    productionStore: false,
    createdAt,
  });
  return report;
}
