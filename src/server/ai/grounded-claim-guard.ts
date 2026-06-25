import { AiGroundedClaim } from "@/domain/ai/structured-ai-output";

export function validateGroundedClaims(
  claims: AiGroundedClaim[]
): {
  valid: boolean;
  rejectedClaimIds: string[];
  reasons: string[];
} {
  const rejectedClaimIds: string[] = [];
  const reasons: string[] = [];

  for (const claim of claims) {
    const cid = claim.id || "unknown_claim";

    // 1. sourceId 존재
    if (!claim.sourceId || typeof claim.sourceId !== "string" || claim.sourceId.trim() === "") {
      rejectedClaimIds.push(cid);
      reasons.push(`Claim [${cid}]: sourceId가 누락되었거나 빈 문자열입니다.`);
      continue;
    }

    // 2. source 존재
    if (!claim.source || typeof claim.source !== "string" || claim.source.trim() === "") {
      rejectedClaimIds.push(cid);
      reasons.push(`Claim [${cid}]: source가 누락되었거나 빈 문자열입니다.`);
      continue;
    }

    // 3. status 존재
    if (!claim.status || typeof claim.status !== "string" || claim.status.trim() === "") {
      rejectedClaimIds.push(cid);
      reasons.push(`Claim [${cid}]: status가 누락되었거나 빈 문자열입니다.`);
      continue;
    }

    // 4. updatedAt 필드 존재
    if (claim.updatedAt === undefined) {
      rejectedClaimIds.push(cid);
      reasons.push(`Claim [${cid}]: updatedAt 필드가 정의되어 있지 않습니다.`);
      continue;
    }

    // 5. warnings 배열 존재
    if (!claim.warnings || !Array.isArray(claim.warnings)) {
      rejectedClaimIds.push(cid);
      reasons.push(`Claim [${cid}]: warnings가 배열이 아닙니다.`);
      continue;
    }

    // 6. status가 error/not_found/api_required 이면 claim riskLevel은 high 이상
    if (["error", "not_found", "api_required"].includes(claim.status)) {
      if (claim.riskLevel !== "high" && claim.riskLevel !== "blocked") {
        rejectedClaimIds.push(cid);
        reasons.push(
          `Claim [${cid}]: status가 '${claim.status}'인 경우 riskLevel은 'high' 또는 'blocked'여야 합니다 (현재: '${claim.riskLevel}').`
        );
        continue;
      }
    }
  }

  return {
    valid: rejectedClaimIds.length === 0,
    rejectedClaimIds,
    reasons,
  };
}
