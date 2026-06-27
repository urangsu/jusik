# Diagnostic Debate

This document describes the Bull, Bear, and Neutral Diagnostic Debate Skeleton (`WO017-R`) — JUSIK's layer for presenting a balanced, multi-perspective view of evidence packages.

> [!IMPORTANT]
> 이 대비표는 투자 판단을 유도하는 결론을 내리지 않으며, 단순 진단 대조 기능만을 수행합니다.
> 추천, 투자의견(Buy/Sell), 목표가 제시는 철저히 배제됩니다.

---

## 1. Debate Perspectives

The debate sheet generates four deterministic case perspectives:
1. `bull_case`: highlights positive technical signals, momentum, and flow indicators.
2. `bear_case`: highlights risk triggers, warnings, and high beta/market exposure warnings.
3. `neutral_risk`: outlines middle-ground fundamental metrics and neutral disclosure items.
4. `evidence_gap`: identifies gaps from missing env config key parameters or warnings.

---

## 2. Policy and Block Safety

All generated text contents (balance summaries, case notes, unresolved questions) pass through the wording filter `inspectForbiddenWording` (imported from `@/server/ai/forbidden-wording-guard`). If any unauthorized term is found:
- The entire debate report is marked `isBlocked = true`.
- In the UI, the side-by-side sheets are completely hidden, showing only the block warnings and matched terms.

---

## 3. Endpoints

- `POST /api/debate/diagnostic/from-report`: Compose a debate sheet from a synthesis report.
- `GET /api/debate/diagnostic/[id]`: Retrieve debate sheet by ID.
