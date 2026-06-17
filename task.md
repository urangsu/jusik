# K-Terminal Master Task Board

## Product Direction
K-Terminal is a professional-grade dark-themed financial terminal UI providing real-time KOSPI and S&P 500 market data, advanced diagnostic logging, budget constraints for providers, and quant strategy analysis. It serves as an analytics cockpit rather than a direct trading system.

## Non-Negotiable Principles
1. **No Fake Data**: Never display fake financial numbers. Never convert null financial values to 0.
2. **Data Envelope**: Every market, filing, financial, news, factor, strategy, and portfolio response must use `DataEnvelope<T>`.
3. **No Direct Trading**: Live trading and broker order placement are strictly out of scope. Paper trading is also out of scope.
4. **KR Finance Color Convention**: Positive/Up must be RED, Negative/Down must be BLUE. Semantic tokens must be used. No direct hardcoded red/blue colors.
5. **No Emojis in UI**: Use strictly `lucide-react` icons. No emojis anywhere in the interface.
6. **No Box Shadows**: Use translucent borders and layered dark surfaces instead of box-shadow for elevation.
7. **Strategy Safety**: Signals are diagnostic only. No definitive buy/sell recommendation labels (e.g. "매수 확정", "매도 확정"). Use "검토", "관망", "주의" instead.

## Quant Architecture Decisions

### 결정 1. LLM은 계산자가 아니다

LLM은 퀀트 점수, 팩터값, 전략 선택, 백테스트 결과를 계산하지 않는다.  
LLM은 이미 계산된 결과를 사용자가 요청할 때만 설명한다.

### 결정 2. 재무 팩터 백테스트는 Point-in-Time 인프라 전까지 금지

ROE, PBR, PER, ROIC, FCF Yield 등 재무 팩터는 `dataAvailableAt`이 확보되기 전까지 백테스트에 사용하지 않는다.

### 결정 3. 가격/기술 팩터를 먼저 구현한다

가격/기술 팩터는 OHLCV 기반이므로 재무 팩터보다 먼저 검증 가능한 최소 엔진을 만들 수. 있다.  
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

## Completed Milestones
- **WO-001**: Market Board UI foundation, Dark Terminal style, data grid for universes.
- **WO-002**: Provider Registry and Budget Management.
- **WO-003**: yfinance Direct Fallback Worker, snapshot loader, fallback guardrails.
- **WO-004**: Multi-language i18n support (KO/EN), Read-only KIS Open API connection.
- **WO-005**: Alert Rule Engine, Notification Hub infrastructure, Daily Report skeletons.
- **WO-006**: App Preferences, System Polish, TopCommandBar Settings, Documentation.

## Current Work Order (WO-007) - Quant Spec Consolidation + Price/Technical Factor Foundation
- [ ] 12 Quant Spec documents created & validated.
- [ ] Technical Signal indicators (Ichimoku, Darvas Box, Turtle Channel, Weinstein Stage) implemented.
- [ ] Factor Store, Registry, and Signal Ensemble Types.
- [ ] All unit tests passing with 100% verification.

## Work Order Roadmap
- **WO-008**: Price/Technical Factor Engine Integration (AtomicSignal calculation, Momentum v1, Signal History).
- **WO-009**: Price-only Walk-forward Backtest.
- **WO-010**: Signal History + View Reliability (Bayesian shrinkage).
- **WO-011**: Horizon-Segmented Agreement UI (cross-horizon tension visualizer).
- **WO-012**: Alert Rule Engine + Notification Hub (Web Inbox / Console).
- **WO-013**: Daily Report Engine.
- **WO-014**: Production Performance Audit and INP/CWV Optimizations.

## GitHub Actions Reporting Policy
Every automated run evaluates task completion, cost budgets, and documentation completeness. Reports are published daily.

## Verification Commands
Ensure all checks pass before pushing changes:
```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run docs:check
```

## Global Failure Criteria
- Unresolved TypeScript/typecheck compilation errors.
- ESLint errors or formatting issues.
- Missing required documentation files or sections.
- Test suite failures.
- Non-semantic styling or emojis in UI.
