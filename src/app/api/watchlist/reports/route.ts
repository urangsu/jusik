import { NextRequest } from "next/server";
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
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const sourceType = searchParams.get("sourceType") || undefined;
    const since = searchParams.get("since") || undefined;
    const until = searchParams.get("until") || undefined;
    const includeHiddenParam = searchParams.get("includeHidden");

    // Validations
    if (status !== undefined && !["unread", "read", "archived", "hidden"].includes(status)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid status parameter. Must be one of: unread, read, archived, hidden",
      };
      return createSafeResponse(envelope, 400);
    }

    if (category !== undefined && !["filing", "internal_research", "signal", "backtest", "provider", "manual", "data_quality"].includes(category)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid category parameter.",
      };
      return createSafeResponse(envelope, 400);
    }

    if (severity !== undefined && !["info", "watch", "warning", "critical"].includes(severity)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid severity parameter.",
      };
      return createSafeResponse(envelope, 400);
    }

    if (sourceType !== undefined && !["opendart_filing", "alert_event", "backtest_result", "strategy_trial", "signal_postmortem", "provider_health", "manual_link", "manual_upload", "individual_signal_ic", "factor_correlation", "market_exposure"].includes(sourceType)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid sourceType parameter.",
      };
      return createSafeResponse(envelope, 400);
    }

    if (since !== undefined && isNaN(Date.parse(since))) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid since parameter: must be a valid ISO date string.",
      };
      return createSafeResponse(envelope, 400);
    }

    if (until !== undefined && isNaN(Date.parse(until))) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid until parameter: must be a valid ISO date string.",
      };
      return createSafeResponse(envelope, 400);
    }

    if (includeHiddenParam !== null && includeHiddenParam !== "true" && includeHiddenParam !== "false") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid includeHidden parameter: must be 'true' or 'false'.",
      };
      return createSafeResponse(envelope, 400);
    }

    const includeHidden = includeHiddenParam === "true";

    const items = await listWatchlistReportItems({
      assetId,
      symbol,
      status: status as WatchlistReportStatus,
      category: category as WatchlistReportCategory,
      severity: severity as WatchlistReportSeverity,
      sourceType: sourceType as WatchlistReportSourceType,
      since,
      until,
      includeHidden,
    });

    const envelope: DataEnvelope<WatchlistReportItem[]> = {
      value: items,
      status: "cached",
      source: "Watchlist Report Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Watchlist Report Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

