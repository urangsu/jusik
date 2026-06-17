# Regime Engine Spec

## 목적

시장 전체가 신규 리스크를 받을 수 있는 상태인지 판단한다.  
전략 점수보다 상위에 위치하며, 레짐이 부적절하면 신규 신호를 제한한다.

## 레짐 상태

- risk_on
- selective_risk_on
- neutral
- risk_off
- panic
- overheated

## 입력 후보

- KOSPI 20D/60D 수익률
- S&P500 20D/60D 수익률
- 상승 종목 비율
- 거래대금 변화
- 변동성
- 원/달러
- 미국 10년물
- 한국 국고채
- 유가
- VIX
- 외국인/기관 수급
- 신용 과열
- 반도체 상대강도
- 섹터 쏠림

## Regime Momentum

레짐 상태뿐 아니라 변화율도 추적한다.

- scoreChange5D
- scoreChange20D
- transitionRisk: none | watch | elevated

## 검증 원칙

레짐 엔진도 하나의 모델이다.  
레짐 분류가 이후 drawdown, volatility, strategy performance를 설명하는지 walk-forward로 검증해야 한다.
