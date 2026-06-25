import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";
import type { StructuredAiOutput, AiGroundedClaim } from "@/domain/ai/structured-ai-output";

const REQUIRED_DISCLAIMERS: Record<string, string> = {
  audit_finding_explanation: "본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다.",
  strategy_trial_explanation: "본 내용은 백테스트 및 전략 시도 기록의 설명이며 운용 성과를 보장하지 않습니다.",
  signal_reliability_explanation: "본 내용은 신호 신뢰도 진단이며 종목 추천이 아닙니다.",
  filing_explanation: "본 내용은 공시 요약 보조 설명이며 원문 확인이 필요합니다.",
};

export function createMockStructuredAiOutput(input: {
  promptInput: AiPromptInput;
  mode?: "safe" | "forbidden_wording" | "ungrounded_claim" | "missing_disclaimer";
}): StructuredAiOutput {
  const mode = input.mode || "safe";
  const { promptInput } = input;
  const intent = promptInput.intent;

  // 1. Generate base claims from allowedClaimSourceIds and contextPack sourceRefs
  const claims: AiGroundedClaim[] = promptInput.contextPack.sourceRefs.map((ref, idx) => {
    return {
      id: `claim_${ref.sourceId || idx}`,
      text: `[Grounded Fact] ${ref.source} 데이터에 따르면 해당 리스크 식별 항목(${ref.sourceId})은 정상 범위에 있습니다.`,
      sourceType: ref.sourceType as any,
      sourceId: ref.sourceId,
      source: ref.source,
      status: ref.status as any,
      updatedAt: ref.updatedAt,
      warnings: ref.warnings,
      riskLevel: ["error", "not_found", "api_required"].includes(ref.status) ? "high" : "low",
    };
  });

  // If there are no claims in context pack, provide at least one to prevent missing claims block
  if (claims.length === 0) {
    const fallbackSourceId = promptInput.allowedClaimSourceIds[0] || "unknown_source";
    claims.push({
      id: "claim_fallback",
      text: `[Grounded Fact] 해당 항목(${fallbackSourceId})에 대한 분석이 완료되었습니다.`,
      sourceType: "audit_finding",
      sourceId: fallbackSourceId,
      source: "Audit findings system",
      status: "cached",
      updatedAt: new Date().toISOString(),
      warnings: [],
      riskLevel: "low",
    });
  }

  // 2. Limitations with freshness update limitations if needed
  const limitations = ["본 분석은 특정 팩터 및 과거 시점의 데이터를 기반으로 한 분석 결과로 한계를 가집니다."];
  const hasNullUpdatedAt = claims.some((c) => c.updatedAt === null);
  if (hasNullUpdatedAt) {
    limitations.push("일부 데이터의 업데이트 시간 정보가 유실되어 최신성(freshness) 확인이 불가능합니다.");
  }

  // 3. Disclaimers
  const requiredDisclaimers: string[] = [];
  const requiredDisc = REQUIRED_DISCLAIMERS[intent];

  if (mode !== "missing_disclaimer" && requiredDisc) {
    requiredDisclaimers.push(requiredDisc);
  }

  // Add dummy disclaimers to ensure it's not empty
  if (requiredDisclaimers.length === 0 && mode !== "missing_disclaimer") {
    requiredDisclaimers.push("본 결과는 일반적인 정보 제공 목적이며 최종 의사결정은 투자자 본인의 몫입니다.");
  }

  // 4. Content Strings
  const title = `진단 리포트 설명 [${intent}]`;
  let summary = `감사 Finding(${promptInput.contextPack.id})에 대한 팩터 및 시장 노출 분석 결과 요약본입니다.`;

  // 5. Apply Mode deviations
  if (mode === "forbidden_wording") {
    summary += " 이 전략을 강력 추천하며 매수 타이밍입니다. 절대 놓치면 안 됩니다. 수익 보장해 드립니다.";
  }

  if (mode === "ungrounded_claim") {
    // Make one claim ungrounded
    if (claims.length > 0) {
      claims[0].sourceId = "";
      claims[0].source = "";
    }
  }

  return {
    id: `mock_out_${promptInput.contextPack.id}_${Date.now()}`,
    intent,
    title,
    summary,
    claims,
    limitations,
    requiredDisclaimers,
    blockedTerms: [],
    isBlocked: false,
    blockReasons: [],
    generatedAt: new Date().toISOString(),
    engineVersion: "1.0.0-mock",
  };
}
