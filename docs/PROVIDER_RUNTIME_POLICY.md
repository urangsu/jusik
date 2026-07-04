# Provider Runtime Policy

Provider runtime policy controls cache, retry, rate-limit, and stale fallback behavior for real provider calls.

## Policy Fields

- `providerId`: runtime provider identifier.
- `cacheTtlMs`: fresh cache window.
- `staleTtlMs`: stale fallback window.
- `maxRetries`: retry budget.
- `retryableStatuses`: statuses eligible for retry.
- `staleAllowed`: whether stale cache can be returned on provider failure.

## Safety Rules

- Rate limits must be returned as `rate_limited` unless stale fallback is explicitly allowed.
- Stale fallback must be marked `stale`; it must not be shown as `real_time`.
- Null success-shaped envelopes are not cached.
- Cached responses preserve source and warning metadata.
- Runtime gate is a boundary; it does not make disconnected providers available.
