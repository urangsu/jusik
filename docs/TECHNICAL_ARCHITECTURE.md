# K-Terminal Technical Architecture

## Architecture Overview
K-Terminal is built on Next.js 16 with a decoupled frontend interface and server-side data extraction components. The codebase features modular layout boundaries, client-side React Query integration, and robust state storage systems.

## Data Layer Design
The architecture isolates data access into discrete layers to enforce budget control, credential sanitization, and fallback options.

### Provider Layer
The `Provider Layer` manages data sources, mapping custom API connections like the Korean Investment & Securities (KIS) Open API and fallback systems (such as `yfinance` or `Stooq`). The `ProviderRegistry` controls provider eligibility, active budgets, and rate limiting rules.

### Data Safety Layer
The `Data Safety Layer` wraps every outgoing network response inside a standardized `DataEnvelope<T>`. This layer enforces:
1. Zero placeholder/fake values injection.
2. Safe fallbacks that do not bypass data limitations.
3. Fallback verification that flags data quality and veto reasons.
4. Compliance constraints that prevent private keys or access tokens from leaking into browser bundles.
