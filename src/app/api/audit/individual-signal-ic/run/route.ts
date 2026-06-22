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
    const horizon = body.horizon || undefined;

    if (universeId !== "KOSPI_SAMPLE" && universeId !== "SP500_SAMPLE") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid universeId",
        source: "Individual Signal IC Run API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const results = await auditIndividualSignalIc({
      universeId,
      signalId,
      horizon,
    });

    await saveIndividualSignalIcResults(results);

    const envelope: DataEnvelope<IndividualSignalIcResult[]> = {
      value: results,
      status: "cached",
      source: "Individual Signal IC Run API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Individual Signal IC Run API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
