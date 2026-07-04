# Provider Key Smoke

Provider key smoke verifies whether configured provider credentials produce real `DataEnvelope` data.

Rules:

- No-key mode passes only `api_required` or `not_supported`.
- With-key mode fails if the provider still returns `api_required`.
- `value: null` with `real_time`, `delayed`, `eod`, `cached`, or `stale` is a failure.
- This smoke does not certify full universe coverage.
