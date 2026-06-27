# Provider Readiness

This document describes the Provider Readiness system (`WO017-M`) — the layer that checks whether each runtime data provider is configured and can serve real data.

> [!IMPORTANT]
> Provider Readiness는 API key 값을 표시하지 않습니다. key 이름만 표시됩니다.
> `secretsExposed`는 항상 `false`입니다.

> [!NOTE]
> `not_configured`는 실패가 아니라 설정 대기 상태입니다.
> `personal_fallback_disabled`는 명시적 flag 없이는 실행되지 않는 정상 상태입니다.

---

## 1. Providers Covered

| Provider ID | Display Name | Required Keys |
|---|---|---|
| `kis` | Korea Investment Securities (KIS) Open API | `KIS_APP_KEY`, `KIS_APP_SECRET` |
| `opendart` | OpenDART | `OPENDART_API_KEY` |
| `fmp_free` | Financial Modeling Prep Free | `FMP_API_KEY` |
| `finnhub_free` | Finnhub Free | `FINNHUB_API_KEY` |
| `alpha_vantage_free` | Alpha Vantage Free | `ALPHA_VANTAGE_API_KEY` |
| `yfinance_personal` | Yahoo Finance via yfinance | `ALLOW_PERSONAL_FALLBACK`, `ENABLE_YFINANCE_PERSONAL` |
| `stooq_personal` | Stooq | `ALLOW_PERSONAL_FALLBACK`, `ENABLE_STOOQ_PERSONAL` |

---

## 2. Readiness Status Values

| Status | Meaning | Is Failure? |
|---|---|---|
| `ready` | All required keys configured | No |
| `not_configured` | Required key(s) missing | No — awaiting setup |
| `personal_fallback_disabled` | Personal fallback opt-in flag not set | No — by design |
| `disabled_by_policy` | Provider disabled by system policy | No |
| `api_required` | Keys present but API returned api_required | Yes |
| `error` | Unexpected failure during check | Yes |

---

## 3. Real Data Smoke Profiles

Real data smoke tests are only executed for `ready` providers.

| Provider | Capability | Symbol | Region |
|---|---|---|---|
| `kis` | quote, ohlcv | `005930` | KR |
| `opendart` | filings | `005930` | KR |
| `fmp_free` | quote, ohlcv | `AAPL` | US |
| `finnhub_free` | quote | `AAPL` | US |
| `alpha_vantage_free` | quote | `AAPL` | US |
| `yfinance_personal` | quote | `005930.KS` | KR (personal flag required) |
| `stooq_personal` | ohlcv | `AAPL` | US (personal flag required) |

> [!NOTE]
> Real Data Smoke는 provider가 ready일 때만 실행됩니다.
> personal fallback은 `--include-personal` flag 없이는 실행되지 않습니다.

---

## 4. Security Contract

- `secretsExposed` 필드는 항상 `false`입니다.
- `configuredKeys`에는 key **이름**만 포함됩니다.
- key **값**은 어떤 응답에도 포함되지 않습니다.

---

## 5. Usage

### CLI
```bash
# Readiness check only
npm run ops:provider-readiness

# With real data smoke
npm run ops:provider-readiness -- --smoke

# Including personal fallback
npm run ops:provider-readiness -- --smoke --include-personal

# Against specific server
npm run ops:provider-readiness -- --base-url=http://localhost:3001
```

### API
```bash
# Configuration readiness only
curl http://localhost:3000/api/ops/provider-readiness

# Real data smoke
curl -X POST http://localhost:3000/api/ops/provider-readiness/smoke
```

### UI
Provider Settings 화면 하단의 **"Provider 설정 준비 상태"** 섹션에서 조회 가능합니다.
