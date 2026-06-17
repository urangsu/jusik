import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../server/security/safe-api-response";
import { checkJobRouteEnabled } from "../../../../server/security/job-route-guard";
import { syncRecentDisclosures } from "../../../../server/filings/disclosure-sync-service";

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.OPENDART_JOB_ROUTE_ENABLED,
    routeName: "opendart/sync",
  });
  if (guard) return guard;

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body
    }

    const result = await syncRecentDisclosures({
      universeId: body.universeId,
      stockCode: body.stockCode,
      corpCode: body.corpCode,
      beginDate: body.beginDate,
      endDate: body.endDate,
      disclosureType: body.disclosureType,
      finalReportOnly: body.finalReportOnly,
    });

    return createSafeResponse(result);
  } catch (err: any) {
    return createSafeResponse({
      value: null,
      status: "error",
      source: "OpenDART Sync API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    }, 500);
  }
}

export const dynamic = "force-dynamic";
