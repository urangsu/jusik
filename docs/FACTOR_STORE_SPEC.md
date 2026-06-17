# Factor Store Spec

## 목적
Factor Store는 K-Terminal 내에서 계산된 모든 퀀트 팩터 값 및 메타 정의를 관리하는 저장소 사양입니다.

## 필수 타입

```typescript
export type FactorValue = {
  id: string;
  assetId: string;
  factorId: string;

  fiscalPeriodEnd: string | null;
  dataAvailableAt: string;
  calculatedAt: string;

  rawValue: number | null;
  zScore: number | null;
  percentile: number | null;
  rank: number | null;

  universeId: string;
  sectorId: string | null;

  sourceIds: string[];
  dataStatus: DataStatus;
  dataQualityScore: number;

  factorVersion: string;
  engineVersion: string;
};

export type FactorDefinition = {
  factorId: string;
  version: string;
  displayName: {
    ko: string;
    en: string;
  };
  formulaHash: string;
  inputRequirements: string[];
  horizon: SignalHorizon;
  createdAt: string;
};
```

## 필수 함수

```typescript
getFactorAsOf(assetId, factorId, asOfDate)
```

## 규칙

백테스트와 라이브 신호는 반드시 같은 조회 함수를 사용한다.
