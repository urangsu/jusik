import type { DataEnvelope } from "@/domain/common/data-status";
import type {
  EvidenceClaimType,
  EvidencePack,
  EvidenceSourceType,
} from "@/domain/evidence/evidence-pack";

export type EvidencePackFromDataEnvelopeInput<T> = {
  envelope: DataEnvelope<T>;
  subjectType: EvidencePack["subjectType"];
  subjectId: string;
  sourceType: EvidenceSourceType;
  sourceId: string;
  claimType?: EvidenceClaimType;
  createdAt?: string;
  engineVersion?: string;
};

function resolveFreshness(status: DataEnvelope<unknown>["status"]): EvidencePack["freshness"] {
  if (status === "real_time" || status === "delayed" || status === "eod" || status === "cached") return "fresh";
  if (status === "stale") return "stale";
  return "unknown";
}

export function buildEvidencePackFromDataEnvelope<T>(
  input: EvidencePackFromDataEnvelopeInput<T>,
): EvidencePack {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const hasValue = input.envelope.value !== null && input.envelope.value !== undefined;
  const missingEvidence: string[] = [];
  const blockedActions: string[] = [];
  const limitations: string[] = [];

  if (!hasValue) {
    missingEvidence.push(`${input.sourceType}:${input.sourceId}`);
  }

  if (input.envelope.status === "api_required") {
    blockedActions.push("provider_api_required");
    limitations.push(input.envelope.message ?? "Provider API key or connection is required.");
  }

  if (input.envelope.status === "error" || input.envelope.status === "rate_limited") {
    blockedActions.push(`provider_${input.envelope.status}`);
    if (input.envelope.message) limitations.push(input.envelope.message);
  }

  if (input.envelope.status === "not_supported") {
    blockedActions.push("provider_not_supported");
    if (input.envelope.message) limitations.push(input.envelope.message);
  }

  return {
    id: `evp_data_envelope_${input.sourceType}_${input.sourceId}_${Date.parse(createdAt) || Date.now()}`,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    evidenceRefs: [
      {
        id: `ref_${input.sourceType}_${input.sourceId}`,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        source: input.envelope.source,
        sourceTier: input.envelope.sourceTier,
        status: input.envelope.status,
        updatedAt: input.envelope.updatedAt,
        warnings: input.envelope.warnings,
      },
    ],
    asOf: input.envelope.updatedAt ?? createdAt,
    freshness: resolveFreshness(input.envelope.status),
    claimTypes: [input.claimType ?? "unknown"],
    missingEvidence,
    blockedActions,
    limitations,
    createdAt,
    engineVersion: input.engineVersion ?? "real-provider-smoke-v1",
  };
}
