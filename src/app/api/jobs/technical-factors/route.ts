import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { runTechnicalFactorJob } from "@/server/factors/technical-factor-job";
import { DataEnvelope } from "@/domain/common/data-status";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.TECHNICAL_FACTOR_JOB_ROUTE_ENABLED,
    routeName: "technical-factors",
  });
  if (guard) return guard;

  try {
    let universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE" = "KOSPI_SAMPLE";
    try {
      const body = await request.json();
      if (body.universeId === "SP500_SAMPLE" || body.universeId === "KOSPI_SAMPLE") {
        universeId = body.universeId;
      }
    } catch {
      const { searchParams } = new URL(request.url);
      const param = searchParams.get("universeId");
      if (param === "SP500_SAMPLE" || param === "KOSPI_SAMPLE") {
        universeId = param as any;
      }
    }

    const summary = await runTechnicalFactorJob(universeId);

    const envelope: DataEnvelope<any> = {
      value: summary,
      status: "real_time",
      source: "Local Job Runner",
      sourceTier: "manual_import",
      warnings: ["none"],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Local Job Runner",
      sourceTier: "manual_import",
      warnings: ["none"],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
