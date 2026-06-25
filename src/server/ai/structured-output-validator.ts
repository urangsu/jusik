import { StructuredAiOutput } from "@/domain/ai/structured-ai-output";
import { inspectForbiddenWording } from "./forbidden-wording-guard";
import { validateGroundedClaims } from "./grounded-claim-guard";

const REQUIRED_DISCLAIMERS: Record<string, string> = {
  audit_finding_explanation: "본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다.",
  strategy_trial_explanation: "본 내용은 백테스트 및 전략 시도 기록의 설명이며 운용 성과를 보장하지 않습니다.",
  signal_reliability_explanation: "본 내용은 신호 신뢰도 진단이며 종목 추천이 아닙니다.",
  filing_explanation: "본 내용은 공시 요약 보조 설명이며 원문 확인이 필요합니다.",
};

export function validateStructuredAiOutput(
  output: StructuredAiOutput
): StructuredAiOutput {
  const blockReasons: string[] = [];
  const blockedTermsSet = new Set<string>();

  // 1. title/summary/claims/limitations/requiredDisclaimers 필수 검증
  if (!output.title || typeof output.title !== "string" || output.title.trim() === "") {
    blockReasons.push("title이 누락되었거나 빈 문자열입니다.");
  }
  if (!output.summary || typeof output.summary !== "string" || output.summary.trim() === "") {
    blockReasons.push("summary가 누락되었거나 빈 문자열입니다.");
  }
  if (!output.claims || !Array.isArray(output.claims) || output.claims.length === 0) {
    blockReasons.push("claims가 누락되었거나 빈 배열입니다.");
  }
  if (!output.limitations || !Array.isArray(output.limitations) || output.limitations.length === 0) {
    blockReasons.push("limitations가 누락되었거나 빈 배열입니다.");
  }
  if (
    !output.requiredDisclaimers ||
    !Array.isArray(output.requiredDisclaimers) ||
    output.requiredDisclaimers.length === 0
  ) {
    blockReasons.push("requiredDisclaimers가 누락되었거나 빈 배열입니다.");
  }

  // 2. Grounded claims validator
  if (output.claims && Array.isArray(output.claims) && output.claims.length > 0) {
    const claimRes = validateGroundedClaims(output.claims);
    if (!claimRes.valid) {
      blockReasons.push(...claimRes.reasons);
    }

    // 3. Check for null updatedAt limitation requirement
    const hasNullUpdatedAt = output.claims.some((c) => c.updatedAt === null);
    if (hasNullUpdatedAt && output.limitations && Array.isArray(output.limitations)) {
      const hasFreshnessLimitation = output.limitations.some(
        (lim) =>
          lim.includes("업데이트") ||
          lim.includes("freshness") ||
          lim.includes("update time") ||
          lim.includes("시간")
      );
      if (!hasFreshnessLimitation) {
        blockReasons.push(
          "일부 데이터의 업데이트 시간이 누락되었으나 관련 제한사항(limitation)이 limitations에 명시되지 않았습니다."
        );
      }
    }
  }

  // 4. Intent-specific required disclaimers check
  const requiredDisc = REQUIRED_DISCLAIMERS[output.intent];
  if (requiredDisc) {
    const hasDisclaimer =
      output.requiredDisclaimers &&
      Array.isArray(output.requiredDisclaimers) &&
      output.requiredDisclaimers.some((d) => d.includes(requiredDisc));
    if (!hasDisclaimer) {
      blockReasons.push(
        `intent가 '${output.intent}'인 경우 필수 면책 조항('${requiredDisc}')이 requiredDisclaimers에 포함되어야 합니다.`
      );
    }
  }

  // 5. Forbidden wording check on all text fields
  const textsToCheck: string[] = [];
  if (output.title) textsToCheck.push(output.title);
  if (output.summary) textsToCheck.push(output.summary);
  if (output.claims && Array.isArray(output.claims)) {
    for (const c of output.claims) {
      if (c.text) textsToCheck.push(c.text);
    }
  }
  if (output.limitations && Array.isArray(output.limitations)) {
    textsToCheck.push(...output.limitations);
  }
  if (output.requiredDisclaimers && Array.isArray(output.requiredDisclaimers)) {
    textsToCheck.push(...output.requiredDisclaimers);
  }

  for (const text of textsToCheck) {
    const wordingRes = inspectForbiddenWording({ text });
    if (wordingRes.blocked) {
      for (const t of wordingRes.blockedTerms) {
        blockedTermsSet.add(t);
      }
      blockReasons.push(...wordingRes.reasons);
    }
  }

  const isBlocked = blockReasons.length > 0;
  const uniqueReasons = Array.from(new Set(blockReasons));

  return {
    ...output,
    isBlocked,
    blockedTerms: Array.from(blockedTermsSet),
    blockReasons: uniqueReasons,
  };
}
