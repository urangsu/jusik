import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";
import { calculateSignalReliability } from "@/server/reliability/reliability-engine";
import { DataEnvelope } from "@/domain/common/data-status";
import { ReliabilitySummary } from "@/domain/reliability/reliability-summary";

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.RELIABILITY_JOB_ROUTE_ENABLED,
    routeName: "reliability/calculate",
  });
  if (guard) return guard;

  try {
    let universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE" = "KOSPI_SAMPLE";
    
    try {
      const body = await request.json();
      if (body.universeId === "SP500_SAMPLE") {
        universeId = "SP500_SAMPLE";
      }
    } catch {
      // Use default if body parsing fails
    }

    const summary = await calculateSignalReliability({ universeId });

    const envelope: DataEnvelope<ReliabilitySummary> = {
      value: summary,
      status: "cached",
      source: "Reliability Engine v1",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: summary.calculatedAt,
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Reliability Engine v1",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
