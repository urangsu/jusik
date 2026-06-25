export type AiExplanationGoldenCase = {
  id: string;
  findingId?: string;

  mode: "safe" | "forbidden_wording" | "ungrounded_claim" | "missing_disclaimer";

  expectedBlocked: boolean;
  expectedBlockedTerms?: string[];
  expectedBlockReasonIncludes?: string[];

  description: string;
};

export const GOLDEN_EXPLANATION_CASES: AiExplanationGoldenCase[] = [
  {
    id: "golden_safe_explanation",
    mode: "safe",
    expectedBlocked: false,
    description: "정상 감사 설명: 차단되지 않아야 함 (Safe)",
  },
  {
    id: "golden_forbidden_wording",
    mode: "forbidden_wording",
    expectedBlocked: true,
    expectedBlockedTerms: ["매수", "추천"],
    expectedBlockReasonIncludes: ["금지 단어"],
    description: "금지 문구 감지: 매수/추천 포함 시 차단되어야 함",
  },
  {
    id: "golden_ungrounded_claim",
    mode: "ungrounded_claim",
    expectedBlocked: true,
    expectedBlockReasonIncludes: ["sourceId"],
    description: "출처 미정의 클레임: sourceId 누락 시 차단되어야 함",
  },
  {
    id: "golden_missing_disclaimer",
    mode: "missing_disclaimer",
    expectedBlocked: true,
    expectedBlockReasonIncludes: ["필수 면책 조항"],
    description: "면책 조항 누락: 필수 면책 조항 누락 시 차단되어야 함",
  },
];
