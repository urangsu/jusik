# Point-in-Time Data Policy

## 핵심 원칙

백테스트 날짜 D에서는 `dataAvailableAt <= D`인 데이터만 사용할 수 있다.

`fiscalPeriodEnd <= D`는 잘못된 필터다.  
회계기간은 끝났지만 공시가 아직 나오지 않은 데이터는 그 시점의 투자자가 알 수 없다.

## FactorValue 시간 필드

- fiscalPeriodEnd: 회계기간 종료일. 가격 팩터는 null.
- dataAvailableAt: 시장에 공개된 시각.
- calculatedAt: K-Terminal이 계산한 시각.

## 가격 팩터

가격/기술 팩터는 재무 팩터보다 PIT 구축 난이도가 낮다.  
다만 운용 검증용 백테스트에는 다음이 필요하다.

- adjustedClose
- adjustmentFactor
- corporate action
- historical universe membership
- intraday_partial / eod_final 구분

## 재무 팩터

재무 팩터 백테스트는 OpenDART/SEC의 공시 시각이 확보된 뒤에만 허용한다.
