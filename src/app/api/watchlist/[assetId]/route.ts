import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { updateWatchlistItem, removeWatchlistItem, getWatchlistItemByAssetId } from "@/server/watchlist/watchlist-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { WatchlistItem } from "@/domain/watchlist/watchlist-item";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const guard = checkSettingsWriteEnabled({ routeName: "PATCH /api/watchlist/[assetId]" });
  if (guard) return guard;

  try {
    const rawAssetId = (await params).assetId;
    const assetId = decodeURIComponent(rawAssetId);

    const exists = await getWatchlistItemByAssetId(assetId);
    if (!exists) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "Watchlist Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Asset '${assetId}' not found in watchlist.`,
      };
      return createSafeResponse(envelope, 404);
    }

    const body = await req.json();
    const { tags, alertEnabled, reportInboxEnabled } = body;

    const updated = await updateWatchlistItem(assetId, {
      tags,
      alertEnabled,
      reportInboxEnabled,
    });

    const envelope: DataEnvelope<WatchlistItem> = {
      value: updated,
      status: "real_time",
      source: "Watchlist Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Watchlist Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const guard = checkSettingsWriteEnabled({ routeName: "DELETE /api/watchlist/[assetId]" });
  if (guard) return guard;

  try {
    const rawAssetId = (await params).assetId;
    const assetId = decodeURIComponent(rawAssetId);

    const exists = await getWatchlistItemByAssetId(assetId);
    if (!exists) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "Watchlist Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Asset '${assetId}' not found in watchlist.`,
      };
      return createSafeResponse(envelope, 404);
    }

    await removeWatchlistItem(assetId);

    const envelope: DataEnvelope<null> = {
      value: null,
      status: "real_time",
      source: "Watchlist Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: `Asset '${assetId}' successfully removed from watchlist.`,
    };
    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Watchlist Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
