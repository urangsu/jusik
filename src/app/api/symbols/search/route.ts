import { NextRequest } from "next/server";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SymbolSearchResult } from "@/domain/symbols/symbol-master";
import { searchSymbolMaster } from "@/server/symbols/symbol-master-store";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const result = await searchSymbolMaster(query);
  return createSafeResponse({
    value: result,
    status: "cached",
    source: "symbol_master_store",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: new Date().toISOString(),
  } satisfies DataEnvelope<SymbolSearchResult>);
}

export const dynamic = "force-dynamic";
