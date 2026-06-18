# Backtest Engine Specification & Methodology

> [!WARNING]
> **기능 검증용 목적 명시**  
> 이 백테스트 엔진은 운용 성과 검증이 아닌 **기능 검증(Function Verification)**을 목적으로 설계되었습니다.  
> 수정주가(adjusted price), 과거 유니버스 구성원 정보(historical universe membership), 정교한 거래일 캘린더가 미반영된 상태이므로, 본 백테스트 결과를 실제 투자 판단의 근거로 사용해서는 안 됩니다.

---

## 1. Walk-Forward 방법론

과거 성과 분석 시 흔히 발생하는 과적합(Overfitting)을 방지하기 위해 **Walk-Forward 교차 검증** 구조를 강제합니다.

- **훈련 구간 (Train Period)**: 기술적 지표 및 팩터 값을 생성하는 구간입니다. (최소 60 영업일)
- **평가 구간 (Test Period / Out-Of-Sample)**: 훈련 구간 직후에 연달아 시작하는 테스트 구간입니다. (최소 20 영업일)
- **슬라이딩 윈도우**: 평가 구간의 길이만큼 훈련 및 평가 윈도우를 시간 순서대로 뒤로 밀며 테스트를 반복 실행합니다.
- **OOS 결과 취합**: 최종 성과 지표(Mean IC, Cumulative Return, Max Drawdown 등)는 오직 각 윈도우의 **OOS 평가 구간 성과**만을 연결하여 집계합니다. Train 구간의 성과는 절대로 최종 성과에 포함될 수 없습니다.

---

## 2. Look-Ahead Bias (선행 편향) 방지 계약

과거 데이터를 참조할 때 미래의 정보를 미리 알고 거래를 시작하는 Bias를 방지하기 위해 다음 계약을 런타임 및 타입 레벨에서 엄격히 유지합니다.

- **`signalDate` (신호일)**: 기술적 지표가 연산된 기준일 ($T$)입니다.
- **`entryDate` (진입일)**: 거래를 실행하는 기준일 ($T+1$)입니다.
- **계약**: `entryDate > signalDate`가 반드시 만족되어야 합니다. 당일 장 마감 후에야 확정되는 신호를 바탕으로 당일 종가에 진입할 수 없으며, 반드시 그 다음 영업일에 진입하도록 연산합니다.
- **위반 시 조치**: `assertNoLookAheadBias()` 헬퍼가 런타임에 이를 검증하며, 계약 위반 시 즉시 예외를 발생(throw)시켜 시뮬레이션을 중단시킵니다.

---

## 3. 정보 계수 (IC) 계산: Spearman Rank Correlation

지표의 예측력을 평가하기 위해 단순 피어슨 상관계수(Pearson correlation)가 아닌 **스피어만 순위 상관계수(Spearman rank correlation)**를 계산합니다.

- 팩터 스코어의 cross-sectional 순위(rank)와 이후 OOS 수익률의 순위(rank) 간의 상관계수를 측정합니다.
- 이상치(Outlier)에 덜 왜곡되며 지표의 상대적 순위 예측력을 정확하게 반영합니다.
- 샘플 수가 5개 미만인 평가 구간에 대해서는 신뢰성 확보를 위해 IC 값을 계산하지 않고 `null`로 처리합니다.

---

## 4. 거래 비용 및 슬리피지 모델

시장별(KR/US) 제도적 차이를 반영한 비용 처리를 지원합니다.

### KR 시장 (한국)
- **수수료**: 1.5 bps (`0.015%`)
- **증권거래세**: 매도 시에만 20 bps (`0.20%`) 추가 적용
- **슬리피지**: 10 bps (`0.10%`) 고정 적용

### US 시장 (미국)
- **수수료**: 1.0 bps (`0.01%`)
- **증권거래세**: 없음 (`0.00%`)
- **슬리피지**: 5 bps (`0.05%`) 고정 적용

---

## 5. 결과 신뢰도 제한 조건 (Veto Reasons)

다음 조건 중 하나라도 충족되면 백테스트 결과의 신뢰도가 손상된 것으로 판단하여, UI 상에서 최종 성과 지표(수익률, IC 등)의 노출을 차단(placeholder 처리)합니다.

- **`insufficient_universe`**: 유니버스 내 참여 자산 수가 3개 미만인 경우
- **`low_data_quality`**: 유효 신호 비율(Data Quality Score)의 평균이 50% 미만인 경우
- **`insufficient_oos_windows`**: Walk-forward 평가 윈도우 수가 2개 미만인 경우

---

## 6. 신호 재현성 검증 (Signal Consistency)

로컬 팩터 스토어에 저장된 신호 값과 백테스트 실행 시점에 실시간으로 재산출된 신호 값 간의 오차를 검증합니다.
오차가 $0.5$ 점을 초과하는 불일치가 발견되는 경우 일관성 실패 경고가 발생하며, 일관성 검사 API(`/api/backtest/consistency-check`)를 통해 전체 검증 현황을 확인할 수 있습니다.

---

## 7. 신호 신뢰도 평가 엔진과의 연동 (Integration with Signal Reliability Engine)

WO-010에서 구현된 신호 신뢰도 평가 엔진(Signal Reliability Engine)은 백테스트 엔진의 Out-of-Sample(OOS) 검증 원칙과 통계 집계 기법(Spearman IC, Hit Rate, Excess Return)을 활용하여 다음과 같이 연동됩니다.

- **역사적 OOS 성과 연산**: 백테스트 시뮬레이션 과정에서 도출된 개별 자산의 forward return과 해당 시점의 원자 신호 점수(Signal Score) 간의 관계를 시계열/단면적으로 집계합니다.
- **베이지안 축소(Bayesian Shrinkage)**: 표본 크기(`sampleSize`)가 작을 경우, 관찰된 IC 및 Hit Rate를 사전 분포(Prior: IC = 0, Hit Rate = 0.5)로 수축시켜 통계적 노이즈를 제어합니다.
- **가중치 보정 프리뷰(Weight Multiplier Preview)**: 백테스트를 통해 검증된 신뢰도 점수를 기반으로 `weightMultiplier`를 계산하여 모멘텀 팩터(Momentum Factor v1)의 가중치 보정 프리뷰를 제공합니다. 단, 백테스트의 기능 검증 특성에 따라 기본 데이터베이스 값은 자동으로 변경되지 않고 프리뷰 화면에서만 제공됩니다.

---

## 8. WO-017-A 하드닝: 백테스트 신뢰도 강화 (Validity Hardening)

WO-017-A에서 다음 항목들이 추가되었습니다. 자세한 정책은 [`docs/BACKTEST_VALIDITY_POLICY.md`](./BACKTEST_VALIDITY_POLICY.md)를 참고하십시오.

### 8.1 복리 수익률 (Compounded Total Return)

기존의 단순 합산 방식에서 `equity * (1 + r_t) - 1` 복리 방식으로 변경되었습니다.

### 8.2 포트폴리오 교체율 (Turnover)

연속 OOS 구간 간의 포트폴리오 가중치 변화를 측정합니다.

```
turnover_t = 0.5 * Σ |w_t(asset) - w_{t-1}(asset)|
```

첫 번째 구간은 `null`이며, 이후 평균을 `aggregated.turnover`로 보고합니다.

### 8.3 벤치마크 및 초과 수익률 (Benchmark & Excess Return)

| 유니버스 | 벤치마크 |
|---|---|
| KOSPI_SAMPLE | KR:KOSPI |
| SP500_SAMPLE | US:SPX |

벤치마크 가격이 없으면 `null`로 처리하고 `missing_benchmark` 경고를 발생시킵니다.

### 8.4 Backtest Validity Report

모든 결과에 유효성 등급(`BacktestValidityLevel`)이 부여됩니다.

- `invalid`: OOS 없음 또는 품질 < 30%
- `insufficient_data`: 유효 구간 < 2개 또는 품질 < 50%
- `functional_check_only`: SAMPLE 또는 수정주가 미적용 (현재 최대 등급)
- `research_candidate`: 실 유니버스 + 벤치마크 + OOS ≥ 3개

### 8.5 Selected Positions 상세

각 OOS 구간의 `selectedPositions` 배열에 포지션별 순위, 팩터 스코어, gross/net 수익률, 비용 상세, 데이터 소스 경고가 포함됩니다.

### 8.6 팩터 스코어 → IC 연결

`icPairs`에 실제 `signalScore`를 전달하고, null이 아닌 유효 페어만 Spearman IC 계산에 사용합니다.
유효 페어 수는 `validIcPairCount`로 각 OOS 구간에 기록됩니다.

### 8.7 CLI 전략 유효성 검사

`scripts/backtest/run-backtest.ts`에서 `--strategy`가 `momentum_v1_long_only`가 아닌 경우 명시적 에러로 실패 처리합니다.
