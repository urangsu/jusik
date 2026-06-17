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

## 공시 이벤트 및 재무 팩터 PIT

- OpenDART 수집 공시는 공시 접수일(`rcept_dt`, YYYYMMDD)을 기준으로 당일 오전 9시 KST(`YYYY-MM-DDT09:00:00+09:00`)를 `dataAvailableAt`으로 맵핑하여 당일 장 시작 전 시점에 시장 참여자들이 알 수 있었던 상태로 마킹합니다.
- 향후 재무 팩터 수집 및 가공 시 이 `dataAvailableAt` 값을 활용하여, 백테스트 가용 시점 D에서 `dataAvailableAt <= D`인 건에 한해서만 해당 재무 데이터를 참조하도록 설계합니다.

