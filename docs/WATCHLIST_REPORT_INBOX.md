# Watchlist Report Inbox & Asset Event Aggregator

This document outlines the design, architecture, and policies of the **Watchlist Report Inbox** and the **Asset Event Aggregator** in K-Terminal.

## 1. Overview & Core Philosophy

The Watchlist Report Inbox provides K-Terminal users with an integrated dashboard to review corporate filings, signal postmortems, and technical alert events corresponding to assets added to their watchlist.

> [!IMPORTANT]
> **Core Policy & Constraints**:
> - **Not Investment Advice (투자 권유 금지)**: This system provides diagnostic insights and historical review logs. It **never** issues buy/sell recommendations or outputs trading instructions.
> - **Internal Inbox Only (외부 알림 금지)**: The inbox is entirely local to the application interface. It does not send push notifications, emails, Telegram, or KakaoTalk alerts.
> - **No Third-Party Content Copying (외부 리포트/뉴스 복사 금지)**: To prevent copyright violations, we do not store external news articles or analyst PDF reports. The inbox provides verified original URLs (`sourceUrl`) or deep links to local view details (`internalUrl`).
> - **No Automatic Summarizations (AI 요약 금지)**: LLM auto-generation of report contents is not supported.

---

## 2. Architecture & Data Flow

### 2.1 Watchlist Management
Users add assets (`assetId`) to their watchlist.
- **KR Assets**: e.g., `KR:005930`
- **US Assets**: e.g., `US:AAPL`

Watchlist records are persisted atomically to [items.json](file:///Volumes/무제/jusik/data/watchlist/items.json). Watchlist actions (addition, removal, metadata changes) are logged to [events.json](file:///Volumes/무제/jusik/data/watchlist/events.json).

### 2.2 Event Aggregation (`Asset Event Aggregator`)
The aggregator collects data matching watched asset IDs from three primary internal databases:
1. **OpenDART Filings**: Matches by `stockCode` matching `KR:<stockCode>`.
   - **Source Tier**: `official`
   - **Severity Rules**: Keyword checks in `reportName` (정정, 소송, 감사의견 -> `warning`; 상장폐지, 횡령 -> `critical`).
2. **Signal Postmortems**: Matches by `assetId`.
   - **Source Tier**: `personal_fallback`
   - **Severity Rules**: Outcome classification (`negative` or `missing_price` -> `warning`, `not_evaluable` -> `watch`, else -> `info`).
3. **Alert Events**: Matches by `assetId`.
   - **Source Tier**: Matches original alert tier.
   - **Severity Rules**: Maps alert severity directly.

Aggregated items are stored in [latest.json](file:///Volumes/무제/jusik/data/watchlist-reports/latest.json) using a unique `dedupeKey` (`<assetId>|<sourceType>|<sourceId>`) to prevent duplicate entry insertion.

---

## 3. UI State Modifiers

Users manage incoming reports within the `/watchlist` dashboard:
- **Unread/Read**: Toggles status.
- **Archive**: Archives old events to declutter the feed.
- **Hide**: Excludes selected elements from the feed.

Each item renders external original link buttons (e.g., to DART official viewer) or internal detail routing buttons (e.g., to postmortem audit details page).
