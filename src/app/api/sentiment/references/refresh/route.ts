import { NextRequest } from "next/server";
import { fetchCnnFearGreed } from "@/server/sentiment/cnn-fear-greed-reference-client";
import { fetchCryptoFearGreed } from "@/server/sentiment/alternative-me-crypto-fng-client";
import { sentimentReferenceStore } from "@/server/sentiment/sentiment-reference-store";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.SENTIMENT_REFRESH_ROUTE_ENABLED,
    routeName: "sentiment/references/refresh",
  });
  if (guard) return guard;

  try {
    const cnn = await fetchCnnFearGreed();
    const crypto = await fetchCryptoFearGreed();

    await sentimentReferenceStore.saveSnapshot(cnn);
    await sentimentReferenceStore.saveSnapshot(crypto);

    const result = { cnn, crypto };

    const envelope: DataEnvelope<typeof result> = {
      value: result,
      status: "real_time",
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
