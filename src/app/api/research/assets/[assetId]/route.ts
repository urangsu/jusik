import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getResearchDiagnosticData } from "@/server/research/research-workspace-service";
import { getSymbolMasterRecord } from "@/server/symbols/symbol-master-store";
import type { DataEnvelope } from "@/domain/common/data-status";

type RouteParams = {
  params: Promise<{ assetId: string }> | { assetId: string };
};

// Canonical assetId format: KR_\d+ or US_[A-Z.]+
const CANONICAL_ASSET_ID_RE = /^(KR_\d+|US_[A-Z][A-Z0-9.]*)$/;
// ISO date format YYYY-MM-DD
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function errorEnvelope(
  errorCode: string,
  message: string
): DataEnvelope<null> {
  return {
    value: null,
    status: "error",
    source: "research_workspace_api",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: null,
    message: `[${errorCode}] ${message}`,
  } as DataEnvelope<null>;
}

/**
 * GET /api/research/assets/[assetId]
 *
 * Required query parameters:
 *   - asOfDate: YYYY-MM-DD (must not be in the future)
 *   - universeId: non-empty string (e.g. KOSPI_SAMPLE, SP500_SAMPLE)
 *
 * Returns ResearchDiagnosticData wrapped in DataEnvelope.
 * HTTP 400: invalid input
 * HTTP 404: assetId not found in Symbol Master
 * HTTP 200 with status=insufficient_data: valid input but no research data
 * HTTP 500: internal error
 */
export async function GET(request: NextRequest, props: RouteParams) {
  try {
    const params = await props.params;
    const { assetId } = params;
    const { searchParams } = new URL(request.url);

    const asOfDate = searchParams.get("asOfDate") ?? "";
    const universeId = searchParams.get("universeId") ?? "";

    // ── Input validation ────────────────────────────────────────────────────

    // 1. Canonical assetId format
    if (!CANONICAL_ASSET_ID_RE.test(assetId)) {
      return createSafeResponse(
        errorEnvelope(
          "invalid_research_request",
          `assetId "${assetId}" is not in canonical format (KR_\${digits} or US_\${ticker}).`
        ),
        400
      );
    }

    // 2. asOfDate required, valid format, not in the future
    if (!asOfDate) {
      return createSafeResponse(
        errorEnvelope("invalid_research_request", "asOfDate query parameter is required (YYYY-MM-DD)."),
        400
      );
    }
    if (!DATE_RE.test(asOfDate)) {
      return createSafeResponse(
        errorEnvelope("invalid_research_request", `asOfDate "${asOfDate}" is not in YYYY-MM-DD format.`),
        400
      );
    }
    const today = new Date().toISOString().slice(0, 10);
    if (asOfDate > today) {
      return createSafeResponse(
        errorEnvelope("invalid_research_request", `asOfDate "${asOfDate}" is in the future.`),
        400
      );
    }

    // 3. universeId required
    if (!universeId.trim()) {
      return createSafeResponse(
        errorEnvelope(
          "invalid_research_request",
          "universeId query parameter is required. Example: ?universeId=KOSPI_SAMPLE"
        ),
        400
      );
    }

    // 4. Asset must exist in Symbol Master
    const symbolRecord = await getSymbolMasterRecord(assetId).catch(() => null);
    if (!symbolRecord) {
      return createSafeResponse(
        errorEnvelope("asset_not_found", `Asset "${assetId}" not found in Symbol Master.`),
        404
      );
    }

    // ── Delegate to service ─────────────────────────────────────────────────
    const result = await getResearchDiagnosticData({
      assetId,
      asOfDate,
      universeId,
    });

    return createSafeResponse(result, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return createSafeResponse(errorEnvelope("internal_error", message), 500);
  }
}
