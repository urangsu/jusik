# Signal Ensemble Spec

## 원칙

진짜 앙상블은 고정 가중평균이 아니다.  
각 view의 과거 실적과 신뢰도를 추적해 가중치를 조정한다.

## Horizon Segmentation

단기, 중기, 장기를 분리한다.

예:
- 단기: 과열
- 중기: 중립
- 장기: 긍정

이 경우 최종 결론은 neutral이 아니라 cross-horizon tension이다.

## Applicability

적용 불가와 중립은 분리한다.  
적용 불가능한 view는 denominator에서 제외한다.

## View Reliability

Signal History를 기반으로 hit rate, average forward return, IC를 추적한다.  
샘플이 적을 때는 Bayesian shrinkage를 적용한다.

## 필수 타입

```typescript
export type HorizonSegmentedAgreement = {
  assetId: string;
  date: string;

  byHorizon: Record<SignalHorizon, {
    label: SignalLabel;
    weightedScore: number | null;
    participatingViews: string[];
  }>;

  crossHorizonTension: {
    detected: boolean;
    description: string | null;
  };
};

export type ViewApplicability = {
  viewId: string;
  assetId: string;
  applicable: boolean;
  reason: string | null;
};

export type ViewReliabilityRecord = {
  viewId: string;
  horizon: SignalHorizon;
  universeId: string;

  sampleSize: number;
  hitRate: number | null;
  avgForwardReturn: number | null;
  ic: number | null;

  priorSource: "backtest" | "live_tracking" | "none";
  priorWeight: number;
  calculatedAt: string;
};
```
