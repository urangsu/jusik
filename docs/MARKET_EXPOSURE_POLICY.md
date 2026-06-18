# Market Exposure Policy

K-Terminal 전략의 시장 노출도(Market Exposure) 분석 정책.

---

## 1. 목적

전략이 시장 상승에만 의존하는지 확인한다.
beta, 상승/하락 구간 성과, Regime별 성과를 분리해 측정한다.

이 분석은 시장 노출도 진단만 수행한다.
주문 추천, long-short 실거래, 자동매매와 연결되지 않는다.

---

## 2. 측정 항목

| 항목 | 설명 |
|---|---|
| `betaToBenchmark` | 벤치마크(유니버스 평균) 대비 Beta |
| `correlationToBenchmark` | 벤치마크와 수익률 상관관계 |
| `upMarketReturn` | 시장 상승 구간 평균 수익률 |
| `downMarketReturn` | 시장 하락 구간 평균 수익률 |
| `riskOffReturn` | risk_off Regime 구간 평균 수익률 |
| `panicReturn` | panic Regime 구간 평균 수익률 |
| `marketNeutralityAssessment` | 시장 중립성 평가 |

---

## 3. 경고 기준

| 조건 | 경고 |
|---|---|
| `betaToBenchmark > 1.2` | `high_market_beta` |
| `riskOffReturn < -5%` | `regime_dependency_high` |
| `downMarketReturn < -5%` | `market_directional` 평가 |

---

## 4. 시장 중립성 평가 기준

| 평가 | 조건 |
|---|---|
| `market_neutral_like` | beta 낮고 하락 구간 방어적 |
| `market_directional` | 하락 구간에서 크게 손실 |
| `high_beta` | beta > 1.2 |
| `insufficient_data` | 데이터 부족 |

---

## 5. 범위 제한

**이 분석은 절대 다음과 연결되지 않는다:**
- 실거래 주문 (long / short / 자동매매)
- 주문 비율 추천
- 공매도 신호

K-Terminal은 long-only 연구 도구다.
short 포지션, 공매도, 마진 거래는 제품 범위에서 영구 제외된다.
