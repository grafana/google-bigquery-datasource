---
description: Use annotations with the Google BigQuery data source in Grafana
keywords:
  - grafana
  - bigquery
  - google
  - gcp
  - annotations
  - events
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Annotations
title: Google BigQuery annotations
weight: 400
---

# Google BigQuery annotations

Annotations let you mark points in time on your graphs with rich events from BigQuery data. Use annotations to correlate metrics with events like deployments, incidents, or other significant occurrences stored in BigQuery.

## Before you begin

Before using annotations:

- [Configure the Google BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/)
- Understand [Grafana annotations](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/build-dashboards/annotate-visualizations/)

## Create an annotation query

To add BigQuery annotations to a dashboard:

1. Open the dashboard where you want to add annotations.
1. Click **Dashboard settings** (gear icon).
1. Click **Annotations** in the left menu.
1. Click **Add annotation query**.
1. Enter a **Name** for the annotation (for example, `Deployments`).
1. Select your **Google BigQuery** data source.
1. Write your annotation query.
1. Click **Apply** to save.

## Annotation query format

Annotation queries must return specific columns that Grafana uses to render the annotations.

### Required columns

| Column | Type | Description |
|--------|------|-------------|
| `time` | `TIMESTAMP` | The time of the event |

### Optional columns

| Column | Type | Description |
|--------|------|-------------|
| `timeEnd` | `TIMESTAMP` | End time for region annotations (displays as a shaded region) |
| `title` | `STRING` | Title text shown on hover |
| `text` | `STRING` | Description text shown on hover |
| `tags` | `STRING` | Comma-separated tags for filtering annotations |

## Annotation query examples

The following examples demonstrate common annotation patterns.

### Simple event annotations

Mark deployment events on your graphs:

```sql
SELECT
  deploy_time AS time,
  version AS title,
  CONCAT('Deployed by ', deployed_by) AS text
FROM `project.dataset.deployments`
WHERE $__timeFilter(deploy_time)
ORDER BY deploy_time
```

### Region annotations

Show time ranges (like maintenance windows or incidents) as shaded regions:

```sql
SELECT
  start_time AS time,
  end_time AS timeEnd,
  incident_title AS title,
  description AS text,
  severity AS tags
FROM `project.dataset.incidents`
WHERE $__timeFilter(start_time)
ORDER BY start_time
```

### Annotations with tags

Add tags to filter annotations by category:

```sql
SELECT
  event_time AS time,
  event_name AS title,
  details AS text,
  event_type AS tags
FROM `project.dataset.events`
WHERE $__timeFilter(event_time)
ORDER BY event_time
```

You can then filter annotations by tag using the annotation toggle in the dashboard.

### Annotations from multiple sources

Combine different event types using `UNION ALL`:

```sql
SELECT
  deploy_time AS time,
  CAST(NULL AS TIMESTAMP) AS timeEnd,
  CONCAT('Deploy: ', version) AS title,
  deployed_by AS text,
  'deployment' AS tags
FROM `project.dataset.deployments`
WHERE $__timeFilter(deploy_time)

UNION ALL

SELECT
  start_time AS time,
  end_time AS timeEnd,
  incident_title AS title,
  description AS text,
  'incident' AS tags
FROM `project.dataset.incidents`
WHERE $__timeFilter(start_time)

ORDER BY time
```

## Filter annotations

After adding annotation queries, you can show or hide them:

1. Click the **Annotations** toggle at the top of the dashboard.
1. Select or deselect specific annotation queries.
1. If your annotations have tags, filter by tag name.

## Best practices

Follow these recommendations for effective annotations:

- **Use meaningful titles:** Keep titles short but descriptive for quick identification.
- **Add context in text:** Include relevant details in the text field for more information on hover.
- **Use tags consistently:** Establish a tagging convention (for example, `deploy`, `incident`, `maintenance`) across your queries.
- **Filter by time range:** Always include `$__timeFilter` to limit results to the dashboard time range.
- **Limit results:** For tables with many events, add a `LIMIT` clause or additional filters to improve performance.

## Related resources

- [Annotate visualizations](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/build-dashboards/annotate-visualizations/)
- [Query annotations](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/build-dashboards/annotate-visualizations/#query-annotations)
