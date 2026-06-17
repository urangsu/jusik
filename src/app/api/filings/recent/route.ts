import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../server/security/safe-api-response";
import { getRecentFilings } from "../../../../server/filings/filing-event-store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stockCode = searchParams.get("stockCode") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

  try {
    const list = await getRecentFilings({
      stockCode,
      limit,
    });

    return createSafeResponse({
      value: list,
      status: "cached",
      source: "Filing Event Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return createSafeResponse({
      value: null,
      status: "error",
      source: "Filing Event Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    }, 500);
  }
}

export const dynamic = "force-dynamic";
