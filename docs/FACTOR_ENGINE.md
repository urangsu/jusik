# FACTOR_ENGINE.md

팩터는 단일 재무비율이 아니라 atomic signal의 조합입니다.

* `FactorDefinition`은 `definitionId`와 `factorId`를 분리합니다.
* 같은 value factor라도 시장, 산업, 데이터 소스에 따라 여러 definition이 존재할 수 있습니다.
* `productionEligible` 기본값은 factory를 통해 `false`로 강제합니다.
* Factor Health는 IC/ICIR, turnover, stability, crowding 검증 없이는 `active`가 될 수 없습니다.

## Atomic Signal

Atomic signal은 팩터 구성 전의 원자 입력입니다.

- rawValue는 원천 수치입니다.
- normalizedValue, percentile, zScore는 market + universe scope 안에서만 계산합니다.
- null, NaN, Infinity는 0으로 바꾸지 않습니다.
- `normalizationScope`는 어떤 시장, 유니버스, 섹터, 방법으로 정규화됐는지 기록합니다.

## FactorDefinition

`FactorDefinition`은 다음 역할을 가집니다.

- `definitionId`: 구체 구현 버전. 예: `value_kr_financial_pbr_roe`.
- `factorId`: 경제적 팩터 그룹. 예: `value`.
- `components`: atomic signal id, weight, half-life, direction.
- `sectorNeutralize`: 섹터 평균을 제거할지 여부.
- `capNeutralize`: 시가총액 효과를 줄일지 여부.
- `countryNeutralize`: 국가/시장 효과를 분리할지 여부.
- `orthogonalizeAgainst`: 중복 베팅을 줄이기 위해 잔차화할 팩터 목록.
- `productionEligible`: 기본 false.

`createResearchOnlyFactorDefinition()` factory를 사용해 research-only 기본값을 강제합니다. 직접 객체 리터럴로 `productionEligible: true`를 넣는 것은 금지합니다.

## Factor Health Badge

- `insufficient`: sample size 부족, IC history 부족, 데이터 누락 과다.
- `active`: IC/ICIR, turnover, cost, stability 검증 통과.
- `mixed`: 일부 기간에서만 유효.
- `suppressed`: 최근 IC 악화 또는 long-short 성과 부진.
- `crowded`: 신호는 유효하나 crowding risk가 높은 상태.

Health badge는 production eligibility가 아닙니다. production 전환은 ResearchGate가 별도로 판단합니다.

## Market Scope

KR과 US를 같은 percentile 공간에서 정규화하지 않습니다. KOSPI200, KOSDAQ, SP500, NASDAQ100 같은 universe 별로 breakpoint를 분리합니다.

## Universe Snapshot Guard

Factor normalization must receive a `UniverseSnapshot`. Market-only normalization is not enough.

- `SEED_DEMO` is rejected for research normalization.
- observations outside `UniverseSnapshot.assetIds` are invalid.
- mixed KR/US universes are not eligible for factor validation.

## IC Calculation & Backtest Integration

- **Spearman Rank IC**: IC calculations for factor validation must strictly use Spearman rank correlation (converting scores and future returns to cross-sectional ranks before Pearson correlation). Pearson correlation on raw values is prohibited to avoid outlier distortion.
- **Backtest Veto Integration**: Any factor execution or backtest run that violates the minimum data constraints (average quality score < 50%, universe size < 3, or OOS windows < 2) will set veto reasons in the result. In such cases, UI components must suppress/placeholder the numeric metrics to prevent false trust.

---

## Signal Reliability Integration (WO-010)

The Signal Reliability Engine evaluates individual technical atomic signals (Ichimoku, Darvas, Turtle, Weinstein) and composite factors (Momentum Factor v1) to establish their statistical validity:

- **Atomic Signal Validation**: Computes historical Spearman Rank IC, Hit Rate, and Excess Returns for each atomic signal across horizons.
- **Dynamic Weight Adjustments (Preview)**: Reliability scores determine a preview multiplier (`weightMultiplier`) ranging from `0.5` to `1.5` (constrained to `[0.8, 1.1]` under cold start where $10 \le \text{sampleSize} < 30$, and masked below $10$).
- **No Direct Mutation**: Reliability-derived weights do not modify base database values of factors (`RELIABILITY_WEIGHTING_ENABLED=false` by default). The UI presents these weights side-by-side with original factor weights to maintain transparency and stability.


## Individual Signal IC Audit Integration (WO017-C)

Composite factor인 `momentum_v1`을 구성하는 각 atomic signal들의 실질적 예측 능력을 개별 검증합니다.
- **독립적 IC 감사**: 각 atomic signal과 OOS 미래 수익률 간의 Spearman Rank IC, ICIR 및 Hit Rate를 계산하여 예측 성능을 개별 진단합니다.
- **예측 경고 피드백**: IC가 음수이거나 미미함에도 높은 가중치가 할당된 상태 (`weak_signal_high_weight`, `negative_contribution` 등)를 탐지하여 리서처의 수동 팩터 가중치 재검토를 유도합니다.
