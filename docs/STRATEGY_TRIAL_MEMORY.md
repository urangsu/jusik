# Strategy Trial Memory

Strategy Trial Memory는 백테스트 및 리서치 단계에서 생성된 전략 변형(Variant)의 시도 이력을 영구 보관하고 추적하여, 특정 파라미터 조합의 과최적화와 데이터 스누핑(Data Snooping)을 방지하는 관리 체계이다.

---

## 1. 개요 및 목적

전략 개발 과정에서 백테스트 결과가 좋은 것만 골라 저장하면, 실제 성과는 나쁜데 과거 데이터에만 우연히 맞아떨어진 "생존 편향(Survivorship Bias)"과 "데이터 스누핑" 위험이 높아진다.
Strategy Trial Memory는 다음 목표를 달성한다:
- **전략 공동묘지(Strategy Graveyard)**: 실패했거나 성과가 낮아 기각(Rejected)된 조합, 혹은 데이터 부족 등으로 무효(Invalid) 처리된 시도까지 모두 보존한다.
- **중복 실험 차단**: 동일한 파라미터 해시(`parameterHash`)의 전략이 중복 등록되려 할 때 경고하고 다중검정(Multiple Testing) 횟수를 모니터링한다.
- **OOS(Out-of-Sample) 성과 보존**: 개별 OOS window의 실제 성과(observedMetrics)와 당시 선택된 포지션 정보를 저장하여 사후 검증의 기반을 마련한다.

---

## 2. 저장 구조 및 파일 위치

Strategy Trial Memory는 로컬 파일 기반의 이벤트 소싱 및 요약 스냅샷 방식으로 설계되었다.

```
data/strategy-trials/
├── events.json           # 전체 trial 등록/변경 이력을 보존하는 append-only 로그
├── latest.json           # 모든 trial의 최신 상태를 취합한 스냅샷 (조회 최적화)
└── by-id/
    ├── trial_123456.json # 개별 trial 상세 정보 (selectedPositions 정보 등 포함)
    └── ...
```

* `.gitignore`에 `data/strategy-trials/*` 형태로 등록되어 있으며, 빌드 아티팩트 및 로컬 전용 캐시로 취급된다.

---

## 3. 핵심 도메인 데이터 스키마

### StrategyTrialRecord
```typescript
export type StrategyTrialRecord = {
  id: string;                         // trial_로 시작하는 고유 ID
  strategyId: BacktestStrategy;       // 전략 계열 ID (예: "momentum_v1_long_only")
  variantId: string;                  // 파라미터 변형 ID (예: "win20_top5")
  strategyFamily: StrategyFamily;     // 전략 패밀리 (예: "momentum")
  thesisKo: string;                   // 전략 가설 설명 (한국어)
  hypothesis: string;                 // 예측 가설 상세
  parameters: Record<string, unknown>;// 입력 파라미터 맵
  parameterHash: string;              // 파라미터 정렬 후 생성한 중복 탐지용 해시
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  dataWindow: { startDate: string; endDate: string };
  backtestRunId: string | null;       // 연결된 백테스트 실행 ID
  observedMetrics: StrategyTrialObservedMetrics; // 백테스트 OOS 누적 성과 지표
  validationStatus: StrategyTrialStatus;         // draft | backtested | rejected | watch_candidate | frozen | retired | invalid
  validityLevel: BacktestValidityLevel | null;   // 백테스트 데이터 신뢰도 등급
  rejectionReason: string | null;     // 기각 사유
  biasWarnings: StrategyBiasWarning[]; // 편향 경고 목록 (survivorship_bias_possible, lookahead_bias_possible 등)
  failureConditionSummary: {          // 백테스트 실패/결손 사유 분류 요약
    hasInvalidBacktest: boolean;
    hasInsufficientData: boolean;
    hasMissingBenchmark: boolean;
    hasLowDataQuality: boolean;
    hasInsufficientIcPairs: boolean;
    hasPersonalFallback: boolean;
    hasSampleUniverseOnly: boolean;
    hasAdjustedPriceMissing: boolean;
    hasNoHistoricalUniverseMembership: boolean;
  };
  postmortemSummary: {                // 사후 분석 통계 요약 (Signal Postmortem 연계)
    signalPostmortemCount: number;
    failedPositionCount: number;
    positivePositionCount: number;
    negativePositionCount: number;
    missingPricePositionCount: number;
  };
  sourceBacktestResultPath: string | null;
  createdAt: string;
  updatedAt: string;
  engineVersion: string;
};
```

---

## 4. 데이터 스누핑 가드 (Data Snooping Guard)

1. **파라미터 해시 계산**:
   - 전략의 파라미터 맵의 키를 알파벳 순서로 정렬하여 JSON 문자열화한 뒤, 32비트 FNV-1a 또는 Murmur Hash 방식의 결정론적 해시 문자열을 생성한다.
2. **중복 감지 정책**:
   - `listStrategyTrialRecords()`를 통해 동일한 `strategyId`와 `parameterHash`를 가진 기록이 있는지 조회한다.
   - 백테스트 실행 시 이미 등록된 파라미터 조합이라면 새로운 Trial로 등록을 차단하거나, 기존 기록을 갱신하라는 안내를 CLI/API 수준에서 강제한다.
   - 단일 전략 계열 하에 등록된 고유 `parameterHash` 개수가 5개를 초과할 경우, 자동으로 `data_snooping_possible` 편향 경고를 바인딩하여 연구원에게 과최적화 위험을 경고한다.
