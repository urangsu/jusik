# Individual Signal IC Audit

이 문서는 K-Terminal에 탑재된 개별 신호 예측력 검증 엔진(Individual Signal IC Audit)의 설계 방식, 평가 지표 및 정책을 설명한다.

---

## 1. 개요 및 목적

기존에는 포트폴리오의 종합 백테스트 성과만 분석했기 때문에, 전략(예: `momentum_v1`)에 기여하는 개별 atomic signal(예: `momentum_ichimoku`, `momentum_return`)의 실질적인 예측력을 분리하여 파악하기 어려웠다.
Individual Signal IC Audit은 다음 목표를 위해 동작한다:
- **신호 수준 분석(Signal-Level Analysis)**: 종합 성과(Composite Score) 뒤에 숨겨진 개별 신호의 실질적 예측 능력을 독립 검증한다.
- **오염 신호 및 비효율적 가중치 식별**: 예측력이 음수이거나 미미함에도 높은 가중치가 부여된 신호를 탐지하여 포트폴리오의 예측력을 최적화할 피드백을 제공한다.

---

## 2. 핵심 계산 규칙 (Spearman Rank Correlation)

1. **거래일별 단면 IC (Daily Cross-Sectional IC)**:
   - 특정 거래일(date)에 관측된 자산들의 신호 점수(score)와 해당 자산들의 미래 실현 수익률(forward return) 간의 **Spearman Rank Correlation**을 계산한다.
   - 단면(Cross-section) 상에 유효한 쌍(valid pair)이 최소 3개 이상 존재해야 당일 단면 IC를 계산하며, 미만일 경우 해당 날짜는 계산에서 제외한다.
2. **시계열 통합 지표**:
   - **Spearman IC**: 계산된 일별 단면 IC들의 산술 평균이다:
     $$\text{spearmanIc} = \text{mean}(\text{dailyIcs})$$
   - **ICIR (IC Information Ratio)**: 일별 단면 IC의 안정성을 측정하며, 평균 단면 IC를 표준편차로 나눈 값이다:
     $$\text{icir} = \frac{\text{mean}(\text{dailyIcs})}{\text{std}(\text{dailyIcs})}$$
   - **Hit Rate**: 일별 단면 내에서 신호 점수가 당일의 중위 점수(median score)보다 큰 자산들 중, 실제로 미래 수익률이 상승($\text{forwardReturn} > 0$)한 비율을 집계한다.
3. **미래 수익률(Forward Return)의 정의**:
   - look-ahead bias를 철저히 방지하기 위해, 신호 관측일(signal date)의 종가 이후에 진입하는 시나리오를 사용한다:
     - **진입(Entry)**: 신호 관측일 바로 다음 거래일의 종가(index + 1)
     - **청산(Exit)**: 진입 시점 대비 horizon bars가 지난 시점의 종가(index + 1 + horizonBars)
     - **수평선(Horizons)**: 1주일(5 trading days), 1개월(21 trading days), 3개월(63 trading days)

---

## 3. 기여도 평가(Contribution Assessment) 및 주의사항(Warnings)

감사 엔진은 계산된 통계치를 바탕으로 개별 신호의 상태를 5가지 기여도(`contributionAssessment`)로 분류하고 경고(`warnings`)를 바인딩한다:

| 기여도 수준 | 조건 | 설명 |
|---|---|---|
| **`not_available`** | 신호 점수 시계열 없음 | 계산에 필요한 신호 원본 데이터(scores)가 완전히 누락된 상태. |
| **`insufficient_sample`** | 전체 유효 쌍(sample size) < 30 | 통계적 신뢰성을 확보하기에 표본 수가 부족한 상태. |
| **`negative`** | $\text{spearmanIc} < 0$ 또는 $\text{icir} < 0$ | 신호의 예측력이 반대로 가고 있거나 매우 불안정함. |
| **`positive`** | $\text{spearmanIc} \ge 0.02$ 이고 $\text{sampleSize} \ge 30$ | 신호가 포트폴리오에 유의미한 양(+)의 예측력을 기여하고 있음. |
| **`neutral`** | 위의 조건에 해당하지 않는 기본값 | 예측 기여도가 미미하거나 보합인 상태. |

### 바인딩되는 주요 경고(Warnings)
- **`weak_signal_high_weight`**: 신호의 Spearman IC의 절대값이 0.01 미만으로 극히 낮은데, 가중치(`currentWeightInMomentumV1`)가 10% 이상으로 과도하게 설정되어 재조정이 필요한 경우.
- **`negative_contribution`**: Spearman IC가 0 미만으로 역방향 예측을 하고 있는 위험 상태.
- **`personal_fallback_used`**: 계산 원본에 yfinance personal fallback 등 비공식 데이터 공급 소스가 포함되어 품질 신뢰도가 낮은 경우.
- **`sample_universe_only`**: KOSPI_SAMPLE 또는 SP500_SAMPLE 유니버스만을 대상으로 하여 전체 시장 대표성이 떨어지는 경우.

---

## 4. 운영 및 해석 정책 (Non-negotiable Policies)

> [!WARNING]
> **전략/투자 추천 불가**: 본 감사 엔진이 산출하는 지표와 경고는 진단 목적의 분석 도구일 뿐이며, 특정 자산의 매수/매도 지시 또는 투자 의견으로 활용되거나 해석될 수 없습니다.

- **기가격/임시 소스 경고 유지**: personal fallback 가격이나 stale/error 데이터가 사용된 경우 warnings 필드에 해당 사실이 반드시 기재되어야 하며, 이를 가리거나 묵인하지 않는다.
- **음수 기여와 약한 신호 처리**: `negative_contribution` 또는 `weak_signal_high_weight` 경고는 신호를 시스템에서 자동 삭제하거나 가중치를 임의로 자동 변경하는 명령어가 아닙니다. 이는 개발자 및 리서치 팀이 가중치 설정 파일을 수동 검토하도록 돕는 정성적 진단 신호입니다.
- **가짜 데이터(Fake Data) 절대 금지**: 신호 점수가 누락된 자산에 임의의 0점이나 보간법을 사용하여 가짜 점수를 채우지 않으며, 데이터가 없을 경우 정직하게 `not_available` 또는 `insufficient_sample`로 처리한다.
