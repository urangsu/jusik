# YFinance Fallback Policy

K-Terminal은 `yfinance` 패키지 또는 야후 파이낸스 웹 API로부터 인입되는 데이터셋에 대해 명확한 위험 격리 정책을 취합니다.

## 1. 정의 및 한계 고지
* **비공식 보조 수단**: `yfinance`는 야후 파이낸스(Yahoo Finance)의 공식 배포 API가 아니며, 라이선스 권한이 개인의 교육 및 연구용 연구 목적으로 제한되어 있습니다.
* **상용 이용 불가**: K-Terminal 내부에서 yfinance 데이터를 이용해 얻은 정보는 상업적으로 재배포하거나 이용할 수 없으며, 상시 속도 차단(Rate limit) 및 차단(Block)에 취약합니다.

## 2. 전략 점수 통제 규칙 (Veto Rule)
* **핵심 원칙**: **yfinance 데이터만을 근거로 전략 점수 적격성(`eligible=true`)을 통과시키는 것을 전면 금지합니다.**
* **수행 제어**:
  - 종목 전략 점수(`StrategyScore`)를 연산할 때, 필수 수치 데이터의 출처(`sourceTier`)가 `personal_fallback` (yfinance 등)으로만 채워져 있는 경우 계산을 즉시 거부하거나 `eligible: false`로 격리 처리해야 합니다.
  - Veto Reasons 리스트에 `insufficient_official_data` 또는 `personal_fallback_data_veto` 사유를 의무적으로 추가하고, 데이터 품질 점수(`dataQualityScore`)를 감점 처리합니다.

## 3. UI 시각적 명시 정책
yfinance를 통과하여 유입된 가격/지표 데이터가 화면에 출력될 경우, 다음과 같은 표시 규정이 수반됩니다.
1. **타일 표시**: Heatmap의 타일 외곽선은 실선이 아닌 점선(`border-dashed`) 및 `비공식 Fallback` 형태의 표기를 취해야 합니다.
2. **상태 뱃지**: 데이터 상태 출력 창 혹은 데이터 Diagnostics 패널 상에 `unofficial`에 부합하는 경고 문구가 매핑되어야 합니다.
3. **출처 명시**: 데이터 출처 정보는 누락 없이 `Yahoo Finance via yfinance`로 기록되며 경고문구(`개인 연구용 비공식 데이터`)가 화면에 명확히 표출됩니다.
