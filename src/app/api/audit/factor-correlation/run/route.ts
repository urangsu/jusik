import { NextRequest } from "next/server";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { auditAllFactorCorrelations } from "@/server/audit/factor-correlation-auditor";
import { saveFactorCorrelationResults } from "@/server/audit/factor-correlation-store";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";
import { FactorCorrelationResult } from "@/domain/audit/factor-correlation-result";

export async function POST(request: NextRequest) {
  const guardResponse = checkSettingsWriteEnabled({ routeName: "POST /api/audit/factor-correlation/run" });
  if (guardResponse) return guardResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const universeId = body.universeId || "KOSPI_SAMPLE";
    const method = body.method || "spearman";
    const startDate = body.startDate || undefined;
    const endDate = body.endDate || undefined;

    if (universeId !== "KOSPI_SAMPLE" && universeId !== "SP500_SAMPLE") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid universeId",
        source: "Factor Correlation Run API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (method !== "pearson" && method !== "spearman") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid method",
        source: "Factor Correlation Run API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const results = await auditAllFactorCorrelations({
      universeId,
      method,
      startDate,
      endDate,
    });

    await saveFactorCorrelationResults(results);

    const envelope: DataEnvelope<FactorCorrelationResult[]> = {
      value: results,
      status: "cached",
      source: "Factor Correlation Run API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Factor Correlation Run API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
