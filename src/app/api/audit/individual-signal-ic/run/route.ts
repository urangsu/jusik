import { NextRequest } from "next/server";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { auditIndividualSignalIc } from "@/server/audit/individual-signal-ic-auditor";
import { saveIndividualSignalIcResults } from "@/server/audit/individual-signal-ic-store";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";
import { IndividualSignalIcResult } from "@/domain/audit/individual-signal-ic-result";

export async function POST(request: NextRequest) {
  const guardResponse = checkSettingsWriteEnabled({ routeName: "POST /api/audit/individual-signal-ic/run" });
  if (guardResponse) return guardResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const universeId = body.universeId || "KOSPI_SAMPLE";
    const signalId = body.signalId || undefined;
    const bodyHorizon = body.horizon || undefined;
    const bodyHorizons = body.horizons || undefined;

    const VALID_HORIZONS = ["1w", "1m", "3m", "forward_5d", "forward_20d", "forward_60d"];

    const validateHorizon = (h: unknown) =>
      typeof h === "string" && VALID_HORIZONS.includes(h);

    if (bodyHorizon && !validateHorizon(bodyHorizon)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid horizon",
        source: "Individual Signal IC Run API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (Array.isArray(bodyHorizons) && bodyHorizons.some((h) => !validateHorizon(h))) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid horizons",
        source: "Individual Signal IC Run API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (universeId !== "KOSPI_SAMPLE" && universeId !== "SP500_SAMPLE") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid universeId",
        source: "Individual Signal IC Run API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    let targetHorizons: any[] = [undefined];
    if (bodyHorizon) {
      targetHorizons = [bodyHorizon];
    } else if (Array.isArray(bodyHorizons)) {
      targetHorizons = bodyHorizons;
    }

    const allResults: IndividualSignalIcResult[] = [];
    for (const h of targetHorizons) {
      const results = await auditIndividualSignalIc({
        universeId,
        signalId,
        horizon: h,
      });
      allResults.push(...results);
    }

    await saveIndividualSignalIcResults(allResults);

    const envelope: DataEnvelope<IndividualSignalIcResult[]> = {
      value: allResults,
      status: "cached",
      source: "Individual Signal IC Run API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Individual Signal IC Run API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
