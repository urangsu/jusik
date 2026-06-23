import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { aggregateWatchlistReports } from "@/server/watchlist/watchlist-report-aggregator";
import { DataEnvelope } from "@/domain/common/data-status";
import { WatchlistReportItem } from "@/domain/watchlist/watchlist-report-item";

export async function POST(req: NextRequest) {
  // Guard write operation
  const guard = checkSettingsWriteEnabled({ routeName: "POST /api/watchlist/reports/aggregate" });
  if (guard) return guard;

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty, which is fine
    }

    const { assetId, sourceTypes, since, dryRun } = body;

    const result = await aggregateWatchlistReports({
      assetId,
      sourceTypes,
      since,
      dryRun: dryRun === true,
    });

    const envelope: DataEnvelope<{
      created: number;
      skippedDuplicate: number;
      items: WatchlistReportItem[];
    }> = {
      value: result,
      status: "real_time",
      source: "Watchlist Report Aggregator",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Watchlist Report Aggregator",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
