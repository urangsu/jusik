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
   - **Source Tier**: `manual_import` (Appends `"source_tier_not_preserved"` to the warnings list since postmortems do not carry a native `sourceTier` field).
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

---

## 4. Automation & Alerting Policies

### 4.1 Internal Application Badging Only (자동 외부 푸시 아님)
- **No External Push Channels**: The system strictly does **not** push alerts via Telegram, KakaoTalk, SMS, Email, or browser push notifications.
- **App-Local Badges**: Active notifications are represented inside the client application through an local unread badge displayed in the navigation tabs of `TopCommandBar`.
- **Semi-Automatic Aggregation & Polling**:
  1. Polled updates: The client polls `/api/watchlist/reports/unread-count` and `/api/alerts/events` at 15-second intervals.
  2. Visibility Guarded: Polling only triggers when `document.visibilityState === "visible"`. When the browser tab is hidden, polling is skipped.
  3. Immediate Refresh: Focus changes on the browser window immediately trigger unread badge count refreshes.
  4. Auto-triggered on additions: When a user registers a new watched asset, a background fetch automatically triggers aggregation for that `assetId`.
  5. On-demand manual trigger: Users can run the aggregator manually by clicking the "이벤트 수집 실행" (Run Aggregator) button.

### 4.2 Source Tier Policy Separation (데이터 출처 등급 구분)
We distinguish between the **API Envelope Metadata** and the **ReportItem source metadata**:
- **API Envelope SourceTier**: Set to `"manual_import"` for all watchlist-related routes (`/api/watchlist`, `/api/watchlist/reports`, etc.) because the watchlist itself is custom user-managed settings.
- **ReportItem Source.SourceTier**: Represents the actual origin of the event data and must **not** be overwritten with `"manual_import"`:
  - `OpenDART filings` -> `"official"`
  - `AlertEvents` -> preserved from the underlying alert rule engine (`alert.sourceTier`).
  - `SignalPostmortems` -> set to `"manual_import"` since postmortems are generated internally, and we prepend `"source_tier_not_preserved"` to the warnings list because postmortems do not carry a native `sourceTier` field.

### 4.3 Validation of Internal Navigation Routes (내부 링크 무결성)
- We ensure `internalUrl` entries map to actual, existing routes:
  - `SignalPostmortem`: `/strategy/signal-postmortems/[id]` maps to a physical page route which displays prices, outcomes, and performance metrics.
  - `OpenDART filings`: `/filings?assetId=<assetId>&filingId=<id>` maps to a dedicated filings route parsing query parameters.
  - `AlertEvent`: `/alerts` points directly to the Alerts settings and inbox dashboard.
- Any link pointing to a non-existent route is prohibited.

