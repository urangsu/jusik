# Market Exposure Audit

K-Terminal 전략의 시장 노출도(Market Exposure) 감사 및 진단 모델을 설명한다.

---

## 1. 개요 및 목적

전략의 성과가 단순히 시장(벤치마크) 상승에만 극단적으로 의존하고 있는지를 점검하기 위한 진단 도구이다.
Beta 및 벤치마크 상관계수, 상승/하락장 캡처 비율, 평균 초과수익률을 측정하여 해당 전략이 고유의 초과수익(Alpha)을 창출하고 있는지, 아니면 단순히 시장 베타를 추종하고 있는지 진단한다.

---

## 2. 측정 및 계산 공식

모든 지표는 백테스트의 OOS(Out-of-Sample) 구간별 전략 수익률($R_s$)과 벤치마크 수익률($R_b$) 시계열을 바탕으로 연산된다:

1. **Beta**:
   $$\beta = \frac{\text{Covariance}(R_s, R_b)}{\text{Variance}(R_b)}$$
2. **벤치마크 상관계수 (Benchmark Correlation)**:
   $R_s$와 $R_b$ 간의 피어슨(Pearson) 상관계수.
3. **상승/하락장 평균 수익률 (Up/Down Market Average Return)**:
   - 상승장: $R_b > 0$ 인 시점의 $R_s$ 평균값
   - 하락장: $R_b < 0$ 인 시점의 $R_s$ 평균값
4. **상승/하락장 캡처 비율 (Up/Down Capture)**:
   - 상승장 캡처: 상승장 평균 $R_s$ / 상승장 평균 $R_b$
   - 하락장 캡처: 하락장 평균 $R_s$ / 하락장 평균 $R_b$
5. **평균 초과수익률 (Average Excess Return)**:
   - $R_s - R_b$ 의 전체 평균값.

---

## 3. 평가 및 경고 기준

유효 오버랩 데이터 개수가 3개 미만인 경우 `insufficient_sample`로 등급이 결정되며 연산을 수행하지 않는다.

| 중립성 평가 등급 | 조건 | 설명 |
|---|---|---|
| **`market_dependent`** | $|\beta| \ge 1.2$ 또는 $|\rho| \ge 0.75$ | 시장과의 동조성이 극도로 높고 성과가 시장에 강하게 종속되어 있음. |
| **`partially_market_dependent`** | $|\beta| \ge 0.7$ 또는 $|\rho| \ge 0.5$ | 시장 방향성에 중간 수준의 의존성을 지님. |
| **`low_market_dependency`** | 위의 조건에 해당하지 않음 | 시장 의존도가 낮으며 고유의 알파 전략 특성을 보임. |

### 경고 목록
- **`high_beta`**: Beta의 절대값이 1.2 이상일 때 발생.
- **`high_benchmark_correlation`**: 벤치마크 상관계수의 절대값이 0.75 이상일 때 발생.
- **`down_market_underperformance`**: 하락장 평균 수익률이 -5% 이하일 때 발생.
- **`insufficient_benchmark_data`**: 연산을 수행할 수 있는 벤치마크 데이터 자체가 부족한 상태.
- **`insufficient_oos_windows`**: 백테스트 OOS Window 수가 10개 미만으로 분석 결과의 시계열적 신뢰성이 낮음.

---

## 4. 운영 정책 (Non-negotiable Policies)

> [!WARNING]
> **시장 의존성 진단 보조 장치**:
> Market Exposure Audit은 투자 조언이나 매수/매도 지시가 아닙니다.
> - `high_beta` 또는 `market_dependent` 등급이 부여되더라도 이를 즉각적인 매도 지시나 전략 폐기 명령으로 해석하지 않고, 사용자가 전략의 시장 동조성을 조절하는 용도로 참고합니다.
> - 본 제품은 long-only 연구 도구로 공매도(short position)나 레버리지 포지션을 취하거나 추천하지 않습니다.
> - 샘플 유니버스를 통해 분석된 결과는 운용 검증이 아니므로 투자 결정의 근거로 사용하지 않습니다.
