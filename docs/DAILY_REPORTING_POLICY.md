# K-Terminal Daily Reporting Policy

## Overview
Every business day after the market close, a daily analytics report is compiled to summarize the latest pricing data, data quality metrics, and system operations budgets.

## Report Types

### 기본 리포트
`기본 리포트`는 장마감 후 필수적으로 작성되어야 하는 최소 요건 보고서입니다:
1. **시장 스냅샷 요약**: KOSPI 및 S&P 500 대표 주식군의 가격 종가 및 당일 등락률 요약.
2. **데이터 공급 신뢰성 리포트**: 공식 공급자(KIS API 등)와 비공식 fallback 소스 간의 가용성 비율 및 데이터 버전 일치 여부 보고.
3. **예산 소진 상태**: 각 데이터 공급자별 당일 API 예산 소모 실적 통계.

### 선택 리포트
`선택 리포트`는 분석 깊이와 설정에 따라 추가적으로 생성되는 확장 보고서입니다:
1. **정량적 팩터 모니터링**: 팩터 공분산 및 Rank IC/IR 추세 분석 리포트.
2. **이상 가격/거래량 감지 분석**: 당일 비정상 변동이 발생한 종목과 발생한 알림 규칙(Alert Rule Engine)의 감지 이력 정리.
3. **전략 성과 시뮬레이션**: 포트폴리오 백테스트 결과 및 Regime Gate가 트리거된 횟수와 상세 거부 원인 분석 보고.
