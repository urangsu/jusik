import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listFactorCorrelationResults } from "@/server/audit/factor-correlation-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { FactorCorrelationResult } from "@/domain/audit/factor-correlation-result";
import fs from "fs/promises";
import { getFactorCorrelationLatestPath } from "@/server/audit/factor-correlation-store-paths";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const universeId = (searchParams.get("universeId") as any) || undefined;
    const factorId = searchParams.get("factorId") || undefined;
    const severity = (searchParams.get("severity") as any) || undefined;
    const method = (searchParams.get("method") as any) || undefined;

    // Validate parameters
    if (universeId && universeId !== "KOSPI_SAMPLE" && universeId !== "SP500_SAMPLE") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid universeId query parameter.",
        source: "Factor Correlation API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (severity && !["ok", "warn", "danger", "insufficient_sample", "not_available"].includes(severity)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid severity query parameter.",
        source: "Factor Correlation API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (method && !["pearson", "spearman"].includes(method)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Invalid method query parameter.",
        source: "Factor Correlation API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    // Check if the latest file exists
    const latestPath = getFactorCorrelationLatestPath();
    let fileExists = true;
    try {
      await fs.access(latestPath);
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      const envelope: DataEnvelope<FactorCorrelationResult[]> = {
        value: [],
        status: "not_found",
        message: "No factor correlation audit results found. Please run audit first.",
        source: "Factor Correlation API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope);
    }

    const results = await listFactorCorrelationResults({
      universeId,
      factorId,
      severity,
      method,
    });

    const envelope: DataEnvelope<FactorCorrelationResult[]> = {
      value: results,
      status: "cached",
      source: "Factor Correlation API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Factor Correlation API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
