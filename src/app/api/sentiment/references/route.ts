import { NextRequest } from "next/server";
import { sentimentReferenceStore } from "@/server/sentiment/sentiment-reference-store";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  try {
    const references = await sentimentReferenceStore.getAllLatest();

    const envelope: DataEnvelope<typeof references> = {
      value: references,
      status: Object.keys(references).length > 0 ? "cached" : "insufficient_data",
      source: "Alternative.me & CNN Business (Reference Only)",
      sourceTier: "personal_fallback",
      warnings: ["unofficial"],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Sentiment Reference System",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
