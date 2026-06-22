import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listIndividualSignalIcResults } from "@/server/audit/individual-signal-ic-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { IndividualSignalIcResult } from "@/domain/audit/individual-signal-ic-result";
import fs from "fs/promises";
import { getIndividualSignalIcLatestPath } from "@/server/audit/individual-signal-ic-store-paths";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const universeId = (searchParams.get("universeId") as any) || undefined;
    const signalId = searchParams.get("signalId") || undefined;
    const horizon = (searchParams.get("horizon") as any) || undefined;

    // Check if the latest file exists
    const latestPath = getIndividualSignalIcLatestPath();
    let fileExists = true;
    try {
      await fs.access(latestPath);
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      const envelope: DataEnvelope<IndividualSignalIcResult[]> = {
        value: [],
        status: "not_found",
        message: "No individual signal IC audit results found.",
        source: "Individual Signal IC API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope);
    }

    const results = await listIndividualSignalIcResults({
      universeId,
      signalId,
      horizon,
    });

    const envelope: DataEnvelope<IndividualSignalIcResult[]> = {
      value: results,
      status: "cached",
      source: "Individual Signal IC API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Individual Signal IC API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
