import type { DataEnvelope } from "@/domain/common/data-status";
import type { MarketBackfillReport } from "@/domain/market/market-data-backfill";
import { getLatestMarketBackfillReport } from "@/server/market-data/market-data-backfill-store";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET() {
  const report = await getLatestMarketBackfillReport();
  const envelope: DataEnvelope<MarketBackfillReport | null> = {
    value: report,
    status: report ? "cached" : "not_found",
    source: "market_backfill_store",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: report?.createdAt ?? null,
  };
  return createSafeResponse(envelope);
}

export const dynamic = "force-dynamic";
