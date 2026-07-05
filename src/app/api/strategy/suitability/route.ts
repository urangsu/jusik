import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { strategySuitabilityService } from "@/server/strategy/strategy-suitability-service";
import { DataEnvelope } from "@/domain/common/data-status";
import { StrategySuitability } from "@/domain/strategy/strategy-suitability";
import { StrategyAgreementLabel } from "@/domain/strategy/strategy-agreement-signal";

const VALID_LABELS = new Set<StrategyAgreementLabel>([
  "strong_watch",
  "watch",
  "neutral",
  "caution",
  "risk",
  "insufficient_data",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  const symbol = searchParams.get("symbol");
  const signalId = searchParams.get("signalId");
  const originalLabelParam = searchParams.get("originalLabel");
  const originalScoreParam = searchParams.get("originalScore");
  const asOf = searchParams.get("asOf");
  const universeId = searchParams.get("universeId") || undefined;

  if (!assetId || !symbol || !signalId || !asOf) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "StrategySuitabilityService",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "Missing required parameters: assetId, symbol, signalId, and asOf.",
    };
    return createSafeResponse(envelope, 400);
  }

  // Optional Client fallback inputs strict validation
  let originalLabel: StrategyAgreementLabel | null = null;
  if (originalLabelParam) {
    if (!VALID_LABELS.has(originalLabelParam as StrategyAgreementLabel)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "StrategySuitabilityService",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: "Invalid originalLabel value.",
      };
      return createSafeResponse(envelope, 400);
    }
    originalLabel = originalLabelParam as StrategyAgreementLabel;
  }

  let originalScore: number | null = null;
  if (originalScoreParam !== null && originalScoreParam !== undefined && originalScoreParam !== "") {
    const parsed = Number(originalScoreParam); // Strict Number() parse (no parseFloat)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "StrategySuitabilityService",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: "Invalid originalScore value (must be a finite number between 0 and 100).",
      };
      return createSafeResponse(envelope, 400);
    }
    originalScore = parsed;
  }

  try {
    const suitability = await strategySuitabilityService.calculateSuitability(
      assetId,
      symbol,
      signalId,
      originalLabel,
      originalScore,
      asOf,
      universeId
    );

    const isInsufficient = suitability.adjustedLabel === "insufficient_data";
    const envelopeStatus = isInsufficient ? "insufficient_data" : "real_time";

    const envelope: DataEnvelope<StrategySuitability> = {
      value: suitability,
      status: envelopeStatus,
      source: "StrategySuitabilityService",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "StrategySuitabilityService",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
