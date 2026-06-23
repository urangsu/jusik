import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listWatchlistReportItems } from "@/server/watchlist/watchlist-report-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { WatchlistReportItem, WatchlistReportStatus, WatchlistReportCategory, WatchlistReportSeverity } from "@/domain/watchlist/watchlist-report-item";
import { WatchlistReportSourceType } from "@/domain/watchlist/watchlist-report-source";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("assetId") || undefined;
    const symbol = searchParams.get("symbol") || undefined;
    const status = searchParams.get("status") as WatchlistReportStatus | undefined;
    const category = searchParams.get("category") as WatchlistReportCategory | undefined;
    const severity = searchParams.get("severity") as WatchlistReportSeverity | undefined;
    const sourceType = searchParams.get("sourceType") as WatchlistReportSourceType | undefined;
    const since = searchParams.get("since") || undefined;
    const until = searchParams.get("until") || undefined;
    const includeHidden = searchParams.get("includeHidden") === "true";

    const items = await listWatchlistReportItems({
      assetId,
      symbol,
      status,
      category,
      severity,
      sourceType,
      since,
      until,
      includeHidden,
    });

    const envelope: DataEnvelope<WatchlistReportItem[]> = {
      value: items,
      status: "cached",
      source: "Watchlist Report Store",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Watchlist Report Store",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
