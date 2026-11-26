---
'grafana-bigquery-datasource': patch
---

Fix a data race when concurrent queries open BigQuery connections, which could also make the plugin replace and leak a working connection pool
