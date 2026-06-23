import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listWatchlistReportItems } from "@/server/watchlist/watchlist-report-store";
import { DataEnvelope } from "@/domain/common/data-status";

type WatchlistUnreadCount = {
  unreadCount: number;
  warningCount: number;
  criticalCount: number;
  latestDetectedAt: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const unreadItems = await listWatchlistReportItems({
      status: "unread",
    });

    let warningCount = 0;
    let criticalCount = 0;
    let latestDetectedAt: string | null = null;

    for (const item of unreadItems) {
      if (item.severity === "warning") {
        warningCount++;
      } else if (item.severity === "critical") {
        criticalCount++;
      }
      if (!latestDetectedAt || item.detectedAt > latestDetectedAt) {
        latestDetectedAt = item.detectedAt;
      }
    }

    const value: WatchlistUnreadCount = {
      unreadCount: unreadItems.length,
      warningCount,
      criticalCount,
      latestDetectedAt,
    };

    const envelope: DataEnvelope<WatchlistUnreadCount> = {
      value,
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

export const dynamic = "force-dynamic";
