# Suitability Envelope Design Limitations

This document notes and details a design limitation in the `SourceUsagePolicy` schema contract.

## Design Context
All API route payloads must comply with the `DataEnvelope<T>` contract. The `sourceTier` field of `DataEnvelope<T>` is strictly validated against the `SourceUsagePolicy` union:
```typescript
export type SourceUsagePolicy =
  | "official"
  | "licensed_free"
  | "personal_fallback"
  | "manual_import";
```

## Problem / Limitation
The Strategy Suitability API (/api/strategy/suitability) returns a computed result aggregated from multiple underlying subsystems (the regime gate and the signal stability gate). 
Since this is a derived calculation generated dynamically on the server:
- None of the existing policies (`licensed_free`, `personal_fallback`, etc.) accurately describe a server-computed/derived output.
- A new policy value (e.g., `"derived"` or `"computed"`) would be appropriate, but modifying the global core schema has wide system impacts.

## Resolution
To conform to the contract while maintaining semantic correctness:
- We set `sourceTier = "official"` to indicate it represents the system's official/canonical suitability determination.
- We set `source = "StrategySuitabilityService"` to clearly attribute the calculated origin.
- We map `status` to `"real_time"` (if passed) or `"insufficient_data"` (if vetoed/blocked) rather than hardcoding `"cached"`.
