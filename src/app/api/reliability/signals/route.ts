import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getLatestReliabilitySummary } from "@/server/reliability/reliability-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { ReliabilitySummary } from "@/domain/reliability/reliability-summary";
import { SignalReliabilityRecord } from "@/domain/reliability/signal-reliability-record";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const universe = searchParams.get("universe") || "KOSPI_SAMPLE";
  const horizon = searchParams.get("horizon");
  const signalId = searchParams.get("signalId");

  if (universe !== "KOSPI_SAMPLE" && universe !== "SP500_SAMPLE") {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "not_supported",
      source: "Reliability API",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: `Universe [${universe}] not supported. Use KOSPI_SAMPLE or SP500_SAMPLE.`,
    };
    return createSafeResponse(envelope, 400);
  }

  try {
    const summary = await getLatestReliabilitySummary(universe);

    if (!summary) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "Reliability API",
        sourceTier: "personal_fallback",
        warnings: [],
        updatedAt: null,
        message: `No reliability summary found for universe [${universe}]. Try running calculate first.`,
      };
      return createSafeResponse(envelope, 404);
    }

    // Apply filters if provided
    if (horizon || signalId) {
      let filteredRecords = [...summary.records];
      if (horizon) {
        filteredRecords = filteredRecords.filter((r) => r.horizon === horizon);
      }
      if (signalId) {
        filteredRecords = filteredRecords.filter((r) => r.signalId === signalId);
      }

      const envelope: DataEnvelope<SignalReliabilityRecord[]> = {
        value: filteredRecords,
        status: "cached",
        source: "Reliability Store",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: summary.calculatedAt,
      };
      return createSafeResponse(envelope);
    }

    // Return entire summary
    const envelope: DataEnvelope<ReliabilitySummary> = {
      value: summary,
      status: "cached",
      source: "Reliability Store",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: summary.calculatedAt,
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Reliability API",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
