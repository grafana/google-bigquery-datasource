---
title: Google BigQuery data source
menuTitle: Google BigQuery
description: The Google BigQuery data source allows you to query and visualize Google BigQuery data in Grafana.
keywords:
  - bigquery
  - google
  - gcp
  - data source
  - queries
labels:
  products:
    - cloud
    - enterprise
    - oss
weight: 300
---

# Google BigQuery data source

The Google BigQuery data source allows you to query and visualize data from [Google BigQuery](https://cloud.google.com/bigquery), Google's fully managed, serverless data warehouse.

## Supported features

| Feature | Supported | Description |
|---------|-----------|-------------|
| **Metrics** | Yes | Query numeric data and visualize as time series or tables. |
| **Alerting** | Yes | Create alert rules based on BigQuery queries. |
| **Annotations** | Yes | Overlay events from BigQuery on your graphs. |
| **Template variables** | Yes | Create dynamic dashboards with query-based variables. |

## Requirements

The following Google APIs must be enabled in your GCP project:

- [BigQuery API](https://console.cloud.google.com/apis/library/bigquery.googleapis.com)
- [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)

## Get started

The following documents help you get started with the Google BigQuery data source:

- [Configure the BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/) - Set up authentication and connect to BigQuery
- [BigQuery query editor](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/query-editor/) - Create and edit SQL and visual queries
- [Template variables](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/template-variables/) - Create dynamic dashboards with BigQuery variables
- [Alerting](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/alerting/) - Create alert rules using BigQuery data
- [Troubleshooting](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/troubleshooting/) - Solve common configuration and query errors

## Additional features

After you configure the BigQuery data source, you can:

- Add [Annotations](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/annotations/) to overlay BigQuery events on your graphs.
- Configure and use [Template variables](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/template-variables/) for dynamic dashboards.
- Add [Transformations](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/panels-visualizations/query-transform-data/transform-data/) to manipulate query results.
- Set up [Alerting](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/alerting/) rules based on your BigQuery data.
- Use [Explore](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/explore/) to investigate your BigQuery data without building a dashboard.

## Pre-built dashboards

The BigQuery data source plugin includes the following pre-built dashboards:

- **Array queries examples** - Demonstrates how to work with BigQuery arrays and nested data structures.

To import a pre-built dashboard:

1. Go to **Connections** > **Data sources**.
1. Select your BigQuery data source.
1. Click the **Dashboards** tab.
1. Click **Import** next to the dashboard you want to use.

## Plugin updates

Ensure your plugin version is up-to-date so you have access to all current features and improvements. Navigate to **Plugins and data** > **Plugins** to check for updates.

{{< admonition type="note" >}}
Plugins are automatically updated in Grafana Cloud.
{{< /admonition >}}

## Related resources

- [Google BigQuery documentation](https://cloud.google.com/bigquery/docs)
- [BigQuery SQL reference](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax)
- [Grafana community forum](https://community.grafana.com/)
