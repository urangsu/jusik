# Data Source Matrix

K-Terminal의 각 데이터 공급자(Provider)별 수집 범위 및 마켓 커버리지 매트릭스입니다.

## 1. 데이터 공급자별 커버리지 매트릭스

| 프로바이더 ID | 공급자 명칭 | 등급 (Tier) | 대상 시장 | 주요 제공 기능 (Capabilities) |
|---|---|---|---|---|
| `opendart` | OpenDART | official | KR | 공시 요약, 정기 재무제표, 배당 통계 |
| `sec_edgar` | SEC EDGAR | official | US | 공시 원본, 10-K/10-Q 재무제표 (Company Facts) |
| `fmp_free` | FMP Free | free_limited | US | 종목 프로필, 일봉(OHLCV), 분기 재무제표 요약, 배당 내역, 뉴스 |
| `finnhub_free`| Finnhub Free | free_limited | US | 실시간/지연 호가(Quote), 마켓 뉴스, 종목 심볼 검색 |
| `alpha_vantage_free`| Alpha Vantage Free | free_limited | US | 보조 일봉(OHLCV), 매크로 경제 지표 |
| `yfinance_personal`| yfinance | personal_fallback | KR, US | 보조 주가 시세, 배당 이력, 과거 재무 수치 |
| `stooq_personal`| Stooq | personal_fallback | US | 과거 일봉 가격 데이터 백업 |
| `manual_import`| KRX/manual | manual_import | KR, US | 지수 구성 종목, 공매도 비중, 일일 거래 주체별 동향 |

---

## 2. 데이터 연동 의무 원칙

1. **한국 시장(KR)**:
   - 공시 및 재무제표의 주 원천은 **OpenDART** 입니다.
   - 시세 및 거래 동향의 우선 순위는 사용자 제공 수동 CSV 파일(`manual_import`) 또는 한국투자증권 API 인터페이스를 따릅니다.
2. **미국 시장(US)**:
   - 공시 및 재무 실적 정보는 **SEC EDGAR**의 XBRL 데이터를 일차적 원천으로 합니다.
   - 프로필 및 보조 가격 검증 데이터는 **FMP Free** 및 **Finnhub Free**로부터 한도 범위 내에서 파생 처리합니다.
3. **개인 보조 수단 (`personal_fallback`)**:
   - `yfinance` 및 `Stooq` 데이터는 타 API 호출이 차단되거나 누락된 영역에 대해서만 개인 분석 목적으로 바인딩하며, 이에 대해서는 반드시 경고 뱃지를 함께 리턴합니다.
