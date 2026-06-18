# K-Terminal Master Task Board

## Product Direction

K-Terminal은 개인 투자자가 미국주식과 한국주식을 분석하고, 백테스트하며, 신호 신뢰도를 판단하고 실시간 경보를 받아보는 고유의 금융 분석 시스템이다. 실거래 주문, 모의주문, 자동매매는 영구 제외다.

---

## Non-Negotiable Principles

1. **No Fake Data**: 가짜 금융 데이터 사용 금지. null 값을 0으로 변환 금지.
2. **DataEnvelope\<T\>**: 모든 market, filing, financial, news, factor, strategy, portfolio API 응답에 사용.
3. **No Direct Trading**: 실주문, 모의주문, 자동매매 영구 제외.
4. **KR Finance Color Convention**: 상승/긍정 = RED, 하락/부정 = BLUE. 시맨틱 토큰만 사용. 직접 하드코드 금지.
5. **No Emojis in UI**: `lucide-react` 아이콘만 사용.
6. **No Box Shadows**: 반투명 border + 레이어 다크 서피스 사용.
7. **Strategy Safety**: "매수 확정", "매도 확정", "수익 보장", "추천 확정" 레이블 금지. "검토", "관망", "주의", "위험", "데이터 부족" 사용.
8. **CNN/Crypto Fear & Greed**: Reference Panel 표시 전용. 핵심 시그널/전략 계산 연결 금지.
9. **YouTube Transcript API / GPT Vision / Selenium**: 제품 코드 추가 영구 금지.
10. **LLM은 계산자가 아니다**: LLM은 이미 계산된 결과를 설명할 때만 사용. 향후 Structured Output으로만 허용.

---

## Quant Architecture Decisions

### 결정 1. LLM은 계산자가 아니다
LLM은 퀀트 점수, 팩터값, 전략 선택, 백테스트 결과를 계산하지 않는다.
LLM은 이미 계산된 결과를 사용자가 요청할 때만 설명한다.

### 결정 2. 재무 팩터 백테스트는 Point-in-Time 인프라 전까지 금지
ROE, PBR, PER, ROIC, FCF Yield 등 재무 팩터는 `dataAvailableAt`이 확보되기 전까지 백테스트에 사용하지 않는다.

### 결정 3. 가격/기술 팩터를 먼저 구현한다
가격/기술 팩터는 OHLCV 기반이므로 재무 팩터보다 먼저 검증 가능한 최소 엔진을 만들 수 있다.
단, 운용 검증용 백테스트에는 수정주가와 과거 유니버스 멤버십이 필요하다.

### 결정 4. 전략 묘지를 남긴다
활성 전략뿐 아니라 폐기된 전략, 실패한 파라미터 조합, rejected 전략까지 모두 기록한다.
그래야 다중검정과 과최적화 위험을 추적할 수 있다.

### 결정 5. 신호 합의는 horizon별로 분리한다
단기, 중기, 장기 신호를 단일 평균으로 뭉개지 않는다.
예: 단기 과열 + 장기 저평가 = neutral이 아니라 cross-horizon tension이다.

### 결정 6. 적용 불가와 중립은 다르다
특정 뷰가 종목에 적용 불가능하면 neutral이 아니라 denominator에서 제외한다.

### 결정 7. 유명 기술분석법은 Atomic Signal로 흡수한다
일목균형표, 다윈 박스, 터틀 채널, 와인스타인 스테이지는 별도 구루 뷰가 아니라 검증 가능한 Atomic Signal로 추가한다.

### 결정 8. Research Intake는 초안 작성 보조다
LLM이 문서에서 전략을 추출하더라도 `StrategySpecDraft`까지만 생성한다.
자동 백테스트 큐 진입 또는 active 전략 등록은 human review 이후에만 가능하다.

---

## Work Order Roadmap (Completed Milestones)

- **WO-001**: Market Board UI 기반, Dark Terminal 스타일, 유니버스 데이터 그리드.
- **WO-002**: Provider Registry 및 Budget Management.
- **WO-003**: yfinance Direct Fallback Worker, Snapshot Loader, Fallback Guardrails.
- **WO-004**: 한국어/영어 i18n, KIS Open API Read-only 연결, 보안 레이어.
- **WO-005**: Alert Rule Engine 기반, Notification Hub 인프라, Daily Report 스켈레톤.
- **WO-006**: App Preferences, 시스템 폴리시, TopCommandBar Settings, 문서화.
- **WO-007**: Quant Spec 통합, Technical Factor 기반 (Ichimoku, Darvas Box, Turtle Channel, Weinstein Stage), Factor Store/Registry/Signal Ensemble Types.
- **WO-008**: Technical Factor Engine 통합, AtomicSignal 계산, Momentum v1.
- **WO-009**: 가격 전용 Walk-forward Backtest Engine + UI.
- **WO-010**: Signal Reliability Engine (Spearman IC, ICIR, Bayesian Shrinkage) + Weight Preview.
- **WO-011**: 추가 신호 신뢰도 및 horizon-segmented agreement 타입 정의.
- **WO-012**: Provider API Settings Center, OpenDART E2E 안정화, Secret 암호화 저장.
- **WO-013**: Alert Rule Engine 실데이터 연결, Filing/Provider/Signal/Macro/Price/Volume 이벤트 탐지, Web Inbox 안정화.
- **WO-014**: Macro Playbook Intake, Regime Gate v1, Sentiment Reference Panel (CNN/Crypto Fear & Greed 격리).
- **WO-015**: Theme Hydration Mismatch 수정, data-theme/data-theme-preference 정책 정립, SSR 날짜 안전화, Product Scope Policy 문서화.
- **WO-016**: State Reconciliation + Missing Implementation Audit + Task Board Reset.
- **WO-016-A**: Codex Review Fix (PIT As-Of Ordering + Strict OHLCV Timestamp Validation).
- **WO-016-B**: Final Hardening (Strict ISO Datetime Overflow Check + PIT Timestamp Canonical Policy + Task Board Correction).

## Next Work Order Candidate
- **WO-017**: Quant Strategy Research Discipline + Anti-Data-Snooping Guard

---

## Current Work Order: WO-016-B — Final Hardening: Strict ISO Datetime Overflow Check + PIT Timestamp Canonical Policy + Task Board Correction

### 목적
ISO datetime overflow/range 차단 보강, PIT timestamp canonical format 정책 추가 및 createPitRecord validator 적용, task.md 이정표 수정.

### Checklist
- [x] Phase 1: validateOhlcvCandle에서 ISO datetime 분/초/시/일/월 오버플로우 검증 보강
- [x] Phase 2: PIT record timestamps canonical format 정책 정의 및 createPitRecord 검증 구현
- [x] Phase 3: docs/PIT_DATA_POLICY.md, docs/IMPLEMENTATION_INVENTORY.md에 정책 및 구현 사항 추가
- [x] Phase 4: task.md 완료 이정표에서 WO017 제거 및 candidate 지정
- [x] Phase 5: Verification (typecheck, lint, test, build)



---

## Product Scope

### 유지 및 고도화 (Maintained & Core)
- DataEnvelope\<T\> / DataStatus / SourceWarning
- Provider Settings Center (API Key 입력/검증/암호화)
- OpenDART Integration (공시 검색/이벤트)
- KIS Read-Only (계좌 잔고/평가)
- Market Board & Technical Signals (Ichimoku, Darvas Box, Weinstein Stage, Turtle Channel)
- Momentum Factor v1 (단기/중기/장기)
- Backtest Engine (Walk-forward OOS)
- Signal Reliability Engine (IC, ICIR, Bayesian Shrinkage)
- Regime Gate v1 (거시 필터 — 전략 적합도 제한 전용, 주문 판단 금지)
- Alert Web Inbox (이벤트 탐지 → 대시보드 알림)
- Sentiment Reference Panel (격리 표시 전용)

### 동결 (Frozen — 현 상태 유지, 고도화 없음)
- LLM Model Tier Router
- Strategy Selector 자동화
- Research Intake Engine
- Multi-channel Notification Hub 확장 (Telegram/Kakao/Email)
- Daily Report 자동 발송
- Order Preview / Execution
- Deflated Sharpe Ratio

### 제외 (Excluded — 영구 제외)
- YouTube Transcript API, GPT Vision, Selenium
- 부동산 데이터
- 예금/적금/대출/보험/카드 상품 비교
- 금융회사 지점/ATM 정보
- 금융민원 통계, 기관별 보도자료 단순 목록
- 금융교육 콘텐츠

---

## P0 — 즉시 구현 필요

1. **Factor Correlation Audit**: 팩터 간 상관관계 감사 스크립트 및 UI 표시.
2. **Individual Signal IC Audit**: 개별 시그널별 IC 감사 리포트.
3. **Signal Stability Gate**: `flipCount`, `consecutiveDays` 기반 신호 안정성 게이트.
4. **StrategyTrialRecord (Light)**: 전략 시도 기록 및 전략 묘지 지원.
5. **Structured Output Guard (Skeleton)**: LLM 설명 출력 구조화 가드 스켈레톤.

## P1 — 단기 구현 예정

1. **Earnings Event Minimal**: 영업이익/순이익 기반 최소 어닝 이벤트 탐지.
2. **Signal History Visualization**: 신호 이력 시각화 컴포넌트.
3. **Cross-horizon Tension Indicator**: 단기/중기/장기 신호 갈등 시각화.

## P2 — 중기 검토

1. **Portfolio / Sector Exposure**: 보유 포지션 섹터 익스포저 시각화.
2. **SerpAPI On-demand News**: 외부 뉴스 온-디맨드 조회 (키워드 기반).

---

## Verification Commands

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run docs:check
npm run docs:quant
npm run check:wording
npm run check:alpha-ui
```

---

## Global Failure Criteria

- TypeScript 컴파일 에러
- ESLint 에러 (warning은 허용)
- 필수 문서 누락
- 테스트 실패
- 비시맨틱 스타일링 또는 UI에 이모지 사용
- `data-theme="system"` HTML 속성 출력
- 제외 항목 코드 진입 (YouTube/Selenium/GPT Vision 등)
- CNN/Crypto Fear & Greed가 Regime Score 계산에 연결
