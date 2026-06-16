# API Free Tier Strategy

K-Terminal은 유료 데이터 벤더 대신 다양한 무료 및 제한형 API(FMP, Finnhub, Alpha Vantage 등)를 결합하여 운영됩니다. 본 문서는 일일 호출량 예산을 분배하고 한도를 방어하는 구조적 방안을 설명합니다.

## 1. Provider Budget & Window 스펙
무료 API들의 호출 한도는 시간/일 단위로 정의되어 있으며, 코드 내에 고정하지 않고 `.env` 설정을 통해 동적으로 통제합니다.

* **FMP Free (`fmp_free`)**: 기본 일일 `250`회 제한 (`FMP_DAILY_LIMIT=250`)
* **Alpha Vantage Free (`alpha_vantage_free`)**: 기본 일일 `25`회 제한 (`ALPHA_VANTAGE_DAILY_LIMIT=25`)
* **Finnhub Free (`finnhub_free`)**: 기본 분당 `60`회 제한 (`FINNHUB_MINUTE_LIMIT=60`)

인메모리 `ProviderBudgetManager`가 누적 호출수를 확인하고 한도 도달 시 물리적 API 요청을 원천적으로 차단한 뒤 `rate_limited` 상태를 수반한 `null` 값을 반환합니다.

## 2. Cache-First Policies
한도를 절약하기 위해 아래와 같은 캐시 TTL(Time-To-Live, 초 단위) 기준을 수립하여 우선적으로 데이터를 로드합니다.

```typescript
export const CACHE_TTL = {
  quote_intraday: 60,                // 1분
  quote_delayed: 300,                // 5분
  ohlcv_daily: 60 * 60 * 6,          // 6시간
  financials: 60 * 60 * 24,          // 24시간
  filings: 60 * 10,                  // 10분
  dividends: 60 * 60 * 24,           // 24시간
  asset_profile: 60 * 60 * 24 * 7,   // 7일
  index_constituents: 60 * 60 * 24 * 7, // 7일
  market_board_snapshot: 60 * 15,    // 15분
};
```

## 3. 조회 우선순위 (Fallback Chain)
데이터 조회는 한도가 높은 혹은 공식적인 채널에서 개인용 로컬 폴백까지 연쇄적으로 검색합니다.
1. **Local DB / Fresh Cache**: 로컬 저장소 및 캐시 조회
2. **Stale Cache with Warning**: 캐시 만료 시, UI 렌더링에만 경고와 함께 노출 허용
3. **Official Provider**: OpenDART, SEC EDGAR 등 공식 원천 조회
4. **Free Limited Provider**: FMP Free, Finnhub 등 한도 내 API 호출
5. **Personal Fallback Provider**: yfinance, Stooq (사용자 스위치 `ALLOW_PERSONAL_FALLBACK=true` 설정 시에만 작동)
6. **Manual Import Required**: 수동 업로드 안내 및 `manual_import_required` 리턴
7. **Error**: 최종 에러 리턴

## 4. 로컬 인메모리 예산 통제의 한계와 Persistence 로드맵
* **P0 (현재 단계)**:
  - 인메모리 `ProviderBudgetManager` 구현 (`memory` 모드).
  - 로컬 개발 환경용 예산 통제용으로 작동하며, 프로세스 재시작 시 누적 사용량이 초기화되는 한계가 존재합니다.
* **P1 (다음 단계)**:
  - 로컬 파일 또는 SQLite 기반 Persistence 추가.
  - Vercel 등 서버리스 서버 또는 다중 데스크톱 프로세스 상에서 데이터 예산 기록이 유실되는 문제를 방지합니다.
  - 추후 분산 서버 구동 시 Redis 기반 저장소 어댑터로 용이하게 전환할 수 있는 추상 인터페이스를 보존합니다.
