# FUTURE_STORAGE_ADAPTERS.md

003-A does not implement production storage. Future adapters may include:

- SQLite for local development.
- Postgres for transactional production records.
- DuckDB/parquet for research scans.
- S3/object storage for immutable raw vendor files.

## Not Allowed

Browser local storage must not be used as the source of truth for PIT, financial, filing, factor, or strategy records.
