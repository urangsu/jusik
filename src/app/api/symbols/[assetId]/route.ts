import type { DataEnvelope } from "@/domain/common/data-status";
import type { SymbolMasterRecord } from "@/domain/symbols/symbol-master";
import { getSymbolMasterRecord } from "@/server/symbols/symbol-master-store";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(_request: Request, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params;
  const record = await getSymbolMasterRecord(assetId);
  return createSafeResponse({
    value: record,
    status: record ? "cached" : "not_found",
    source: "symbol_master_store",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: record?.updatedAt ?? null,
  } satisfies DataEnvelope<SymbolMasterRecord | null>);
}

export const dynamic = "force-dynamic";
