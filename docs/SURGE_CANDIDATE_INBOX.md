# Surge Candidate Inbox

This document describes the Surge Candidate Inbox and Promotion Gate (`WO017-S`) — JUSIK's layer for monitoring abnormal price and volume activity across universes.

> [!IMPORTANT]
> 후보 종목은 관심종목(Watchlist)으로 자동 편입되지 않으며, 사용자 조작 또는 명시적 API 호출을 거쳐서만 승격됩니다.
> 매수 후보, 급등 확정 등의 오해를 유발할 수 있는 단정적 투자 권유는 엄격히 금지됩니다.

---

## 1. Trigger Metrics

The candidate detector scans stock history records for the target market:
- `price_change`: daily close change of $\ge 5\%$.
- `volume_spike`: daily volume spike $\ge 3\times$ of the average volume of the previous 5 trading days.
- `volatility_expansion`: daily volatility ratio of $\ge 4\%$.

---

## 2. Promotion Gate

When a candidate is promoted:
1. Creates a new `WatchlistItem` record in the watchlist ledger.
2. Creates a backing `EvidencePack` containing references to the original OHLCV files.
3. Transitions the candidate's status to `promoted_to_watchlist` and records `evidencePackId`.

Dismissing a candidate sets its status to `dismissed`, preventing watchlist entry.

---

## 3. Storage

Candidates are saved under:
- `data/surge/<candidateId>.json`

---

## 4. Endpoints

- `GET /api/surge/candidates`: List candidates.
- `POST /api/surge/candidates/detect`: Run scanner for a market universe.
- `POST /api/surge/candidates/[id]/promote`: Promote candidate to watchlist.
- `POST /api/surge/candidates/[id]/dismiss`: Reject candidate.

---

## 5. CLI Scanner

```bash
# Run scanner for KOSPI universe assets
npm run surge:detect -- --market=KR

# Run scanner for S&P500 universe assets
npm run surge:detect -- --market=US
```
