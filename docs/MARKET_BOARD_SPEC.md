# Market Board Spec

본 문서는 K-Terminal의 시장 현황판인 **Market Board** 화면의 명세와 기술 설계 사항을 정의합니다.

## 1. 개요 및 화면 명칭
* **화면명**: `Market Board` (Finviz 등의 상표명을 UI 상에서 직접 노출하지 않습니다.)
* **라우트**: `/markets` (Next.js App Router: `src/app/markets/page.tsx`)
* **목적**: KOSPI 대표(20종목 샘플) 및 S&P 500 대표(20종목 샘플) 주식 유니버스의 시가총액 비중과 당일 등락률을 트리맵(Heatmap) 및 필터링 테이블로 한눈에 진단합니다.

## 2. 화면 구성 및 레이아웃
1. **상단 툴바**:
   - **Universe Toggle**: `코스피 대표` 와 `S&P 500 대표` 알약 모양 탭 스위치.
   - **정렬 필터**: 시가총액, 등락률, 거래량 정렬 선택기.
   - **마지막 업데이트 시간**: `Snapshot`이 마지막으로 갱신된 시각 (`generatedAt`).
2. **좌측 영역 (Market Heatmap)**:
   - 각 섹터별 블록 내에 종목별 타일 배치.
   - **타일 크기**: 시가총액(`marketCap`) 또는 구성 비중(`weight`)에 비례.
   - **상승 타일**: 한국 금융 UI 관례에 따라 빨간색 계열 배경 (`bg-kt-positive-weak text-kt-positive-text`).
   - **하락 타일**: 파란색 계열 배경 (`bg-kt-negative-weak text-kt-negative-text`).
   - **비공식 데이터 타일**: 외곽선 점선 스타일링 (`border-dashed border-kt-text-muted`) 및 안내 노출.
3. **우측 영역 (Screener Table)**:
   - 종목명, 섹터, 현재가, 등락률, 시가총액, PER, PBR, ROE, 배당수익률, 데이터 상태 정보 노출.
   - 숫자 컬럼은 우측 정렬 및 자간 고정을 위해 `tabular-nums` 클래스 적용.
   - 데이터 미연결(`api_required`)이나 에러 상태 시 숫자를 `0` 또는 `-`로 뭉개지 않고 상태 뱃지 노출.
4. **하단 진단 영역 (Diagnostics Panel)**:
   - 프로바이더별 상태(`healthy`, `disabled`, `rate_limited`).
   - 금일 API 예산 한도 대비 실제 사용량 실시간 게이지 표출.

## 3. 백그라운드 스냅샷 (Snapshot-first) 조회 정책
* **한도 보호 장치**: 대시보드 진입 시 수백 개 종목의 API를 개별적으로 동시 호출하는 동작을 원천 방지합니다.
* **동작 방식**:
  - 화면 마운트 시 로컬 DB/파일에서 컴파일된 `MarketBoardSnapshot` 데이터를 직접 불러옵니다.
  - Snapshot 갱신 주기(`CACHE_TTL.market_board_snapshot = 15분`)를 두어 백그라운드에서만 Registry와 Budget Manager의 승인을 통과한 호출만이 순차로 가격과 지표를 병합하여 Snapshot을 재구성합니다.
