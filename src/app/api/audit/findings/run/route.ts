import { NextRequest } from "next/server";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { aggregateAuditFindings } from "@/server/audit/audit-finding-aggregator";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";
import { AuditFinding } from "@/domain/audit/audit-finding";

export async function POST(request: NextRequest) {
  const guardResponse = checkSettingsWriteEnabled({ routeName: "POST /api/audit/findings/run" });
  if (guardResponse) return guardResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const includeIc = body.includeIndividualSignalIc;
    const includeCorr = body.includeFactorCorrelation;
    const includeExposure = body.includeMarketExposure;

    if (includeIc !== undefined && typeof includeIc !== "boolean") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid includeIndividualSignalIc parameter.",
        source: "Audit Finding Run API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (includeCorr !== undefined && typeof includeCorr !== "boolean") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid includeFactorCorrelation parameter.",
        source: "Audit Finding Run API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (includeExposure !== undefined && typeof includeExposure !== "boolean") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid includeMarketExposure parameter.",
        source: "Audit Finding Run API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const { findings } = await aggregateAuditFindings({
      includeIndividualSignalIc: includeIc,
      includeFactorCorrelation: includeCorr,
      includeMarketExposure: includeExposure,
    });

    const envelope: DataEnvelope<AuditFinding[]> = {
      value: findings,
      status: "cached",
      source: "Audit Finding Run API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Audit Finding Run API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
