# Strategy Registry Spec

## 목적

전략의 생성, 백테스트, 폐기, 활성화 이력을 모두 저장한다.

## Strategy Graveyard

실패한 전략과 파라미터 조합도 삭제하지 않는다.  
다중검정과 과최적화 위험을 추적하기 위해 필요하다.

## 필수 타입

```typescript
export type StrategyRegistryRecord = {
  strategySpecId: string;
  spec: StrategySpec;
  status: "draft" | "backtested" | "rejected" | "active" | "retired";
  rejectionReason?: string;
  allTrialResults: StrategyTrialRecord[];
  createdAt: string;
  updatedAt: string;
};

export type StrategyTrialRecord = {
  strategyId: string;
  observedSharpe: number | null;
  sampleLength: number;
  triedAt: string;
  status: "rejected" | "backtested" | "active" | "retired";
  notes?: string;
};
```
