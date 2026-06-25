import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listAuditFindings } from "@/server/audit/audit-finding-store";
import { DataEnvelope } from "@/domain/common/data-status";
import {
  AuditFinding,
  AuditFindingSourceType,
  AuditFindingScope,
  AuditFindingSeverity,
} from "@/domain/audit/audit-finding";

const VALID_SOURCES = [
  "individual_signal_ic",
  "factor_correlation",
  "market_exposure",
  "signal_postmortem",
  "strategy_trial",
];

const VALID_SCOPES = [
  "asset",
  "universe",
  "strategy",
  "trial",
  "signal",
  "factor_pair",
];

const VALID_SEVERITIES = ["info", "watch", "warning", "critical"];
const VALID_UNIVERSES = ["KOSPI_SAMPLE", "SP500_SAMPLE"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get("sourceType") || undefined;
    const scope = searchParams.get("scope") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const universeId = searchParams.get("universeId") || undefined;
    const strategyId = searchParams.get("strategyId") || undefined;
    const trialId = searchParams.get("trialId") || undefined;
    const signalId = searchParams.get("signalId") || undefined;

    // Validate parameters
    if (sourceType && !VALID_SOURCES.includes(sourceType)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid sourceType parameter.",
        source: "Audit Finding API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (scope && !VALID_SCOPES.includes(scope)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid scope parameter.",
        source: "Audit Finding API",
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
        message: "Invalid severity parameter.",
        source: "Audit Finding API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (universeId && !VALID_UNIVERSES.includes(universeId)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid universeId parameter.",
        source: "Audit Finding API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const results = await listAuditFindings({
      sourceType: sourceType as AuditFindingSourceType,
      scope: scope as AuditFindingScope,
      severity: severity as AuditFindingSeverity,
      universeId: universeId as any,
      strategyId,
      trialId,
      signalId,
    });

    const envelope: DataEnvelope<AuditFinding[]> = {
      value: results,
      status: "cached",
      source: "Audit Finding API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Audit Finding API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
