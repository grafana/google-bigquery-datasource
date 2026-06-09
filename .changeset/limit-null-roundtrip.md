---
'grafana-bigquery-datasource': patch
---

Fix: clearing the `Limit` input in the visual query builder no longer produces invalid `LIMIT null` SQL after dashboard save/reload. `toRawSql` now only emits a `LIMIT` clause for finite non-negative numbers, and the input setter stores `undefined` (rather than `NaN`) for an empty value.
