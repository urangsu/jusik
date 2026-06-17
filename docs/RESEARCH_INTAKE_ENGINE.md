# Research Intake Engine

## 목적

사용자가 붙여넣은 전략 설명, 영상 요약, 문서 내용을 기계가 실행 가능한 StrategySpec 초안으로 변환한다.

## 제한

Research Intake는 자동 전략 생성기가 아니다.  
LLM이 만든 draft는 반드시 human review를 거친다.

## Null Safety

명시적 weight, threshold, direction이 없으면 null로 둔다.  
LLM이 임의 confidence 숫자를 만들지 않는다.

## 필수 타입

```typescript
export type ProposedFactor = {
  factorId: string;
  direction: "higher_is_better" | "lower_is_better" | null;

  extractionEvidence: string;
  weightSuggested: number | null;
  thresholdSuggested: number | null;
  needsHumanReview: boolean;
};

export type StrategySpecDraft = {
  id: string;
  sourceDocumentId: string;
  extractedHypothesis: string;
  proposedFactors: ProposedFactor[];
  proposedUniverse: string | null;
  proposedRebalance: string | null;
  proposedRiskControls: string[];
  missingDesignQuestions: string[];
  status: "draft" | "needs_human_review" | "human_reviewed" | "backtest_queued";
};
```
