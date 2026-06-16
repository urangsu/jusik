# Anomaly Detection Spec

이 문서는 통계적 기법(z-score)을 활용한 이상 등락 및 이상 거래량 감지에 대해 다룹니다.

## 1. 일일 수익률 z-score 산출 공식
$$\text{dailyReturn}_t = \frac{\text{close}_t - \text{close}_{t-1}}{\text{close}_{t-1}}$$
$$\text{zScore} = \frac{\text{dailyReturn}_t - \text{rolling\_mean}(\text{dailyReturn}, N)}{\text{rolling\_std}(\text{dailyReturn}, N)}$$

* **조건**:
  - $N$ (baselineWindow) 만큼의 역사적 데이터 필요 (예: 60거래일).
  - 표준편차가 0인 경우 (`std === 0`), `insufficient_volatility_baseline` 사유로 탐지를 생략합니다.
  - 데이터가 부족한 경우 (`insufficient_history`), 경보를 보류합니다.

## 2. 거래량 z-score 산출 공식
$$\text{volumeZScore} = \frac{\text{volume}_t - \text{rolling\_mean}(\text{volume}, N)}{\text{rolling\_std}(\text{volume}, N)}$$
* 거래량이 없거나 0인 상태에서는 경보 생성을 금지합니다.
