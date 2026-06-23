import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { addWatchlistItem, listWatchlistItems } from "@/server/watchlist/watchlist-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { WatchlistItem } from "@/domain/watchlist/watchlist-item";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const market = searchParams.get("market") as "KR" | "US" | null;
    const tag = searchParams.get("tag") || undefined;
    const reportInboxEnabledParam = searchParams.get("reportInboxEnabled");

    // Validation
    if (market !== null && market !== "KR" && market !== "US") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid market parameter: must be 'KR' or 'US'",
      };
      return createSafeResponse(envelope, 400);
    }

    if (reportInboxEnabledParam !== null && reportInboxEnabledParam !== "true" && reportInboxEnabledParam !== "false") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Watchlist Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Invalid reportInboxEnabled parameter: must be 'true' or 'false'",
      };
      return createSafeResponse(envelope, 400);
    }

    const reportInboxEnabled = reportInboxEnabledParam !== null ? reportInboxEnabledParam === "true" : undefined;

    const items = await listWatchlistItems({
      market: market || undefined,
      tag,
      reportInboxEnabled,
    });

    const envelope: DataEnvelope<WatchlistItem[]> = {
      value: items,
      status: "cached",
      source: "Watchlist Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
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

export async function POST(req: NextRequest) {
  const guard = checkSettingsWriteEnabled({ routeName: "POST /api/watchlist" });
  if (guard) return guard;

  try {
    const body = await req.json();
    const { assetId, symbol, nameKo, nameEn, market, universeId, tags, alertEnabled, reportInboxEnabled } = body;

    if (!assetId || !symbol || !market || !universeId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "insufficient_data",
        source: "Watchlist Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Missing required fields: assetId, symbol, market, universeId",
      };
      return createSafeResponse(envelope, 400);
    }

    const item: WatchlistItem = {
      id: `wl_${assetId.replace(":", "_")}`,
      assetId,
      symbol,
      nameKo: nameKo || null,
      nameEn: nameEn || null,
      market,
      universeId,
      tags: tags || [],
      alertEnabled: alertEnabled !== undefined ? alertEnabled : true,
      reportInboxEnabled: reportInboxEnabled !== undefined ? reportInboxEnabled : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addWatchlistItem(item);

    const envelope: DataEnvelope<WatchlistItem> = {
      value: item,
      status: "real_time",
      source: "Watchlist Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope, 201);
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
    return createSafeResponse(envelope, err?.message?.includes("already") ? 409 : 500);
  }
}
