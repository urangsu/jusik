# Alert Rule Engine Spec

이 문서는 K-Terminal의 Alert Rule Engine 설계 및 작동 가이드라인에 대해 설명합니다.

## 1. 개요
Alert Rule Engine은 가격 돌파, 변동성 z-score, 거래량 z-score, 갭 등락 등 시장 상황 변화를 기계적으로 감지하여 이벤트를 생성하는 독립형 규칙 평가 레이어입니다.

## 2. 규칙 도메인 모델
각 알림 규칙(`AlertRule`)은 다음 데이터를 가집니다:
* **id**: 고유 식별값 (예: `preset-return-2s`)
* **name**: 규칙 이름 (예: `1일 수익률 ±2σ 초과`)
* **enabled**: 규칙 활성화 여부
* **locale**: 알림 언어 설정 (`ko` | `en`)
* **type**: 알림 타입
* **scope**: 적용 범위 (`asset` | `watchlist` | `portfolio` | `universe` | `provider` | `market`)
* **condition**: 상세 조건
* **cooldownMinutes**: 동일 알림 재발송 억제 시간 (분)

## 3. 규칙 프리셋 (10종)
1. **1일 수익률 ±2σ 초과** (기본 enabled)
2. **1일 수익률 ±3% 초과** (기본 enabled)
3. **거래량 60일 평균 대비 +2.5σ 초과** (기본 disabled)
4. **갭 상승/하락 ±3% 초과** (기본 enabled)
5. **API provider error** (기본 enabled)
6. **API rate_limited** (기본 enabled)
7. **personal fallback 사용** (기본 enabled)
8. **snapshot 생성 실패** (기본 enabled)
9. **전략 점수 eligible 해제** (기본 disabled)
10. **신규 공시 skeleton** (기본 disabled)
11. **거시 레짐 변경 (macro_regime_change)** (기본 enabled)
12. **거시 리스크 오프 (macro_risk_off)** (기본 enabled)
13. **거시 패닉 (macro_panic)** (기본 enabled)
14. **극단적 공포 감지 (sentiment_extreme_fear)** (기본 enabled)
15. **극단적 탐욕 감지 (sentiment_extreme_greed)** (기본 enabled)
