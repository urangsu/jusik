# Implementation Inventory

> WO-016 기준 구현 상태 감사 문서  
> 최종 갱신: 2026-06-18  
> 검증 기준: `npm run typecheck && npm run lint && npm run test && npm run build`

---

## 1. Core Feature Status

| Area | Status | Evidence | Runtime Verified | Notes |
|---|---|---|---|---|
| Market Board UI | **implemented** | `src/app/markets/page.tsx`, `MarketBoardPage.tsx` | ✓ | KOSPI/SPX 유니버스 토글, Heatmap, Screener |
| Provider Registry | **implemented** | `src/server/providers/provider-registry.ts` | ✓ | Budget Manager 포함 |
| yfinance Fallback | **implemented** | `src/server/providers/yfinance-personal-provider.ts` | ✓ | Personal use fallback |
| KIS Read-Only | **implemented** | `src/server/providers/kis/` | ✓ | 계좌 조회, 시세 조회 (주문 route는 skeleton) |
| i18n KO/EN | **implemented** | `src/i18n/` | ✓ | 한국어/영어 전환 |
| Technical Signal Engine | **implemented** | `src/server/factors/technical-signal-engine.ts` | ✓ | Ichimoku, Darvas Box, Turtle Channel, Weinstein Stage, Momentum v1 |
| AtomicSignal Calculator | **implemented** | `src/server/factors/atomic-signal-calculator.ts` | ✓ | |
| Momentum Factor v1 | **implemented** | `src/server/factors/momentum-factor-v1.ts` | ✓ | 단기/중기/장기 horizon |
| Walk-forward Backtest | **implemented** | `src/server/backtest/` | ✓ | IC 계산, OOS 시뮬레이션, Transaction Cost |
| Signal Reliability Engine | **implemented** | `src/server/reliability/` | ✓ | Spearman IC, ICIR, Bayesian Shrinkage, Weight Multiplier |
| Provider API Settings | **implemented** | `src/server/settings/` | ✓ | Secret Store, Health Checker, Config Resolver |
| OpenDART Integration | **implemented** | `src/server/opendart/`, `src/server/filings/` | ✓ | Corp Code Store, Disclosure Search, Sync Service |
| Alert Rule Engine | **implemented** | `src/server/alerts/` | ✓ | Evaluator, Cooldown, Deduper, Detectors (5종) |
| Notification Hub | **implemented** | `src/server/notifications/` | ✓ | Web Inbox, Console Channel. Telegram/Kakao/Email은 skeleton |
| Macro Playbook | **implemented** | `src/server/macro/macro-playbook-store.ts` | ✓ | 메모 CRUD, Regime Implication 태깅 |
| Regime Gate v1 | **implemented** | `src/server/regime/` | ✓ | RegimeEngine, RegimeGate (전략 적합도 필터 전용) |
| Sentiment Reference Panel | **implemented** | `src/server/sentiment/`, `SentimentReferencePanel.tsx` | ✓ | CNN/Crypto F&G 격리 표시 |
| Theme Hydration Fix | **implemented** | `src/theme/`, `layout.tsx` | ✓ | data-theme/data-theme-preference 분리, system 값 HTML 금지 |
| Daily Report Engine | **implemented_but_sample_only** | `src/server/reports/` | - | 생성 로직 완성, 발송 채널 없음 |
| Strategy Suitability Service | **implemented** | `src/server/strategy/strategy-suitability-service.ts` | ✓ | Regime Gate 기반 적합도 판별 |
| Factor Store | **implemented** | `src/server/factors/factor-store.ts` | ✓ | |
| Signal History Store | **implemented** | `src/server/signals/signal-history-store.ts` | ✓ | |
| PIT Store | **implemented** | `src/server/data/in-memory-pit-store.ts` | ✓ | In-memory only (운용용 PIT DB 미구현) |
| Factor Correlation Audit | **implemented** | `src/server/audit/factor-correlation-auditor.ts` | ✓ | 팩터 간 상관관계 감사 및 경고 |
| Individual Signal IC Audit | **implemented** | `src/server/audit/individual-signal-ic-auditor.ts` | ✓ | 개별 시그널의 1w/1m/3m IC 요약 및 경고 |
| Watchlist Store | **implemented** | `src/server/watchlist/watchlist-store.ts` | ✓ | 관심종목 저장소 및 CRUD |
| Watchlist Report Inbox & Aggregator | **implemented** | `src/server/watchlist/watchlist-report-aggregator.ts` | ✓ | 관심종목 자산별 공시/경보/사후검토 취합 |
| Market Exposure Audit | **implemented** | `src/server/audit/market-exposure-auditor.ts` | ✓ | 전략별 시장 노출도(Beta, capture 등) 감사 |
| Audit Finding Router | **implemented** | `src/server/audit/audit-finding-aggregator.ts` | ✓ | 감사 결과 취합 및 Finding 라우팅 |
| Signal Stability Gate | **missing_p0** | - | - | flipCount/consecutiveDays 미구현 |
| StrategyTrialRecord | **implemented** | `src/domain/strategy/strategy-trial-record.ts`, `strategy-trial-store.ts` | ✓ | 전략 묘지/시도 기록 및 중복 감지 |
| Structured Output Guard | **missing_p0** | - | - | LLM 출력 검증 가드 없음 |
| Earnings Event Minimal | **missing_p1** | - | - | 영업이익/순이익 이벤트 탐지 없음 |
| Signal History Visualization | **missing_p1** | - | - | UI 컴포넌트 없음 |
| Cross-horizon Tension UI | **missing_p1** | - | - | 타입 정의만 존재 |
| Portfolio/Sector Exposure | **deferred_p2** | - | - | |
| SerpAPI On-demand News | **deferred_p2** | - | - | |

---

## 2. API Route Status

| Route | Status | DataEnvelope | Auth/Guard | Notes |
|---|---|---|---|---|
| `GET /api/markets/snapshot` | **implemented** | ✓ | - | |
| `GET /api/market/quote` | **implemented** | ✓ | - | |
| `GET /api/market/ohlcv` | **implemented** | ✓ | - | |
| `GET /api/factors/technical` | **implemented** | ✓ | - | |
| `GET /api/factors/momentum` | **implemented** | ✓ | - | |
| `POST /api/backtest/run` | **implemented** | ✓ | - | |
| `GET /api/backtest/index` | **implemented** | ✓ | - | |
| `GET /api/backtest/[runId]` | **implemented** | ✓ | - | |
| `POST /api/backtest/consistency-check` | **implemented** | ✓ | - | |
| `POST /api/reliability/calculate` | **implemented** | ✓ | - | |
| `GET /api/reliability/signals` | **implemented** | ✓ | - | |
| `GET /api/reliability/momentum-preview` | **implemented** | ✓ | - | |
| `GET /api/opendart/disclosures` | **implemented** | ✓ | - | |
| `POST /api/opendart/sync` | **implemented** | ✓ | JobRouteGuard | |
| `GET /api/opendart/corp-code` | **implemented** | ✓ | - | |
| `GET /api/filings/recent` | **implemented** | ✓ | - | |
| `GET /api/filings/[receiptNo]` | **implemented** | ✓ | - | |
| `GET /api/alerts/events` | **implemented** | ✓ | - | |
| `POST /api/alerts/evaluate` | **implemented** | ✓ | - | |
| `POST /api/alerts/preferences` | **implemented** | ✓ | - | |
| `GET /api/alerts/rules` | **implemented** | ✓ | - | |
| `POST /api/alerts/events/[id]/read` | **implemented** | ✓ | - | |
| `POST /api/alerts/events/[id]/dismiss` | **implemented** | ✓ | - | |
| `GET /api/notifications/history` | **implemented** | ✓ | - | |
| `POST /api/notifications/test` | **implemented** | ✓ | - | |
| `GET /api/notifications/channels` | **implemented** | ✓ | - | |
| `GET /api/providers/health` | **implemented** | ✓ | - | |
| `GET /api/settings/providers` | **implemented** | ✓ | SettingsWriteGuard | |
| `GET/PUT /api/settings/providers/[id]` | **implemented** | ✓ | SettingsWriteGuard | |
| `POST /api/settings/providers/[id]/health-check` | **implemented** | ✓ | - | |
| `PUT /api/settings/providers/[id]/secret/[key]` | **implemented** | ✓ | SettingsWriteGuard | |
| `GET /api/macro/playbook` | **implemented** | ✓ | - | |
| `POST /api/macro/playbook/notes` | **implemented** | ✓ | SettingsWriteGuard | |
| `GET /api/regime/current` | **implemented** | ✓ | - | |
| `POST /api/regime/evaluate` | **implemented** | ✓ | - | |
| `GET /api/sentiment/references` | **implemented** | ✓ | - | |
| `POST /api/sentiment/references/refresh` | **implemented** | ✓ | JobRouteGuard | |
| `GET /api/signals/current` | **implemented** | ✓ | - | |
| `GET /api/signals/history` | **implemented** | ✓ | - | |
| `GET /api/jobs/technical-factors` | **implemented** | ✓ | JobRouteGuard | |
| `POST /api/broker/kis/account` | **implemented** | ✓ | - | Read-only |
| `GET /api/broker/kis/balance` | **implemented** | ✓ | - | Read-only |
| `GET /api/broker/kis/health` | **implemented** | ✓ | - | |
| `POST /api/broker/kis/order` | **skeleton_only** | ✓ | - | 항상 거부 응답. 실주문 영구 제외 |
| `GET /api/watchlist` | **implemented** | ✓ | - | 관심종목 조회 |
| `POST /api/watchlist` | **implemented** | ✓ | SettingsWriteGuard | 관심종목 추가 |
| `PATCH /api/watchlist/[assetId]` | **implemented** | ✓ | SettingsWriteGuard | 관심종목 수정 |
| `DELETE /api/watchlist/[assetId]` | **implemented** | ✓ | SettingsWriteGuard | 관심종목 삭제 |
| `GET /api/watchlist/reports` | **implemented** | ✓ | - | 수집된 리포트 조회 |
| `GET /api/watchlist/reports/unread-count` | **implemented** | ✓ | - | 읽지 않은 리포트 갯수 조회 |
| `POST /api/watchlist/reports/aggregate` | **implemented** | ✓ | SettingsWriteGuard | 관심종목 관련 리포트 수집 실행 |
| `PATCH /api/watchlist/reports/[id]/status` | **implemented** | ✓ | SettingsWriteGuard | 리포트 읽음/보관/숨김 상태 갱신 |
| `GET /api/audit/findings` | **implemented** | ✓ | - | 필터링된 감사 Finding 조회 |
| `POST /api/audit/findings/run` | **implemented** | ✓ | SettingsWriteGuard | 감사 Finding 생성/갱신 취합 실행 |
| `POST /api/ai/structured-output/validate` | **implemented** | ✓ | - | AI 설명구조 출력 검증 |
| `GET /api/ai/context-pack/audit-finding` | **implemented** | ✓ | - | 감사 Finding용 Context Pack 조회 |
| `POST /api/ai/explanation-requests/audit-finding` | **implemented (WO017-H)** | ✓ | - | AI 설명 요청 접수, 계약 수립 및 캐시 처리 |
| `GET /api/ai/explanation-cache` | **implemented (WO017-H)** | ✓ | - | 일반 AI 설명 캐시 내역 조회 및 필터링 |
| `GET /api/ai/explanation-cache/blocked` | **implemented (WO017-H)** | ✓ | - | AI 설명 출력 차단(Blocked) 로그 기록 조회 |
| `POST /api/ai/mock-output/audit-finding` | **implemented (WO017-I)** | ✓ | - | AI 설명 검증을 위한 Mock Structured Output 생성 및 가드 통합 테스트 |
| `POST /api/ai/replay/audit-finding` | **implemented (WO017-J)** | ✓ | - | E2E 회귀 검증을 위한 Golden Cases 리플레이 분석 수행 |
| `GET /api/ai/replay` | **implemented (WO017-J)** | ✓ | - | 리플레이 검증 결과 레저 기록 조회 및 필터링 |
| `GET /api/ai/providers` | **implemented (WO017-K)** | ✓ | - | AI Provider 정책 상태 및 Registry 목록 조회 |
| `POST /api/ai/providers/run` | **implemented (WO017-K)** | ✓ | - | Guarded Provider Pipeline 실행 (외부 disabled provider 포함, not_supported 반환) |
| `POST /api/ops/smoke/run` | **implemented (WO017-L)** | ✓ | - | 운영 스모크 하네스 실행 (10개 대상, DataEnvelope 반환) |
| `GET /api/ops/smoke/latest` | **implemented (WO017-L)** | ✓ | - | 최근 스모크 결과 조회 |

---

## 3. Script Status

| Script (`npm run ...`) | Status | Notes |
|---|---|---|
| `factors:technical` | **implemented** | `scripts/factors/calculate-technical-factors.ts` |
| `backtest:run` | **implemented** | `scripts/backtest/run-backtest.ts` |
| `backtest:consistency` | **implemented** | `scripts/backtest/check-consistency.ts` |
| `reliability:calculate` | **implemented** | `scripts/reliability/calculate-signal-reliability.ts` |
| `reliability:inspect` | **implemented** | `scripts/reliability/inspect-signal-reliability.ts` |
| `opendart:import-corp-codes` | **implemented_but_provider_disabled** | API Key 없으면 실패 |
| `opendart:search` | **implemented_but_provider_disabled** | API Key 없으면 실패 |
| `opendart:sync` | **implemented_but_provider_disabled** | API Key 없으면 실패 |
| `macro:evaluate` | **implemented** | `scripts/macro/evaluate-regime.ts` |
| `sentiment:refresh` | **implemented_but_provider_disabled** | CNN/Crypto F&G 외부 API 의존 |
| `alerts:evaluate` | **implemented** | `scripts/alerts/evaluate-alerts.ts` |
| `reports:daily` | **implemented_but_sample_only** | 발송 채널 없음 (Console 출력만) |
| `audit:findings` | **implemented** | `scripts/audit/audit-findings.ts` |
| `docs:check` | **implemented** | ✓ pass |
| `docs:quant` | **implemented** | ✓ pass |
| `check:wording` | **implemented** | ✓ pass (docs 내 정책 설명 문구는 warn-only) |
| `check:alpha-ui` | **implemented** | ✓ pass |
| `ops:smoke` | **implemented (WO017-L)** | 운영 스모크 하네스 CLI (서버 실행 필요) |
| `ai:replay` | **implemented (WO017-J)** | Golden Case AI 처리 레플레이 |

---

## 4. UI Component Status

| Component | Status | SSR Safe | Notes |
|---|---|---|---|
| `TerminalShell` | **implemented** | ✓ | 전체 레이아웃 쉘. 활성 탭 대응만 분기 렌더링 |
| `TopCommandBar` | **implemented** | ✓ | 상단 메뉴 바. 실 구현된 7개 탭만 노출 (나머지는 UI에서 제외/유지보수 보류) |
| `LeftRail` / `RightRail` | **implemented** | ✓ | |
| `BottomStatusBar` | **implemented** | ✓ | |
| `MarketBoardPage` | **implemented** | ✓ | mounted 가드, toLocaleString 보호 |
| `MarketBoardToolbar` | **implemented** | ✓ | mounted 가드 적용 |
| `MarketHeatmap` | **implemented** | ✓ | |
| `MarketScreenerTable` | **implemented** | ✓ | |
| `MarketBoardDiagnostics` | **implemented** | ✓ | |
| `MomentumFactorPanel` | **implemented** | ✓ | |
| `TechnicalSignalBadge` / `List` | **implemented** | ✓ | |
| `BacktestWorkspace` | **implemented** | ✓ | |
| `BacktestRunPanel` | **implemented** | ✓ | mounted 가드 (날짜 기본값) |
| `BacktestMetricCard` | **implemented** | ✓ | |
| `IcChart` | **implemented** | ✓ | |
| `OosSummaryTable` | **implemented** | ✓ | |
| `ReliabilityWorkspace` | **implemented** | ✓ | |
| `SignalReliabilityTable` | **implemented** | ✓ | |
| `WeightMultiplierPreview` | **implemented** | ✓ | |
| `ReliabilityMetricCards` | **implemented** | ✓ | |
| `AlertSettingsPage` | **implemented** | ✓ | |
| `AlertInbox` | **implemented** | ✓ | |
| `AlertEventCard` / `List` | **implemented** | ✓ | |
| `AlertRuleEditor` | **implemented** | ✓ | |
| `NotificationHistoryTable` | **implemented** | ✓ | |
| `MacroPlaybookPanel` | **implemented** | ✓ | WO016에서 mounted + toLocaleDateString 보완 |
| `MacroRegimePanel` | **implemented** | ✓ | |
| `SentimentReferencePanel` | **implemented** | ✓ | CNN/Crypto F&G 격리 패널 |
| `ProviderApiSettingsPanel` | **implemented** | ✓ | |
| `ProviderSettingCard` | **implemented** | ✓ | |
| `SecretInput` | **implemented** | ✓ | |
| `AppPreferencesDialog` | **implemented** | ✓ | |
| `ThemeToggle` | **implemented** | ✓ | |
| `LocaleToggle` | **implemented** | ✓ | |
| `RecentFilingsList` | **implemented** | ✓ | |
| `FilingTypeBadge` | **implemented** | ✓ | |
| `AssetSearchBox` | **implemented** | ✓ | |
| `StrategyWorkspace` | **implemented** | ✓ | |
| `StrategyAgreementBar` / `Tab` | **implemented** | ✓ | |
| `StdDevTradingTab` / `Card` | **implemented** | ✓ | |
| `SignalGauge` / `StabilityBadge` | **implemented** | ✓ | |
| `VetoReasonList` | **implemented** | ✓ | |
| `FactorEnvironmentPanel` | **implemented** | ✓ | |
| `RiskDecompositionPanel` | **implemented** | ✓ | |
| `SignalHistory UI` | **missing_p1** | - | Signal History Store 존재하나 UI 없음 |

---

## 5. Provider Status

| Provider | Status | Real API | Secret Required | Fallback | Notes |
|---|---|---|---|---|---|
| yfinance (personal) | **implemented** | ✗ (unofficial) | ✗ | ✓ | 개인용 fallback. SourceWarning 표시 |
| stooq (personal) | **implemented** | ✗ (unofficial) | ✗ | ✓ | 개인용 fallback |
| KIS Domestic | **implemented** | ✓ | ✓ (APP_KEY, APP_SECRET) | ✗ | Read-only |
| KIS Overseas | **implemented** | ✓ | ✓ | ✗ | Read-only |
| OpenDART | **implemented_but_provider_disabled** | ✓ | ✓ (OPENDART_API_KEY) | ✗ | Key 등록 필요 |
| FMP Free | **implemented** | ✓ (limited) | ✓ (FMP_API_KEY) | ✗ | Free tier |
| Finnhub Free | **implemented** | ✓ (limited) | ✓ (FINNHUB_API_KEY) | ✗ | Free tier |
| Alpha Vantage | **implemented** | ✓ (limited) | ✓ (ALPHA_VANTAGE_API_KEY) | ✗ | Free tier |
| SEC EDGAR | **implemented** | ✓ | ✗ | ✗ | |
| Manual Import | **implemented** | ✗ | ✗ | ✗ | CSV 수동 임포트 |
| Telegram | **skeleton_only** | - | ✓ | - | 동결 상태 |
| Kakao | **skeleton_only** | - | ✓ | - | 동결 상태 |
| Email SMTP | **skeleton_only** | - | ✓ | - | 동결 상태 |
| CNN Fear & Greed | **implemented** | ✓ | ✗ | ✗ | Reference Panel 전용 (core 신호 연결 금지) |
| Crypto Fear & Greed | **implemented** | ✓ | ✗ | ✗ | Reference Panel 전용 |

---

## 6. Missing / Deferred / Excluded

| Item | Classification | Reason | Trigger |
|---|---|---|---|
| Factor Correlation Audit | **missing_p0** | 팩터 간 다중공선성 감지 없음 | 팩터 추가 전 필수 |
| Individual Signal IC Audit | **implemented (WO017-C)** | `src/server/audit/individual-signal-ic-auditor.ts` | 신호 추가 전 필수 |
| Signal Stability Gate | **missing_p0** | flipCount/consecutiveDays 미구현 | 잦은 신호 반전 감지 |
| StrategyTrialRecord | **implemented (WO017-B)** | `src/domain/strategy/strategy-trial-record.ts` | 다중검정 추적 기반 |
| Structured Output Guard | **missing_p0** | LLM 출력 검증 없음 | LLM 기능 추가 전 필수 |
| Earnings Event Minimal | **missing_p1** | 영업이익/순이익 이벤트 탐지 없음 | OpenDART 재무 데이터 연결 시 |
| Signal History Visualization | **missing_p1** | Store는 구현, UI 없음 | 신호 이력 분석 UI 필요 시 |
| Cross-horizon Tension UI | **missing_p1** | 타입 정의만 존재, UI 없음 | horizon-segmented 신호 시각화 시 |
| Deflated Sharpe Ratio | **frozen** | 기술적 채무 이슈, 동결 결정 | 과최적화 감사 시 재검토 |
| LLM Model Tier Router | **frozen** | 현 상태 동결 | LLM 기능 활성화 시 재검토 |
| Order Preview / Execution | **frozen** | 실거래 영구 제외 정책 | - |
| Multi-channel Notification | **frozen** | Web Inbox 중심 작동 | Telegram/Kakao/Email 채널 활성화 시 |
| Daily Report 자동 발송 | **frozen** | 발송 채널 없음 | Multi-channel 활성화 시 |
| YouTube Transcript API | **excluded** | 제품 범위 영구 제외 | 추가 금지 |
| GPT Vision | **excluded** | 제품 범위 영구 제외 | 추가 금지 |
| Selenium | **excluded** | 제품 범위 영구 제외 | 추가 금지 |
| 부동산 데이터 | **excluded** | 제품 범위 영구 제외 | 추가 금지 |
| 예금/대출/보험/카드 | **excluded** | 제품 범위 영구 제외 | 추가 금지 |
| 금융교육 콘텐츠 | **excluded** | 제품 범위 영구 제외 | 추가 금지 |
| Portfolio/Sector Exposure | **deferred_p2** | 중기 검토 | 포지션 관리 기능 시 |
| SerpAPI On-demand News | **deferred_p2** | 중기 검토 | 뉴스 통합 기능 시 |
| PIT Database (운용용) | **deferred_p2** | in-memory만 존재 | 재무 팩터 백테스트 시 |

---

## 7. Hydration Safety Summary

| Component | Risk | Status | Fix |
|---|---|---|---|
| `layout.tsx` | `data-theme="system"` SSR | **fixed (WO015)** | `resolveThemeForServer()` 적용, `suppressHydrationWarning` |
| `ThemeScript` | 클라이언트 초기화 경쟁 | **fixed (WO015)** | 인라인 스크립트가 `data-theme`, `data-theme-preference` 모두 설정 |
| `BacktestRunPanel` | 날짜 기본값 SSR 불일치 | **fixed (WO015)** | `mounted` 가드로 빈 문자열 초기화 |
| `MarketBoardToolbar` | `generatedAt` 로케일 불일치 | **fixed (WO015)** | `mounted` 조건부 렌더링 |
| `MarketBoardPage` | `toLocaleString()` | **fixed (WO015)** | `mounted` 조건부 렌더링 |
| `MacroPlaybookPanel` | `toLocaleDateString()` | **fixed (WO016)** | `mounted` 가드 + 로케일 명시 |
| `MacroRegimePanel` | - | **safe** | client-only fetch, SSR unsafe 패턴 없음 |
| `SentimentReferencePanel` | - | **safe** | client-only fetch, SSR unsafe 패턴 없음 |

---

## 8. Product Scope Check Results

```
youtube-transcript  : ✗ 코드 없음 (docs 설명 제외)
youtube_transcript  : ✗ 코드 없음
selenium            : ✗ 코드 없음
GPT Vision          : ✗ 코드 없음
부동산              : ✗ 코드 없음 (docs PRODUCT_SCOPE_POLICY.md 설명 제외)
아파트              : ✗ 코드 없음
대출                : ✗ 코드 없음
보험                : ✗ 코드 없음
카드                : ✗ 코드 없음
금융교육            : ✗ 코드 없음
민원                : ✗ 코드 없음
```

모든 제외 항목이 제품 코드에 부재함을 확인. **PASS**

---

## 9. Verification Checklist

| Command | Result |
|---|---|
| `npm run typecheck` | ✓ PASS (0 errors) |
| `npm run lint` | ✓ PASS (0 errors, 377 warnings — `any` 타입 등) |
| `npm run test` | ✓ PASS (151 files, 454 tests) |
| `npm run build` | ✓ PASS |
| `npm run docs:check` | ✓ PASS |
| `npm run docs:quant` | ✓ PASS |
| `npm run check:wording` | ✓ PASS (docs 내 정책 설명 warn-only) |
| `npm run check:alpha-ui` | ✓ PASS |

## 10. PR #2 Codex Review Feedback

PR #2 Codex Review:
- PIT getAsOf ordering issue: fixed (Updated sort logic to check `asOfDate desc` -> `ingestedAt desc` -> `effectiveAt desc` -> `pitRecordId desc`)
- OHLCV strict timestamp validation: fixed (Replaced `isValidIsoLike` using Date.parse with strict regex and calendar validations)
- PR #2 closed but changes applied directly to main
- WO016-B Hardening:
  - Strict ISO datetime component/overflow checks (month/day/hour/minute/second bounds) added to `validate-ohlcv.ts`.
  - Canonical format requirements (`YYYY-MM-DD` and `YYYY-MM-DDTHH:mm:ss.sssZ` only) added to `createPitRecord` validation inside `pit-record.ts`.

