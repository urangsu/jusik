import { NextRequest } from "next/server";
import { regimeEngine } from "@/server/regime/regime-engine";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.MACRO_EVALUATION_ROUTE_ENABLED,
    routeName: "regime/evaluate",
  });
  if (guard) return guard;

  try {
    const snapshots = await regimeEngine.evaluateAll();

    const envelope: DataEnvelope<typeof snapshots> = {
      value: snapshots,
      status: "real_time",
      source: "Macro Regime Engine v1",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Macro Regime Engine v1",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
