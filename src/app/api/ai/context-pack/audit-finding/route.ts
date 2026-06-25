import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listAuditFindings } from "@/server/audit/audit-finding-store";
import { buildAuditFindingContextPack } from "@/server/ai/ai-context-pack-builder";
import { AiContextPack } from "@/domain/ai/structured-ai-output";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "id 파라미터가 누락되었습니다.",
        source: "Audit Finding Context Pack API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const findings = await listAuditFindings();
    const finding = findings.find((f) => f.id === id);

    if (!finding) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        message: `Finding '${id}'을 찾을 수 없습니다.`,
        source: "Audit Finding Context Pack API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 404);
    }

    const contextPack = buildAuditFindingContextPack(finding);

    const envelope: DataEnvelope<AiContextPack> = {
      value: contextPack,
      status: "cached",
      source: "audit_finding_context_pack_builder",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: finding.calculatedAt || finding.detectedAt || new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      message: err.message || "서버 오류가 발생했습니다.",
      source: "Audit Finding Context Pack API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
    };
    return createSafeResponse(envelope, 500);
  }
}
