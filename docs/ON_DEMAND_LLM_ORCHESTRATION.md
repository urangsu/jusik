# On-demand LLM Orchestration

## 원칙

LLM은 사용자가 명시적으로 요청할 때만 호출한다.  
LLM은 계산하지 않고 설명한다.

## 필수 요소

- AiContextPack
- requestHash
- budget ledger
- model tier router
- prompt version
- structured output
- GroundedClaim validation
- prohibited phrase guard
- response audit log

## 필수 타입

```typescript
export type GroundedClaim = {
  statement: string;
  sourceFieldPath: string;
  sourceValue: number | string;
};

export type AiExplanation = {
  answer: string;
  claims: GroundedClaim[];
  missingInputs: string[];
  dataWarnings: string[];
  confidence: "low" | "medium" | "high";
};
```

## 검증 원칙

본문 숫자를 정규식으로 검증하지 않는다.  
claims 배열의 sourceFieldPath와 sourceValue를 ContextPack과 대조한다.
