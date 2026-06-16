# ROADMAP.md

이 문서는 K-Terminal의 P0 기반 구축 이후에 순차적으로 적용할 데이터 공급 및 전략 분석 기능들의 로드맵을 다룹니다.

---

## Phase 1: 한국 공시 및 재무 데이터 어댑터 연동 (DART)
* **목표**: 한국 기업에 대한 연결재무제표 및 주요 정기 보고서 리스트 수집.
* **주요 과제**:
  - OpenDART API 인증 토큰 연동 및 호출 모듈 개발.
  - 상장 기업 고유 회사 코드(8자리) 매핑 및 쿼리 파이프라인 최적화.
  - 분기/연간 재무 보고서의 계정과목 표준화 (예: 매출액, 영업이익, 당기순이익 표준 태깅).

## Phase 2: 미국 공시 및 재무 데이터 어댑터 연동 (SEC)
* **목표**: 미국 기업의 10-K, 10-Q 보고서 및 실시간 수치 데이터 수집.
* **주요 과제**:
  - SEC EDGAR API 요청 스로틀 제어 준수 (User-Agent 헤더 규격 준수).
  - CIK 식별 정보를 바탕으로 한 XBRL 재무제표 파싱 및 데이터 정규화.
  - FMP(Financial Modeling Prep) 또는 Finnhub 어댑터를 통한 주요 재무 비율 보완 공급.

## Phase 3: 한국/미국 주식 가격 시세 파이프라인 (Market Data)
* **목표**: 실시간 및 지연 시세 데이터를 쉘 화면에 활성화.
* **주요 과제**:
  - 한국 주식: 한국투자증권 Open API 기반 실시간 체결가 및 호가 창 렌더링.
  - 미국 주식: Finnhub/Polygon WebSockets 또는 REST API 기반 시세 연동.
  - 지연 데이터 표기 정책 준수: 실시간 라이선스가 없는 종목에 대해 15분 지연 여부 및 뱃지 표시.

## Phase 4: 재무제표 표준 규격 정규화 (Financial Normalization)
* **목표**: DART와 SEC 보고서의 이종 양식을 공통 재무제표 포맷으로 정합.
* **주요 과제**:
  - `FinancialStatement` 도메인 클래스에 맞게 원화(KRW)와 달러화(USD)의 통화별 스케일 및 단위 정밀도 변환.
  - 연결(CFS)/별도(OFS) 기준에 따른 계정 과목 일치 필터 구축.

## Phase 5: 시장 레짐 및 포트폴리오 팩터 분석 (Regime Gate & Factor Store)
* **목표**: 금융 시장 국면(Risk-on/Risk-off) 판단 및 주식 밸류에이션 전략 스코어 산출.
* **주요 과제**:
  - 한국/미국 인덱스의 모멘텀 및 변동성을 바탕으로 한 6단계 시장 레짐(Market Regime) 분류 엔진 구현.
  - 개별 종목별 멀티팩터(Value, Quality, Momentum) 점수 및 Z-Score 산출.
  - 포트폴리오 종목별 수동 기록 및 누적 성과 요약 카드 활성화.

## Phase 6: 전략 신호 실제 데이터 연결
* **목표**: P0에서 고정한 전략 탭 계약에 실제 데이터 공급자를 연결합니다.
* **주요 과제**:
  - OHLCV provider 연결 및 표준편차 밴드 실제 차트 렌더링.
  - OpenDART 재무/공시 연결과 SEC/FMP/Finnhub 미국 데이터 연결.
  - 레짐 게이트 계산 엔진, 월천식 눌림 뷰, 알상무식 레짐-우선 뷰 구현.
  - Factor Store 저장 구조와 포트폴리오 닥터, AI 설명 레이어 연결.

## Phase 7: Quant Core Contract 확장
* **목표**: 002-A에서 고정한 research contract를 실제 PIT store와 factor pipeline에 연결.
* **주요 과제**:
  - PIT Data Store & Universe Builder.
  - Factor Definition Implementation.
  - IC/ICIR Validation Engine.
  - Factor Risk Model과 Portfolio Risk Diagnostics.
  - Overlay Engine Refactor와 Influencer Extraction Prompt Store.
