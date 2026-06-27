# Finding Synthesis Report

This document describes the Report Section Composer and Finding Synthesizer (`WO017-P`) — the layer that structures diagnostic sections and performs strict forbidden wording validations.

> [!IMPORTANT]
> 모든 리포트 요약 및 상세는 투자 결론이나 매수/매도 권유(Buy/Sell Instruction)를 포함할 수 없습니다.
> 발견된 정책 위반 문구는 자동으로 본문 비노출 및 차단 처리됩니다.

---

## 1. Structure

### Report Sections
Sections are composed of logical categories:
- `technical`: technical and factor evaluations.
- `flow`: flow and liquidity dynamics.
- `financial`: fundamental evaluations.
- `filing`: corporate filings.
- `risk`: active risks.
- `market`: market exposures.
- `evidence_gap`: composed automatically if there is `missingEvidence` in the backing `EvidencePack`.

### Finding Synthesis Report
Aggregates composed sections and provides:
- `synthesisSummary`: generic overview.
- `keyRisks`: consolidated warnings.
- `evidenceGaps`: logs parameters missing for full verification.
- `isBlocked`: whether a policy block is active.

---

## 2. Forbidden Wording Inspection

Before a report is saved or served, its text properties are passed through `inspectForbiddenWording` (imported from `@/server/ai/forbidden-wording-guard`). If any forbidden word is matched (e.g. "매수", "매도", "수익 보장", "강력 추천"):
1. `isBlocked` is set to `true`.
2. Forbidden terms are logged in `blockedTerms`.
3. Clear explanations are logged in `blockReasons`.
4. In the UI, the report body is hidden; only `blockReasons` is displayed.

---

## 3. Storage

Synthesis records are stored atomically using `writeAtomic` under:
- `data/reports/synthesis/<reportId>.json`

---

## 4. Endpoints

- `POST /api/reports/finding-synthesis/from-evidence-pack`: Synthesize sections.
- `GET /api/reports/finding-synthesis`: List reports.
- `GET /api/reports/finding-synthesis/[id]`: Retrieve single report.
