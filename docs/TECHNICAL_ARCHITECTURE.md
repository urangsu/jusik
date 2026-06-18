# K-Terminal Technical Architecture

## Architecture Overview
K-Terminal is built on Next.js 16 with a decoupled frontend interface and server-side data extraction components. The codebase features modular layout boundaries, client-side React Query integration, and robust state storage systems.

## Data Layer Design
The architecture isolates data access into discrete layers to enforce budget control, credential sanitization, and fallback options.

### Provider Layer
The `Provider Layer` manages data sources, mapping custom API connections like the Korean Investment & Securities (KIS) Open API, corporate filing portals like OpenDART, and fallback systems (such as `yfinance` or `Stooq`). The `ProviderRegistry` controls provider eligibility, active budgets, and rate limiting rules. All API configuration properties are resolved via the `ProviderConfigResolver` merging env variables and Local Secret/Settings Store configurations.

### Data Safety Layer
The `Data Safety Layer` wraps every outgoing network response inside a standardized `DataEnvelope<T>`. This layer enforces:
1. Zero placeholder/fake values injection.
2. Safe fallbacks that do not bypass data limitations.
3. Fallback verification that flags data quality and veto reasons.
4. Compliance constraints that prevent private keys or access tokens from leaking into browser bundles (e.g. masking OpenDART API keys in logs and restricting calls to the server-side only).
5. Strict parameters clamping (e.g., limiting OpenDART page size to 100, and date range to 3 months for broad searches).
6. Segregation of sensitive keys into a local `Secret Store` (stored under `data/secrets/` and git-ignored).

### Macro Regime Gate & Sentiment Isolation Layer
The `Macro Regime Gate` enforces market environment safety restrictions on strategy suitability. During `risk_off` or `panic` regimes, suitability scores and watch labels are automatically downgraded or blocked to prevent overtrading. The `Sentiment Isolation Layer` completely decouples CNN and Crypto Fear & Greed indices from the core suitability logic and order execution, treating them strictly as auxiliary client-side references.

## Product Scope Boundaries
Functional boundaries (maintained, frozen, and excluded features) are strictly defined in [PRODUCT_SCOPE_POLICY.md](file:///Volumes/무제/jusik/docs/PRODUCT_SCOPE_POLICY.md). All integrations, including order execution blocks and media crawler exclusions, must comply with this policy.

## Hydration Safety Policies
To prevent React hydration mismatch errors between server-side pre-rendering and client-side hydration:
1. `ThemePreference` (e.g., `"system"`) is stored in `data-theme-preference` while only `"light"` or `"dark"` resolved themes are rendered in `data-theme`.
2. Dynamic client-specific data such as user local timezone dates and times must only be formatted/rendered inside a `useEffect` hook after the component has mounted on the client.
3. System media queries and localStorage accesses are isolated to client-only effects.



