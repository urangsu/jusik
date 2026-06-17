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

## WO-010 Implementation Status

- **Signal Reliability Engine Integration**: Completed. The engine walks through the historical OHLCV data on-the-fly, calculates atomic signals and Momentum Factor v1, and generates `ForwardReturnRecord`s to evaluate statistical metrics (Spearman IC, ICIR, hit rate, and average excess return).
- **Bayesian Shrinkage & Calibrations**: Observed metrics are shrunk towards conservative priors (strength=30, hit rate=0.5, IC=0.0). Heuristic reliability scores are mapped to output weight multipliers.
- **Preview Only**: The `weightMultiplier` calculations and adjusted scores are strictly for preview (`RELIABILITY_WEIGHTING_ENABLED=false` by default) and do not overwrite base Momentum Factor v1 database values.
- **Downstream Connection**: These reliability results will serve as inputs to the WO-011 Horizon-Segmented Agreement system to scale signal fusion.
