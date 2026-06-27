# Signal Outcome Journal

This document describes the Signal, Finding, and Strategy Trial Outcome Journal (`WO017-Q`) — JUSIK's layer for post-mortem return verification and index-relative alpha measurement.

> [!IMPORTANT]
> 모든 성과 결과는 사후 통계 기록으로 투자 조언이나 매수/매도 권유가 아닙니다.
> 데이터가 불충분할 경우 수익률을 `0`으로 채우지 않고 `null`을 명시적으로 반환합니다.

---

## 1. Horizon & Index Comparisons

Outcome records trace a specific forward target horizon:
- `forward_5d` (5 trading days, index baseline: 0.5%)
- `forward_20d` (20 trading days, index baseline: 2.0%)
- `forward_60d` (60 trading days, index baseline: 6.0%)

Performance returns are calculated from local history logs using closing prices:
$$\text{observedReturn} = \frac{\text{price}_{\text{latest}} - \text{price}_{\text{base}}}{\text{price}_{\text{base}}}$$

Index-relative performance is computed as:
$$\text{alphaReturn} = \text{observedReturn} - \text{benchmarkReturn}$$

If a price series has missing/insufficient segments, `outcomeStatus` is set to `"insufficient_data"` and the returns remain `null`.

---

## 2. Memory Compression

The `compressOutcomeMemory` tool aggregates outcomes across the entire ledger:
- Compiles common diagnostics (`lessons`).
- Resolves confidence shifts (`increase` if alpha > 2%, `decrease` if alpha < -2%, otherwise `unchanged`).
- Traces data gaps and warnings for next-run synthesizer runs.

---

## 3. Storage

Outcome journals are saved under:
- `data/outcome-journals/<recordId>.json`

---

## 4. CLI Execution

```bash
# Run outcome observer to inspect pending records
npm run outcomes:observe
```

---

## 5. Endpoints

- `POST /api/outcomes/signal-journal/pending`: Create a pending record.
- `POST /api/outcomes/signal-journal/observe`: Evaluate returns for a record.
- `GET /api/outcomes/signal-journal`: List outcomes.
