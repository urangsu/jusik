# Individual Signal IC Audit

이 문서는 K-Terminal에 탑재된 개별 신호 예측력 검증 엔진(Individual Signal IC Audit)의 설계 방식, 평가 지표 및 운영 정책을 설명한다.

---

## 1. 개요 및 목적

전략(예: `momentum_v1`)에 기여하는 개별 atomic signal(예: `momentum_ichimoku`, `momentum_return`)의 실질적인 예측력을 분리하여 파악함으로써, 포트폴리오의 예측 효율성을 최적화할 피드백을 제공한다.
- **신호 수준 분석(Signal-Level Analysis)**: 종합 성과(Composite Score) 뒤에 숨겨진 개별 신호의 실질적 예측 능력을 독립 검증한다. (이 분석은 성과 예측 검증이 아닌 중복도 및 예측력 진단 목적이다.)
- **오염 신호 및 비효율적 가중치 식별**: 예측력이 음수이거나 미미함에도 높은 가중치가 부여된 신호를 탐지하여 가중치 설정을 수동 검토하도록 돕는다.

---

## 2. 핵심 계산 규칙

1. **상관계수 (Pearson IC & Spearman IC)**:
   - 특정 유니버스 내에서 동일 거래일(date) 및 동일 자산(assetId)에 정렬된 신호 점수(score) 시계열과 미래 실현 수익률(forward return) 간의 상관계수를 계산한다.
   - **Pearson IC**: 정렬된 원본 신호 점수와 미래 수익률 간의 선형 상관계수이다.
   - **Spearman IC**: 신호 점수 순위와 미래 수익률 순위 간의 상관계수(순위 상관계수)이다.
2. **분산 성과 차이 (Top-Bottom Spread)**:
   - 신호 점수 기준 상위 20% 자산군(Top Quantile)의 평균 미래 수익률과 하위 20% 자산군(Bottom Quantile)의 평균 미래 수익률 간의 스프레드를 계산한다:
     $$\text{topBottomSpread} = \text{mean}(\text{Top Quantile Return}) - \text{mean}(\text{Bottom Quantile Return})$$
   - 결측값(null score 또는 null forward return)은 제외하며, 이를 임의로 0으로 대체하지 않는다.
3. **미래 수익률(Forward Return)의 정의**:
   - look-ahead bias를 방지하기 위해, 신호 관측일(signal date) 바로 다음 거래일의 종가(Entry, index + 1)부터 청산 거래일 종가(Exit, index + 1 + horizonBars)까지의 수익률을 사용한다.
   - **평가 수평선(Horizons)**:
     - `forward_5d` (1주일, 5 trading days)
     - `forward_20d` (1개월, 21 trading days)
     - `forward_60d` (3개월, 63 trading days)

---

## 3. 심각도 등급(Severity) 및 경고(Warnings)

감사 엔진은 계산된 통계치를 바탕으로 개별 신호의 상태를 7가지 등급(`severity`)으로 분류하고 경고(`warnings`)를 바인딩한다:

| 심각도 등급 | 조건 | 설명 |
|---|---|---|
| **`not_available`** | 신호 점수 또는 미래 수익률 결측 | 계산에 필요한 데이터가 완전히 누락된 상태. |
| **`insufficient_sample`** | 전체 유효 쌍(sample size) < 30 | 통계적 신뢰성을 확보하기에 표본 수가 부족한 상태. |
| **`strong_positive`** | $\text{icSpearman} \ge 0.08$ 이고 $\text{sampleSize} \ge 30$ | 매우 강력하고 안정적인 양(+)의 예측력을 보임. |
| **`weak_positive`** | $0.03 \le \text{icSpearman} < 0.08$ 이고 $\text{sampleSize} \ge 30$ | 양호한 수준의 양(+)의 예측력을 기여하고 있음. |
| **`neutral`** | $-0.03 < \text{icSpearman} < 0.03$ 이고 $\text{sampleSize} \ge 30$ | 예측 기여도가 미미하거나 보합인 상태. |
| **`weak_negative`** | $-0.08 < \text{icSpearman} \le -0.03$ 이고 $\text{sampleSize} \ge 30$ | 음(-)의 예측 기여도가 의심되는 불안정한 상태. |
| **`strong_negative`** | $\text{icSpearman} \le -0.08$ 이고 $\text{sampleSize} \ge 30$ | 강한 음(-)의 상관관계가 나타나 전략 위험을 높이는 상태. |

### 바인딩되는 주요 경고(Warnings)
- **`insufficient_sample`**: 유효 쌍 개수가 30개 미만으로 통계적 유의성이 낮은 경우.
- **`negative_ic`**: Spearman IC가 0 미만으로 실현 수익률과 반대로 작동하는 상태.
- **`near_zero_ic`**: Spearman IC의 절대값이 0.03 미만으로 예측 기여도가 미미한 경우.
- **`unstable_across_horizons`**: 단기(5d)에서는 positive인데 중장기(20d/60d)에서 negative로 가는 등, 수평선별 예측 방향성이 반대로 상충하는 상태.
- **`weak_signal_high_weight`**: Spearman IC 절대값이 0.03 미만임에도 가중치가 10% 이상으로 과도하게 설정되어 재검토가 필요한 경우.
- **`missing_signal_score`**: 계산 대상 팩터 점수가 누락된 경우.
- **`missing_forward_return`**: 미래 수익률 계산용 가격 데이터가 누락된 경우.
- **`sample_universe_only`**: 샘플 유니버스(KOSPI_SAMPLE, SP500_SAMPLE)만을 대상으로 하여 대표성이 떨어지는 경우.
- **`personal_fallback_used`**: 비공식 데이터 공급 소스가 포함되어 품질 신뢰도가 낮은 경우.
- **`source_tier_mixed`**: 오버랩 대상 데이터 소스의 등급이 혼재되어 정합성 주의가 필요한 경우.

---

## 4. 운영 및 해석 정책 (Non-negotiable Policies)

> [!WARNING]
> **투자 및 전략 추천 불가 (Diagnostic Only)**:
> - 본 감사 결과는 순수한 통계적 진단 도구이며, 특정 자산의 매수/매도 지시 또는 투자 의견으로 활용되거나 해석될 수 없습니다.
> - 개별 신호의 IC가 높다고 해서 해당 신호를 포트폴리오에 자동으로 편입하거나 가중치를 자동으로 확대하지 않으며, 반대로 IC가 낮다고 해서 자동으로 해당 신호를 제거하거나 차단하지 않습니다.
> - 모든 분석 결과는 연구팀의 수동 재검토를 위한 보조 지표입니다.
>
> **유니버스 해석의 한계**:
> - 샘플 유니버스(`KOSPI_SAMPLE`, `SP500_SAMPLE`)를 바탕으로 한 결과는 전체 시장에 대한 실제 운용 검증이 아님을 명확히 인지해야 합니다.
>
> **Watchlist Report Inbox 연계 시 주의사항**:
> - 신호 IC 감사 결과는 특정 자산 단위가 아닌 신호 및 유니버스 전체 단위를 대상으로 합니다.
> - 따라서 이 진단 결과를 관심 자산 리포트함(Watchlist Report Inbox)에 연계하여 표시할 때는, 신호-유니버스의 통계적 결과를 개별 자산(asset-specific)에 대한 직접적인 위험이나 매매 추천 정보로 오해하지 않도록 문구와 정책을 엄격히 제한하여 처리해야 합니다.
