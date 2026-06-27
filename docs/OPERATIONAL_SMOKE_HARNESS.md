# Operational Smoke Harness

This document describes the Operational Smoke Harness (`WO017-L`) — the system that verifies runtime endpoint readiness across the K-Terminal infrastructure.

> [!IMPORTANT]
> Operational Smoke Harness는 unit test가 아닙니다. endpoint와 provider의 **runtime readiness**를 확인합니다.

## 1. Purpose

The smoke harness answers the question:

> "지금 이 환경에서, 어떤 endpoint가 실제로 데이터를 반환하고 어떤 endpoint가 key/config 부족으로 `api_required` 상태인가?"

It does **not** duplicate existing unit tests. It checks 10 operational targets in one pass.

---

## 2. Target Matrix (10 targets)

| ID | Method | Endpoint | Without Key | With Key |
|---|---|---|---|---|
| `ai_providers` | GET | `/api/ai/providers` | `data_available` | `data_available` |
| `ai_provider_run_mock` | POST | `/api/ai/providers/run` | `data_available` | `data_available` |
| `ai_provider_run_disabled_openai` | POST | `/api/ai/providers/run` | `not_supported_expected` | `not_supported_expected` |
| `market_quote_kr` | GET | `/api/market/quote` | `api_required_allowed` | `data_available` |
| `market_ohlcv_kr` | GET | `/api/market/ohlcv` | `api_required_allowed` | `data_available` |
| `opendart_disclosures` | GET | `/api/opendart/disclosures` | `api_required_allowed` | `empty_allowed` |
| `audit_findings` | GET | `/api/audit/findings` | `empty_allowed` | `empty_allowed` |
| `audit_replay` | POST | `/api/ai/replay/audit-finding` | `empty_allowed` | `empty_allowed` |
| `watchlist_reports` | GET | `/api/watchlist/reports` | `empty_allowed` | `empty_allowed` |
| `provider_health` | GET | `/api/providers/health` | `data_available` | `data_available` |

---

## 3. Expectation Policy

> [!NOTE]
> `api_required`는 key/config가 없는 환경에서 정상 상태일 수 있습니다.
> `not_supported`는 disabled provider에서 정상 상태입니다.

| Expectation | Pass Conditions |
|---|---|
| `data_available` | HTTP 200, `envelope.value != null`, `status in [real_time, delayed, eod, cached, stale]` |
| `api_required_allowed` | `envelope.status = api_required` 또는 data_available |
| `not_supported_expected` | HTTP 200, `envelope.status = not_supported` |
| `empty_allowed` | HTTP 200, `envelope.status != error` (value가 `[]` 또는 `null`이어도 허용) |
| `blocked_expected` | `output.isBlocked = true` |

| Failure Conditions |
|---|
| HTTP 500 이상 |
| DataEnvelope 구조 없음 (`source` 또는 `status` 필드 누락) |
| disabled provider가 output을 반환 |
| expected와 실제 상태 불일치 |

---

## 4. Storage

| Path | Description |
|---|---|
| `data/ops/smoke/latest.json` | 최근 실행 결과 |
| `data/ops/smoke/history/<id>.json` | 과거 결과 이력 |

Runtime 결과는 `.gitignore`에 포함되어 커밋되지 않습니다.

---

## 5. Usage

### CLI
```bash
npm run ops:smoke
npm run ops:smoke -- --finding=finding_xxx
npm run ops:smoke -- --base-url=http://localhost:3000
```

### API
```bash
# 실행
curl -X POST http://localhost:3000/api/ops/smoke/run

# 최근 결과 조회
curl http://localhost:3000/api/ops/smoke/latest
```

### UI
Provider Settings 화면 하단의 **"운영 스모크 점검"** 섹션에서 실행 및 결과 조회가 가능합니다.

---

## 6. Interpretation Guide

- **api_required (warning)**: API key 또는 설정이 없는 환경. 정상 기대값. 실패 처리하지 않습니다.
- **not_supported (pass)**: Disabled provider에서 정상 반환. 구현된 policy가 동작하고 있습니다.
- **data_available (pass)**: 실제 데이터를 반환함. API key가 있는 환경에서 기대됩니다.
- **empty_allowed (pass)**: 데이터가 없어도 정상. 런타임 데이터 미생성 상황에서 기대됩니다.
- **HTTP 500 (fail)**: 서버 오류. 반드시 조사가 필요합니다.
- **DataEnvelope 누락 (fail)**: `source`/`status` 필드가 없는 응답. 계약 위반입니다.
