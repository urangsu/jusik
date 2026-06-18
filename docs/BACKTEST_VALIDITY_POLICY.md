# Backtest Validity Policy

> [!WARNING]
> 이 문서에 기술된 백테스트 기준은 **기능 검증(functional check)**을 위한 것이며, 투자 판단의 근거로 사용해서는 안 됩니다.

---

## 1. 목적

K-Terminal의 백테스트 엔진은 `momentum_v1_long_only` 단일 전략 후보에 대해 Walk-Forward 방식으로 OOS(Out-of-Sample) 검증을 수행합니다.
그러나 현재 엔진은 다음 한계를 가지므로, 모든 결과에 유효성 등급을 부여하여 UI에서 명확히 노출합니다.

- 수정주가(Adjusted Price) 미반영
- 과거 유니버스 구성원 정보(Historical Universe Membership) 미반영
- SAMPLE 유니버스만 지원 (KOSPI_SAMPLE, SP500_SAMPLE)
- 벤치마크 가격이 없으면 excess return 산출 불가

---

## 2. Validity Level 등급 체계

| 등급 | 코드 | 설명 |
|---|---|---|
| 무효 | `invalid` | OOS 구간 없음 또는 데이터 품질 < 30%. 성과 숫자를 신뢰할 수 없다. |
| 데이터 부족 | `insufficient_data` | 유효 수익률 구간 < 2개 또는 데이터 품질 < 50%. |
| 기능 검증용 | `functional_check_only` | 수정주가·과거 유니버스 미반영 상태. 전략 기능이 동작하는지 확인하는 수준이다. |
| 연구 후보 | `research_candidate` | OOS ≥ 3개, 벤치마크 있음, SAMPLE 아님, 수정주가 적용. 추가 연구 가능한 수준이다. |

> [!IMPORTANT]
> 현재 엔진은 SAMPLE 유니버스만 지원하므로, 모든 백테스트 결과의 최대 등급은 **기능 검증용 (functional_check_only)**이다.
> `research_candidate` 등급은 실 유니버스 데이터가 반영된 이후에만 달성 가능하다.

---

## 3. Validity Report 구성

`BacktestValidityReport` 타입은 다음 필드를 포함합니다.

```ts
type BacktestValidityReport = {
  level: BacktestValidityLevel;
  reasons: BacktestWarningCode[];
  messageKo: string;
};
```

`reasons` 필드에는 현재 결과에서 유효성 등급을 낮춘 원인 코드들이 포함됩니다.

| 코드 | 의미 |
|---|---|
| `sample_universe_only` | SAMPLE 유니버스를 사용함 |
| `missing_adjusted_price` | 수정주가가 반영되지 않음 |
| `no_historical_universe_membership` | 과거 유니버스 구성 미반영 |
| `personal_fallback_used` | 비공식(yfinance/stooq) 소스 사용 |
| `insufficient_oos_windows` | OOS 구간 < 3개 |
| `missing_benchmark` | 벤치마크 가격 데이터 없음 |
| `low_data_quality` | 데이터 품질 점수 < 50% |
| `insufficient_ic_pairs` | IC 계산 유효 페어 < 3개 |

---

## 4. 누적 수익률 계산 방식 (Compounded Return)

WO-017-A부터 OOS 구간 수익률을 단순 합산이 아닌 **복리 방식**으로 집계합니다.

```
equity_0 = 1.0
equity_t = equity_{t-1} * (1 + r_t)
totalReturn = equity_T - 1
```

- `r_t`: 구간 t의 비용 차감 후 weighted net return
- 첫 구간부터 마지막 구간까지 연결하여 최종 총수익률 산출
- 구간 수익률이 null인 구간은 집계에서 제외 (null 체인 끊김)

---

## 5. 벤치마크 및 초과 수익률

| 유니버스 | 벤치마크 |
|---|---|
| KOSPI_SAMPLE | KR:KOSPI |
| SP500_SAMPLE | US:SPX |

벤치마크 수익률은 진입일(entryDate)과 청산일(testEnd)의 벤치마크 종가(close)를 기준으로 산출합니다.

```
benchmarkReturn = (exitClose - entryClose) / entryClose
excessReturn = longOnlyReturn - benchmarkReturn
```

벤치마크 가격 데이터가 없으면 `benchmarkReturn`, `excessReturn`은 `null`로 처리하고, `missing_benchmark` 경고를 `vetoReasons`에 추가합니다.

---

## 6. 포트폴리오 교체율 (Turnover)

연속 구간 간의 포트폴리오 가중치 변화량으로 측정합니다.

```
turnover_t = 0.5 * Σ |w_t(asset) - w_{t-1}(asset)|
```

- 첫 번째 OOS 구간은 이전 포트폴리오가 없으므로 `null`
- 이후 구간의 평균을 `aggregated.turnover`로 보고함
- 교체율 0% = 포트폴리오 완전 동일, 100% = 완전 교체

---

## 7. IC 계산 유효성

`validIcPairCount`: 해당 OOS 구간에서 팩터 스코어와 forward return이 모두 유효한(null이 아닌) 페어의 수.

- `validIcPairCount < 3` → `insufficient_ic_pairs` 경고 발생
- IC 계산 시 null 페어는 제외하고 유효 페어만 사용

---

## 8. 적용 범위

이 정책은 다음 파일에 구현되어 있습니다.

- `src/domain/backtest/backtest-result.ts` — 타입 정의
- `src/server/backtest/portfolio-simulator.ts` — `generateValidityReport()` 함수
- `src/server/backtest/backtest-engine.ts` — `runPriceOnlyBacktest()` 통합
- `src/components/backtest/BacktestWorkspace.tsx` — `ValidityReportBadge` UI

---

## 9. 투자 조언 면책 고지

> [!CAUTION]
> 이 백테스트 결과는 전략 연구를 위한 **진단 신호**이며 **투자 조언이 아닙니다**.  
> K-Terminal은 매수·매도 추천을 절대 제공하지 않습니다.  
> `not_for_investment_decision` 경고는 항상 포함되며 제거할 수 없습니다.
