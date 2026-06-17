# Backtest Engine Spec

## P0 범위

P0에서는 가격/기술 팩터 기반 기능 검증용 백테스트만 구현한다.

## 명시적 제한

KOSPI_SAMPLE/SP500_SAMPLE 기반 결과는 운용 검증용이 아니다.  
생존편향 제거와 수정주가 데이터가 부족하면 성과 수치를 투자 판단 근거로 사용하지 않는다.

## 필수 요소

- transactionCostBps
- slippageBps
- walk-forward
- OOS result only
- live/backtest consistency test
- 최소 거래 횟수
- drawdown
- turnover
- benchmark comparison

## 금지

- train 구간 성과를 최종 성과에 합산
- 현재 universe로 과거를 백테스트
- unadjusted close만으로 장기 성과 주장
- 재무 팩터 PIT 없이 재무 백테스트
