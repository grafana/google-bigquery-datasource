---
title: Google BigQuery data source plugin
menuTitle: Google BigQuery
description: The Google BigQuery data source plugin allows you to query and visualize Google BigQuery data in Grafana.
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

# Google BigQuery data source plugin

The Google BigQuery data source plugin allows you to query and visualize Google BigQuery data from within Grafana.

## Requirements

The following Google APIs need to be enabled first:

- [BigQuery API](https://console.cloud.google.com/apis/library/bigquery.googleapis.com)
- [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)

## Get started

After installing the plugin, you must configure it so that Grafana can connect to your BigQuery data.

Refer to [Configure the BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/) for configuration instructions.

## Query your data

After you configure the data source, you can build queries in the **SQL query editor** or the **Visual query editor** to visualize your BigQuery data.

Refer to [Query the BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/query-editor/) for query instructions.

## Use template variables

Instead of hard-coding details such as dataset names and column names in queries, you can use variables in their place.

Refer to [BigQuery data source template variables](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/template-variables/) for variable instructions.

## Annotate visualizations

You can mark points in time on your graphs with events from BigQuery data, such as deployments or incidents.

Refer to [BigQuery annotations](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/annotations/) for annotation instructions.

## Set up alerting

Create alerts based on BigQuery queries to get notified when your data meets specific conditions.

Refer to [BigQuery alerting](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/alerting/) for alerting instructions.

## Supported features

| Feature | Supported |
|---------|-----------|
| Metrics | Yes |
| Alerting | Yes |
| Annotations | Yes |

## Plugin updates

Ensure your plugin version is up-to-date so you have access to all current features and improvements. Navigate to **Plugins and data** > **Plugins** to check for updates.

{{< admonition type="note" >}}
Plugins are automatically updated in Grafana Cloud.
{{< /admonition >}}
