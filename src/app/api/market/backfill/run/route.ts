import { NextRequest } from "next/server";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { MarketBackfillReport, MarketBackfillRequest } from "@/domain/market/market-data-backfill";
import { runMarketDataBackfill } from "@/server/market-data/market-data-backfill-runner";
import { createSafeResponse } from "@/server/security/safe-api-response";

function parseRequest(body: unknown): MarketBackfillRequest {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    universe: raw.universe === "KOSPI_SAMPLE" ? "KOSPI_SAMPLE" : "SP500_SAMPLE",
    capability: raw.capability === "quote" ? "quote" : "ohlcv",
    range: raw.range === "3M" || raw.range === "6M" || raw.range === "1Y" ? raw.range : "1M",
    interval: raw.interval === "1W" || raw.interval === "1M" ? raw.interval : "1D",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const report = await runMarketDataBackfill(parseRequest(body));
    const envelope: DataEnvelope<MarketBackfillReport> = {
      value: report,
      status: report.status === "failed" ? "error" : "cached",
      source: "market_backfill_runner",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report.createdAt,
    };
    return createSafeResponse(envelope);
  } catch (error) {
    return createSafeResponse({
      value: null,
      status: "error",
      source: "market_backfill_runner",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: error instanceof Error ? error.message : "Market backfill failed.",
    } satisfies DataEnvelope<null>, 500);
  }
}

export const dynamic = "force-dynamic";
