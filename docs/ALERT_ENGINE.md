# Alert Engine Documentation

This document describes the design, architecture, and policies of the K-Terminal **Alert Rule Engine**.

## 1. Overview

The Alert Engine evaluates incoming financial data stream events, technical signal fluctuations, and provider anomalies in real-time. When criteria are met, it triggers `AlertEvent` objects.

---

## 2. Core Components

1. **Alert Evaluator**: Core evaluation loop that matches incoming data points with defined conditions.
2. **Cooldown Guard (`alert-cooldown.ts`)**: Prevents alarm fatigue by enforcing quiet hours and cooldown windows between alerts of the same rule and symbol.
3. **Deduper (`alert-deduper.ts`)**: Prevents duplicate alerts from being written within a tight time frame.
4. **Filing Alert Engine**: Specific detector checking OpenDART filing feeds to alert on new filings matching corporate codes.
5. **Strategy Alert Engine**: Checks strategy score shifts.

---

## 3. Linkage to Watchlist Report Inbox

- **Asset Filtering**: The Asset Event Aggregator queries the `AlertEventStore` for recent alerts. If an alert has an `assetId` associated with an active watchlist item with `reportInboxEnabled = true`, it is mapped to a `WatchlistReportItem` inside the inbox feed.
- **Category & Severity Translation**: Alert severities (`info` | `watch` | `warning` | `critical`) are directly mapped. Rule types (`technical_signal_change`, `new_filing` etc.) are converted to inbox categories (`signal`, `filing`, etc.).
