# Sentiment Reference Policy

K-Terminal은 시장 참여자들의 과열 및 공포 심리를 객관적으로 나타내기 위해 CNN Fear & Greed 및 Crypto Fear & Greed 지수를 수집하여 대시보드 상에 제공합니다. 

본 문서는 이러한 시장심리 지표의 수집, 저장 및 UI 표시 정책을 다룹니다.

---

## 1. 지표 활용의 한계 정책 (Isolation Rules)

시장심리 지표는 시장의 심리적 극단값을 모니터링하는 보조 데이터일 뿐이며, 시스템 내부 핵심 알고리즘에 영향을 주지 않도록 아래와 같이 격리(Isolation)됩니다.

* **`usedForCoreSignal: false`**
  * 개별 종목의 기술적 지표 계산이나 모멘텀 팩터(Momentum Factor v1) 스코어 계산에 절대 참여하지 않습니다.
* **`usedForRegimeGate: false`**
  * Regime Gate v1의 국가별 시장 레짐 판정(Trend, FX, Volatility, Credit 등) 및 종합 점수 계산에 일절 반영되지 않고 완전히 배제됩니다.
* **`usedForOrderDecision: false`**
  * 주문 시스템이나 주문 의사결정 시뮬레이터에 연결되지 않습니다.

---

## 2. 수집 및 API 사양

### 2.1 CNN Fear & Greed
* **제공처**: CNN Business Fear & Greed Index
* **제한 사항**: 공식 API 키를 제공하지 않는 무료 채널이므로, 수집 실패 시 runtime crash를 막기 위해 에러를 백그라운드 로깅하고 최종 캐싱된 최근값을 안전하게 리턴합니다.

### 2.2 Alternative.me Crypto Fear & Greed
* **제공처**: Alternative.me API (`https://api.alternative.me/fng/`)
* **제한 사항**: 가상자산 시장심리를 나타내므로, 주식 시장 관련 Alert나 신호 적합도 판정에는 어떠한 영향도 주어서는 안 됩니다.

---

## 3. UI/UX 노출 및 경고 정책

* **병렬 카드 배치**: Market Board 상단에 두 카드를 가로 방향으로 나란히 배치합니다.
  - 카드 1: [미국 주식 공포탐욕] (CNN Fear & Greed)
  - 카드 2: [크립토 공포탐욕] (Crypto Fear & Greed)
* **경고 문구 노출**: 패널 하단에 다음 문구를 눈에 띄는 회색 또는 경고 톤으로 항상 표시해야 합니다.
  > "참고용 시장심리 지표입니다. 전략 적합도 계산과 주문 판단에는 사용하지 않습니다."
* **접기/펼치기 지원**: 사용자의 대시보드 시야 확보를 위해 필요하지 않을 경우 접어둘 수 있는 UI 접기 토글을 지원합니다.
