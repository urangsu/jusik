# Evidence Pack Ledger

This document describes the Evidence Pack Ledger (`WO017-O`) — the layer that establishes a strict service boundary. No diagnostic client (API, UI, or job) may generate assertions or explanations without referencing a structured `EvidencePack` that documents metadata correctness and source validation paths.

> [!IMPORTANT]
> 모든 AI 설명, 진단 리포트, Synthesizer는 `EvidencePack`을 거쳐서만 claim을 생성할 수 있습니다.
> `EvidencePack` 자체는 매수/매도 지시의 판단 근거로 사용할 수 없습니다.

---

## 1. Evidence Pack Structure

Each `EvidencePack` encapsulates:
- `evidenceRefs`: references to original `DataEnvelope` files, `AuditFinding`s, or `WatchlistReport` items.
- `asOf`: logical timestamp of the snapshot.
- `freshness`: resolved state (`fresh`, `stale`, `mixed`, or `unknown`). An item is marked stale if its source status is `"stale"` or if `updatedAt` is older than 24 hours.
- `claimTypes`: classified domains (`price`, `volume`, `filing`, `factor`, `signal`, `risk`, `correlation`, `market_exposure`, `news`, or `unknown`).
- `missingEvidence`: logs elements missing required fields.
- `limitations`: warnings about data caveats.

---

## 2. Validation and Completeness Policy

If any linked data source lacks any of:
- `source`
- `status`
- `updatedAt`

It is categorized under `missingEvidence` and recorded under `limitations`. The pack creation is non-fatal; we proceed with the missing items highlighted so subsequent consumers (AI explanations, synthesizers) are aware of evidence gaps.

---

## 3. Storage

Evidence packs are written atomically using `writeAtomic` under:
- `data/evidence/<packId>.json` (latest index)
- `data/evidence/history/<packId>.json` (historical ledger trace)

---

## 4. Endpoints

- `GET /api/evidence/packs`: List packs.
- `GET /api/evidence/packs/[id]`: Retrieve single pack.
- `POST /api/evidence/packs/from-audit-finding`: Create a pack from an `AuditFinding`.

All API responses return a structured `DataEnvelope` with `sourceTier: "manual_import"`.
