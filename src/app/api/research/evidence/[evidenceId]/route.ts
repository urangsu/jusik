import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getEvidenceRecord } from "@/server/research/research-evidence-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";

type RouteParams = {
  params: Promise<{ evidenceId: string }> | { evidenceId: string };
};

/**
 * GET /api/research/evidence/[evidenceId]
 *
 * Returns a ResearchEvidenceRecord for the given evidence ID.
 * HTTP 404: evidence record not found (never fabricated)
 * HTTP 200 with status=insufficient_data: ID is valid but record unavailable
 * HTTP 500: internal error
 */
export async function GET(_req: NextRequest, props: RouteParams) {
  try {
    const { evidenceId } = await props.params;

    if (!evidenceId || typeof evidenceId !== "string" || !evidenceId.trim()) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "research_evidence_api",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "evidenceId is required.",
      };
      return createSafeResponse(envelope, 400);
    }

    const record = await getEvidenceRecord(evidenceId);

    if (!record) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "insufficient_data",
        source: "research_evidence_api",
        sourceTier: "manual_import",
        warnings: ["manual_import_required"],
        updatedAt: null,
        message: `Evidence record "${evidenceId}" not found. It may not have been imported yet.`,
      };
      return createSafeResponse(envelope, 404);
    }

    // Map ResearchEvidenceRecord.sourceTier to SourceUsagePolicy
    const sourceTierMap: Record<string, "official" | "licensed_free" | "free_limited" | "personal_fallback" | "manual_import"> = {
      official_exchange: "official",
      official_government: "official",
      official_regulator: "official",
      licensed_commercial: "licensed_free",
      personal_research: "personal_fallback",
      manual_import: "manual_import",
    };

    const envelope: DataEnvelope<ResearchEvidenceRecord> = {
      value: record,
      status: "cached",
      source: "research_evidence_api",
      sourceTier: sourceTierMap[record.sourceTier] ?? "manual_import",
      warnings: [],
      updatedAt: record.retrievedAt,
    };
    return createSafeResponse(envelope, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "research_evidence_api",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message,
    };
    return createSafeResponse(envelope, 500);
  }
}
