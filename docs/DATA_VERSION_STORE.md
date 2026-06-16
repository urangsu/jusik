# DATA_VERSION_STORE.md

## Purpose

`DataVersionStore` records which vendor/source/asOf/effective/ingested/hash combination produced a data version.

## Current Status

003-A provides only `InMemoryDataVersionStore` for tests and local development. It is not a production store.

## Rules

- Use `npm test` backed in-memory store for contracts only.
- `findLatest` is scoped by vendor, source, and asOfDate.
- Latest means greatest `ingestedAt`.
- Revisions create new data versions.

## Future Production Store

Production storage must preserve immutable records and support historical lookup by `knownAt`.
