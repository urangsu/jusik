# Regime Gate Policy

Regime Gate v1은 거시지표와 지수 추세를 종합하여 현재 시장이 위험자산을 신규로 모니터링하기에 적합한 환경인지 진단하는 시장환경 필터입니다.

---

## 1. 입력 자료 요건

### 1.1 US Market v1
* **S&P 500 20거래일 수익률 (20D return)**
* **S&P 500 125거래일 이동평균선 대비 위치 (125D MA position)**
* **VIX 변동성 지수 레벨 및 z-score**
* **하이일드 스프레드 (High Yield Spread)**
* **미국채 10년-2년 장단기 금리차 (10Y-2Y Treasury Spread)**

### 1.2 KR Market v1
* **KOSPI 20거래일 수익률 (20D return)**
* **KOSPI 125거래일 이동평균선 대비 위치 (125D MA position)**
* **원/달러 환율 20거래일 변화율 (USD/KRW 20D change)**
* **한국 금리 Proxy (국고채 3년 또는 10년 금리 추이)**

---

## 2. 레짐 평가 로직 및 분류

### 2.1 가중치 배분 (Base Score 계산)

* **US Regime Score (총 100점)**:
  * 지수 추세 (Trend): 35%
  * 변동성 (Volatility): 25%
  * 신용 스프레드 (Credit): 20%
  * 금리 환경 (Rate): 10%
  * 참고 시장심리 (Sentiment Reference): 10% (CNN Fear & Greed 값을 0~100 스케일로 단순 반영)

* **KR Regime Score (총 100점)**:
  * 지수 추세 (Trend): 40%
  * 환율 동향 (FX): 25%
  * 금리 환경 (Rate): 20%
  * 참고 시장심리 (Sentiment Reference): 15% (Crypto Fear & Greed 값을 0~100 스케일로 단순 반영)

### 2.2 구간 분류 임계값

합산된 Base Score에 따라 아래와 같이 레짐을 1차 분류합니다:
* **Score >= 75**: `risk_on`
* **60 <= Score < 75**: `selective_risk_on`
* **45 <= Score < 60**: `neutral`
* **30 <= Score < 45**: `risk_off`
* **Score < 30**: `panic`

---

## 3. 강제 조절 조건 (Force / Overriding Rules)

수치적 가중치 계산 결과에 관계없이 다음 오버라이딩 규칙이 적용됩니다.

1. **지수 추세의 붕괴 (125일 이평선 하회)**
   * S&P 500 또는 KOSPI가 125일 이동평균선(125D MA) 아래에 있을 경우, 레짐은 강제로 `risk_on`이 될 수 없습니다 (최대 `selective_risk_on` 또는 `neutral` 이하로 캡 처리).
2. **변동성 발작 및 신용위험 급등**
   * VIX가 급등하거나 하이일드 신용 스프레드가 폭등하는 조건이 발생하면, 레짐은 강제로 `risk_off` 또는 `panic`으로 제한(Cap)됩니다.
3. **원/달러 환율 급등**
   * USD/KRW 환율이 단기에 급격히 치솟는 현상 발생 시, KR 레짐은 신규 관찰(allowsNewWatch = false) 상태를 강제 활성화합니다.
4. **시장심리 지표 격리**
   * CNN Fear & Greed 및 Crypto Fear & Greed의 급변만을 근거로 전체 레짐을 격상하거나 격하하지 않습니다.

---

## 4. Strategy Suitability와의 결합

Regime Gate는 산출된 레짐 상태를 바탕으로 개별 전략의 최종 관찰 등급(Suitability)을 아래와 같이 가감합니다:

*  **`panic`**: 모든 전략 적합도 점수 및 등급을 차단합니다 (`suitabilityScore = null`, 상태 = `insufficient_data`).
*  **`risk_off`**: 기존 `strong_watch` 및 `watch` 신호를 강제로 `caution`(주의)으로 감쇄 조정하여 보수적인 스탠스를 유지합니다.
*  **`neutral`**: 전략 엔진이 산출한 본연의 `momentum` 및 `reliability` 결과를 수정 없이 유지합니다.
*  **`risk_on`**: 전략 추천 결과를 그대로 노출하되, UI에 매수/매도/추천 등 투자 유도성 단어가 표시되지 않도록 마스킹 필터를 적용합니다.
*  **`insufficient_data`**: 데이터가 부족한 경우 레짐 판단 지연 상태("레짐 판단 데이터 부족")를 표시합니다.
