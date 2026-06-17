# Signal Reliability Engine Specification & Methodology

> [!WARNING]
> **투자 판단 불가 및 경고 명시**  
> 신호 신뢰도(Signal Reliability) 지표는 과거 SAMPLE universe 데이터와 백테스트 OOS 결과를 토대로 산출한 기능 검증용 통계치입니다.  
> 실제 운용 수익률을 보장하거나 미래 실적을 보장하지 않으며, 투자 권유 또는 매수/매도 확정 추천이 아닙니다.

---

## 1. 목적

과거 백테스트 OOS(Out-Of-Sample) 평가 데이터를 바탕으로 각 **기술적 원자 신호(Atomic Signal)** 및 **종합 모멘텀 팩터(Momentum Factor v1)**의 통계적 유효성과 안정성을 정량적으로 평가하고, 사전 강도(Prior Strength)를 반영한 가중치 보정(Weight Multiplier)의 시뮬레이션 Preview를 제공합니다.

---

## 2. 입력 및 데이터 전처리

### 2.1 ForwardReturnRecord 구조
각 시점 $T$(신호 발생일)에서 측정된 신호 점수와 미래 수익률 쌍을 `ForwardReturnRecord` 형식으로 전달받아 평가를 진행합니다.

- `signalDate`: 신호 기준일 ($T$)
- `entryDate`: 거래 진입일 ($T+1$ 영업일)
- `signalScore`: 해당 시점의 신호 점수 ($-100$ ~ $+100$)
- `forwardReturn`: $T+1$부터 지정 만기(Horizon)까지의 순수익률 (단순 calendar 일 기준, 미래 가격 부족 시 `null`)
- `excessReturn`: $T+1$부터 만기까지 자산 수익률에서 시장(또는 유니버스) 평균 수익률을 차감한 초과수익률

---

## 3. 통계 지표 산출식

### 3.1 Spearman Rank IC & ICIR
- **Rank IC**: 특정 날짜 $t$에 유효한 전체 자산군에 대해, 신호 점수 순위와 만기 초과수익률 순위 간의 피어슨 상관계수(Pearson Correlation)를 계산하여 Spearman Rank IC를 산출합니다. 자산 수가 5개 미만인 일자는 제외됩니다.
- **Spearman IC Mean**: 산출된 일별 Rank IC의 산술평균입니다.
- **Spearman IC Std**: 일별 Rank IC의 표준편차입니다.
- **ICIR (Information Ratio)**: 신호 예측력의 일관성을 의미하며, 다음과 같이 산출됩니다:
  $$\text{ICIR} = \frac{\text{spearmanIcMean}}{\text{spearmanIcStd}} \quad (\text{단, Std} \neq 0)$$

### 3.2 Hit Rate (방향 일치성)
신호의 방향과 이후 수익률 방향이 일치한 비율을 의미합니다.
- `signalScore = 0`인 관측치는 예측 방향이 없으므로 계산에서 배제합니다.
- 초과수익률(`excessReturn`)이 있으면 우선적으로 기준 삼고, 누락 시 일반 순수익률(`forwardReturn`)을 비교합니다.
- $\text{Hit Rate} = \frac{\text{Hits}}{\text{Eligible Records}}$

---

## 4. 베이지안 축소 (Bayesian Shrinkage)

표본 크기가 부족할 경우 발생하는 우연한 극단치(Noise)를 제어하기 위해, 관찰값을 사전 신념(Prior)으로 보수적으로 축소 수축(Shrinkage)시킵니다.

### 4.1 Hit Rate 수축식
사전 Hit Rate는 $0.5$ (동전 던지기), 사전 강도(Prior Strength)는 $30$을 기본값으로 사용합니다.
$$\text{shrunkHitRate} = \frac{\text{observedHitRate} \times \text{sampleSize} + \text{priorHitRate} \times \text{priorStrength}}{\text{sampleSize} + \text{priorStrength}}$$

### 4.2 IC 수축식
사전 IC는 $0.0$, 사전 강도는 $30$을 기본값으로 사용합니다.
$$\text{shrunkIc} = \frac{\text{observedIc} \times \text{sampleSize} + \text{priorIc} \times \text{priorStrength}}{\text{sampleSize} + \text{priorStrength}}$$

---

## 5. 신뢰도 종합 점수 (Reliability Score)

검증 통과 여부를 판단하기 위한 Heuristic 종합 평점(0~100)을 산출합니다.

$$\text{reliabilityScore} = 0.40 \times \text{IC Component} + 0.30 \times \text{HitRate Component} + 0.20 \times \text{AvgExcessReturn Component} + 0.10 \times \text{Sample Component}$$

- **IC Component**: `shrunkIc`를 $[-0.10, 0.10]$ 범위로 클리핑한 후, $0$ ~ $100$ 점으로 선형 매핑합니다. ($-0.10 \to 0$, $0.00 \to 50$, $+0.10 \to 100$)
- **HitRate Component**: `shrunkHitRate`를 $[0.40, 0.60]$ 범위로 클리핑한 후, $0$ ~ $100$ 점으로 선형 매핑합니다.
- **AvgExcessReturn Component**: `avgExcessReturn`을 $[-5\%, +5\%]$ 범위로 클리핑한 후, $0$ ~ $100$ 점으로 선형 매핑합니다.
- **Sample Component**: $\min(100, \frac{\text{sampleSize}}{\text{robustSampleThreshold}} \times 100)$

*단, `sampleSize < 10` 이면 충분한 표본이 수집되지 않은 것으로 보아 `reliabilityScore = null` 및 `insufficient_sample` 라벨을 적용합니다.*

---

## 6. 가중치 보정치 (Weight Multiplier) Preview

신뢰도 지표를 통해 산출한 원자 가중치 보정 배수를 시뮬레이션할 수 있습니다.

### 6.1 제한 조건
- **표본 부족 (`sampleSize < 10`)**: 보정치를 계산하지 않음 (`null`).
- **Cold Start 단계 (`10 <= sampleSize < 30`)**: 급격한 가중치 왜곡을 방지하기 위해 보정치의 범위를 `[0.8, 1.1]`로 엄격하게 제한합니다.
- **안정 단계 (`sampleSize >= 30`)**: 충분한 신뢰도가 확보되었으므로 일반 범위 `[0.5, 1.5]`를 허용합니다.

### 6.2 가중치 덮어쓰기 금지 정책 (Zero-Overwrite)
이번 릴리즈에서 계산되는 `weightMultiplier`와 이를 적용한 `reliabilityAdjustedScore`는 **오직 UI 상에서 Preview 용도로만 제공됩니다.**  
**실제 시스템의 데이터베이스(Factor Store)에 저장되는 Momentum Factor v1의 base score나 가중치는 절대 수정하거나 자동 덮어쓰지 않습니다.**
수정 여부는 다음 페이즈의 융합 엔진 설계 시 검토합니다.

---

## 7. 주요 경고 조건 (Warnings)

- `insufficient_sample`: 표본 수가 10개 미만
- `negative_ic`: 역사적으로 미래 수익률과 역상관성(반대 방향)이 감지됨
- `low_ic`: 평균 IC가 0.05 미만으로 유효 정보량이 매우 낮음
- `unstable_ic`: 일별 IC의 표준편차가 0.15를 초과하여 신호 일관성이 극도로 불안정함
- `low_hit_rate`: Hit Rate가 51% 미만으로 사실상 임의 선택 수준
- `personal_fallback_used`: 입력 데이터 원천 중 비공식 개인용 Fallback 데이터가 섞여 있음
