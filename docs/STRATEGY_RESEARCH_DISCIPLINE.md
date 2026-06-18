# Strategy Research Discipline

이 문서는 K-Terminal에서 퀀트 전략을 연구하고 기록하는 방식을 정의한다.

---

## 1. 핵심 원칙

### 1.1 모든 전략 실험을 기록한다

성과가 좋든 나쁘든, 모든 전략 실험을 `StrategyTrialRecord`로 기록한다.
rejected 전략을 삭제하지 않는다. 전략 묘지는 다중검정 위험을 추적하는 핵심 도구다.

### 1.2 백테스트 결과만 보고 active 전략으로 등록하지 않는다

백테스트 성과 지표가 좋더라도 자동으로 전략을 활성화하지 않는다.
`validationStatus`는 `draft` → `backtested` → `watch_candidate` 순으로만 상승할 수 있고,
각 단계마다 human review가 필요하다.

### 1.3 데이터 스누핑을 방지한다

- 같은 `strategyId`에 변형(variant)이 5개 이상이면 `data_snooping_possible` 경고.
- 동일 `parameterHash`의 중복 실험을 차단한다.
- OOS 기간이 6개월 미만이면 `insufficient_oos_period` 경고.

### 1.4 개별 신호 IC를 composite IC와 분리한다

Momentum v1 composite IC만 보지 않는다.
8개 atomic signal별 IC를 개별로 측정하고, 음수 IC 신호를 식별한다.

### 1.5 시장 노출도를 측정한다

전략이 시장 상승에만 의존하는지 확인한다.
beta > 1.2이면 `high_market_beta` 경고.
risk_off 구간 성과 -5% 이하이면 `regime_dependency_high` 경고.

---

## 2. 전략 실험 생애주기

```
draft
  ↓ (bias checker 자동 실행)
backtested  → (OOS 지표 기록 후)
  ↓
watch_candidate  → (human review 후)
  ↓
frozen / retired  (성과 악화 시)

rejected  (어느 단계에서도 가능)
```

**주의**: `watch_candidate` 이상은 자동 설정할 수 없다. 항상 human review가 필요하다.

---

## 3. 금지 표현

아래 표현은 UI와 문서에서 절대 사용하지 않는다:

| 금지 표현 | 허용 대체 표현 |
|---|---|
| 검증된 수익 전략 | 전략 연구 기록 |
| 수익 가능성 높음 | 표본 부족 / 데이터 부족 |
| 매수 유망 | 기능 검증용 |
| 시장중립 완성 | 시장 방향성 노출 측정 결과 |
| 시장을 이기는 전략 | OOS IC 측정 결과 |

---

## 4. 편향 경고 분류

| Warning | 설명 |
|---|---|
| `survivorship_bias_possible` | 생존한 종목만 분석 |
| `lookahead_bias_possible` | 미래 데이터가 신호에 사용됨 가능성 |
| `data_snooping_possible` | 변형 5개 이상 또는 반복 최적화 |
| `insufficient_oos_period` | OOS 기간 6개월 미만 |
| `sample_universe_only` | 샘플 유니버스 전용 (항상 첨부) |
| `adjusted_price_missing` | 수정주가 미사용 |
| `high_parameter_sensitivity` | 파라미터 변화에 성과 민감 |
| `high_market_beta` | betaToBenchmark > 1.2 |
| `regime_dependency_high` | risk_off 구간 성과 -5% 이하 |

---

## 5. 연구 프로세스 체크리스트

전략을 처음 등록할 때 반드시 확인한다:

- [ ] 가설이 명확하게 문서화되었는가?
- [ ] 같은 strategyId에 변형이 5개 미만인가?
- [ ] OOS 기간이 6개월 이상인가?
- [ ] 성과가 나쁜 변형도 `rejected`로 기록했는가?
- [ ] 개별 신호 IC가 composite IC와 다른 패턴을 보이는가?
- [ ] 시장 하락 구간에서의 성과를 확인했는가?
- [ ] risk_off / panic Regime에서의 성과를 확인했는가?
