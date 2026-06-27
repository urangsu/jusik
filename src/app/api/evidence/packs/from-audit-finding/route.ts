import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listAuditFindings } from "@/server/audit/audit-finding-store";
import { buildEvidencePackFromAuditFinding } from "@/server/evidence/evidence-pack-builder";
import { saveEvidencePack } from "@/server/evidence/evidence-pack-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

/**
 * POST /api/evidence/packs/from-audit-finding
 *
 * Body: { findingId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { findingId } = body;

    if (!findingId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "evidence_pack_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "findingId is required",
      };
      return createSafeResponse(envelope, 400);
    }

    const findings = await listAuditFindings();
    const finding = findings.find((f) => f.id === findingId);

    if (!finding) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "evidence_pack_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Audit finding ${findingId} not found`,
      };
      return createSafeResponse(envelope, 200);
    }

    // No related envelopes in this query, build with default empty list
    const pack = buildEvidencePackFromAuditFinding({ finding });
    await saveEvidencePack(pack);

    const envelope: DataEnvelope<EvidencePack> = {
      value: pack,
      status: "cached",
      source: "evidence_pack_builder",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: pack.createdAt,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "evidence_pack_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}
