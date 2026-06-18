# Strategy Trial Registry

`StrategyTrialRecord`의 구조와 사용 정책을 정의한다.

---

## 1. StrategyTrialRecord 필드 설명

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 고유 식별자 |
| `strategyId` | string | 전략 계열 ID (예: `momentum_v1_kospi`) |
| `variantId` | string | 파라미터 변형 ID (예: `window_20`) |
| `strategyFamily` | enum | momentum / trend_breakout / mean_reversion 등 |
| `thesisKo` | string | 전략 가설 (한국어) |
| `hypothesis` | string | 구체적 예측 가설 |
| `parameters` | Record | 전략 파라미터 |
| `parameterHash` | string | 중복 감지용 해시 |
| `universeId` | enum | KOSPI_SAMPLE / SP500_SAMPLE |
| `dataWindow` | object | startDate / endDate |
| `backtestRunId` | string \| null | 연결된 백테스트 실행 ID |
| `observedMetrics` | object | OOS수익률, Sharpe, MaxDD, IC, ICIR, HitRate, Turnover |
| `validationStatus` | enum | draft / backtested / rejected / watch_candidate / frozen / retired |
| `rejectionReason` | string \| null | rejected일 때 사유 |
| `biasWarnings` | string[] | 편향 경고 태그 |

---

## 2. 저장 위치

```
data/strategy-trials/events.json   — 전체 기록 (삭제 없음)
data/strategy-trials/latest.json   — 최신 상태 요약
```

`.gitignore`에 추가되어 있음:
```
data/strategy-trials/*
!data/strategy-trials/.gitkeep
```

---

## 3. validationStatus 전이 정책

```
draft → backtested → watch_candidate
draft → rejected
backtested → rejected
watch_candidate → frozen / retired
```

**human review 없이 `watch_candidate` 이상으로 상태 변경 금지.**

---

## 4. parameterHash 중복 정책

동일 `parameterHash` + `strategyId` 조합이 이미 존재하면 등록을 차단한다.
동일 실험을 반복해서 실행하는 것은 데이터 스누핑의 징조다.
