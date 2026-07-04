import { NextRequest } from "next/server";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SymbolMasterRecord } from "@/domain/symbols/symbol-master";
import { importSymbolMasterRecords } from "@/server/symbols/symbol-master-store";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const records = Array.isArray(body?.records) ? (body.records as SymbolMasterRecord[]) : [];
  const result = await importSymbolMasterRecords(records);
  return createSafeResponse({
    value: result,
    status: "cached",
    source: "symbol_master_store",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: new Date().toISOString(),
  } satisfies DataEnvelope<{ imported: number }>);
}

export const dynamic = "force-dynamic";
