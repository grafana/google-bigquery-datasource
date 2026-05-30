---
'grafana-bigquery-datasource': patch
---

Fix: apply the configured query priority (Interactive/Batch) to BigQuery jobs. The `queryPriority` setting was previously ignored, so all queries ran with the default Interactive priority. It can now be set in the data source configuration.
