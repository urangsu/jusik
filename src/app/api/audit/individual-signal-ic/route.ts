import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listIndividualSignalIcResults } from "@/server/audit/individual-signal-ic-store";
import { DataEnvelope } from "@/domain/common/data-status";
import {
  IndividualSignalIcResult,
  IndividualSignalIcSeverity,
} from "@/domain/audit/individual-signal-ic-result";
import fs from "fs/promises";
import { getIndividualSignalIcLatestPath } from "@/server/audit/individual-signal-ic-store-paths";

const VALID_UNIVERSES = ["KOSPI_SAMPLE", "SP500_SAMPLE"];
const VALID_HORIZONS = ["1w", "1m", "3m", "forward_5d", "forward_20d", "forward_60d"];
const VALID_SEVERITIES = [
  "strong_positive",
  "weak_positive",
  "neutral",
  "weak_negative",
  "strong_negative",
  "insufficient_sample",
  "not_available",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const universeId = searchParams.get("universeId") || undefined;
    const signalId = searchParams.get("signalId") || undefined;
    const horizon = searchParams.get("horizon") || undefined;
    const severity = searchParams.get("severity") || undefined;

    // Validate parameters
    if (universeId && !VALID_UNIVERSES.includes(universeId)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid universeId query parameter.",
        source: "Individual Signal IC API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (horizon && !VALID_HORIZONS.includes(horizon)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid horizon query parameter.",
        source: "Individual Signal IC API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (severity && !VALID_SEVERITIES.includes(severity)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid severity query parameter.",
        source: "Individual Signal IC API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

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
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope);
    }

    const results = await listIndividualSignalIcResults({
      universeId: universeId as any,
      signalId,
      horizon: horizon as any,
      severity: severity as IndividualSignalIcSeverity,
    });

    const envelope: DataEnvelope<IndividualSignalIcResult[]> = {
      value: results,
      status: "cached",
      source: "Individual Signal IC API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Individual Signal IC API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
