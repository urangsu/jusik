import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { updateWatchlistReportStatus } from "@/server/watchlist/watchlist-report-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { WatchlistReportItem, WatchlistReportStatus } from "@/domain/watchlist/watchlist-report-item";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = checkSettingsWriteEnabled({ routeName: "PATCH /api/watchlist/reports/[id]/status" });
  if (guard) return guard;

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status: WatchlistReportStatus };

    if (!status || !["unread", "read", "archived", "hidden"].includes(status)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "insufficient_data",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Invalid or missing status: ${status}`,
      };
      return createSafeResponse(envelope, 400);
    }

    const updated = await updateWatchlistReportStatus(id, status);

    if (!updated) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "Watchlist Report Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Report item with ID '${id}' not found.`,
      };
      return createSafeResponse(envelope, 404);
    }

    const envelope: DataEnvelope<WatchlistReportItem> = {
      value: updated,
      status: "real_time",
      source: "Watchlist Report Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope, 200);
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
