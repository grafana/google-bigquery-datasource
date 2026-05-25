---
'grafana-bigquery-datasource': patch
---

Fix: `$__timeGroup` now honors the multiplier for month intervals — `3M`, `6M`, `12M` produce N-month buckets aligned to the calendar year instead of always grouping by a single month. It also no longer panics on an empty or quote-only interval (e.g. `''`), returning a clear error instead.
