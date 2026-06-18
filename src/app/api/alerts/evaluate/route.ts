import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { alertEvaluator } from "@/server/alerts/alert-evaluator";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";
import { DataEnvelope } from "@/domain/common/data-status";

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.ALERT_EVALUATION_ROUTE_ENABLED,
    routeName: "alerts/evaluate",
  });
  if (guard) return guard;

  try {
    let universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE" | undefined;
    let ruleTypes: any[] | undefined;

    try {
      const body = await request.json();
      if (body.universeId === "KOSPI_SAMPLE" || body.universeId === "SP500_SAMPLE") {
        universeId = body.universeId;
      }
      if (Array.isArray(body.ruleTypes)) {
        ruleTypes = body.ruleTypes;
      }
    } catch {
      const { searchParams } = new URL(request.url);
      const param = searchParams.get("universeId");
      if (param === "KOSPI_SAMPLE" || param === "SP500_SAMPLE") {
        universeId = param;
      }
    }

    const summary = await alertEvaluator.evaluateAlerts({ universeId, ruleTypes });

    const envelope: DataEnvelope<typeof summary> = {
      value: summary,
      status: "cached",
      source: "Alert Rule Engine",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Alert Rule Engine",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
