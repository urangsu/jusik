# yfinance Snapshot Worker

이 디렉토리는 Yahoo Finance 계열 데이터를 `yfinance` 직접 호출 방식으로 수집하는 Python worker 스크립트 모음을 포함합니다.

## 구성 파일
- `yfinance_snapshot_worker.py`: 수집을 조율하고 스냅샷을 구성하는 메인 진입점 스크립트입니다.
- `yfinance_client.py`: `yfinance` 모듈을 직접 로드하고 OHLCV 데이터 및 기본 밸류에이션(PE, PB, ROE 등)을 수집하는 클라이언트 라이브러리입니다.
- `ticker_mapper.py`: K-Terminal의 내부 종목 심볼(KRX 코드 등)을 야후 파이낸스 티커 규칙(`.KS` suffix)으로 매핑합니다.
- `snapshot_writer.py`: 수집된 데이터를 내부 스키마 규격(`MarketBoardSnapshot`)으로 변환하여 디스크에 저장합니다.

## 실행 방법
환경 변수 `ALLOW_PERSONAL_FALLBACK` 및 `ENABLE_YFINANCE_PERSONAL`이 모두 `true`인 경우에만 스크립트가 실행됩니다.

```bash
ALLOW_PERSONAL_FALLBACK=true ENABLE_YFINANCE_PERSONAL=true python scripts/market-data/yfinance_snapshot_worker.py --universe KOSPI_SAMPLE
ALLOW_PERSONAL_FALLBACK=true ENABLE_YFINANCE_PERSONAL=true python scripts/market-data/yfinance_snapshot_worker.py --universe SP500_SAMPLE
```

## 주요 원칙
- `pandas_datareader` 및 `yf.pdr_override()`의 로드 및 사용은 철저히 금지됩니다.
- 수집 실패 종목들은 `failures.latest.json`에 별도로 로깅됩니다.
- 렌더링 시점에 API 실시간 다이렉트 조회를 하지 않으며, 빌드된 스냅샷 JSON만을 Next.js 앱에서 스트리밍하여 화면 깨짐을 방지합니다.
