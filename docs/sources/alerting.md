---
description: Set up alerting with the Google BigQuery data source in Grafana
keywords:
  - grafana
  - bigquery
  - google
  - gcp
  - alerting
  - alerts
  - notifications
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Alerting
title: Google BigQuery alerting
weight: 500
last_reviewed: 2026-02-11
---

# Google BigQuery alerting

You can create Grafana alerts based on BigQuery queries to get notified when your data meets specific conditions. Use alerts to monitor metrics, detect anomalies, or track business KPIs stored in BigQuery.

## Before you begin

Before setting up alerts:

- [Configure the Google BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/)
- Understand [Grafana Alerting](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/alerting/)
- Ensure your BigQuery credentials are configured using a method that doesn't require user interaction (service account key, GCE metadata, or service account impersonation)

{{< admonition type="note" >}}
Alerting doesn't work with **Forward OAuth Identity** authentication. Grafana alerting runs in the background and requires credentials that are always available, which isn't the case with OAuth-based authentication.
{{< /admonition >}}

## Create an alert rule

To create an alert rule using BigQuery data:

1. Navigate to **Alerting** > **Alert rules**.
1. Click **New alert rule**.
1. Enter a name for the alert rule.
1. Select your **Google BigQuery** data source.
1. Write a query that returns numeric data.
1. Configure the alert condition (threshold, range, or no data handling).
1. Set the evaluation interval and pending period.
1. Add labels and annotations.
1. Click **Save rule**.

## Query requirements for alerting

Alert queries have specific requirements:

- **Return numeric values:** The query must return at least one numeric column for threshold evaluation.
- **Single value or time series:** Queries can return a single value or a time series.
- **Time column:** For time series alerts, include a `TIMESTAMP` column aliased as `time`.

## Alert query examples

The following examples demonstrate common alerting patterns.

### Threshold alert on a metric

Alert when a value exceeds a threshold:

```sql
SELECT
  CURRENT_TIMESTAMP() AS time,
  COUNT(*) AS error_count
FROM `project.dataset.errors`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
```

Set the condition to alert when `error_count` is above your threshold.

### Alert on aggregated data

Alert when an average value crosses a threshold:

```sql
SELECT
  CURRENT_TIMESTAMP() AS time,
  AVG(response_time_ms) AS avg_response_time
FROM `project.dataset.requests`
WHERE $__timeFilter(timestamp)
```

### Alert on rate of change

Alert when a metric changes significantly:

```sql
SELECT
  CURRENT_TIMESTAMP() AS time,
  (
    SELECT COUNT(*)
    FROM `project.dataset.events`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
  ) - (
    SELECT COUNT(*)
    FROM `project.dataset.events`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 MINUTE)
      AND timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
  ) AS count_change
```

### Multi-dimensional alerts

Alert on multiple series with labels:

```sql
SELECT
  $__timeGroup(timestamp, $__interval) AS time,
  region,
  SUM(error_count) AS errors
FROM `project.dataset.metrics`
WHERE $__timeFilter(timestamp)
GROUP BY time, region
ORDER BY time
```

This creates separate alert instances for each region.

## Configure alert conditions

After writing your query, configure the alert condition:

| Condition type       | Use case                                   |
| -------------------- | ------------------------------------------ |
| **Is above**         | Alert when value exceeds a threshold       |
| **Is below**         | Alert when value drops below a threshold   |
| **Is within range**  | Alert when value is between two thresholds |
| **Is outside range** | Alert when value is outside a range        |
| **Has no value**     | Alert when query returns no data           |

## Handle no data and errors

Configure how alerts behave when queries return no data or encounter errors:

| Setting     | Options                                        |
| ----------- | ---------------------------------------------- |
| **No data** | `No Data`, `Alerting`, `OK`, `Keep Last State` |
| **Error**   | `Error`, `Alerting`, `OK`, `Keep Last State`   |

For BigQuery:

- **No data:** Consider using `Keep Last State` if data gaps are expected, or `Alerting` if missing data indicates a problem.
- **Error:** Use `Alerting` to be notified of query failures, which may indicate permission or connectivity issues.

## Performance considerations

BigQuery alerts run on a schedule, and each evaluation executes a query against BigQuery. Consider these factors:

- **Query cost:** Each alert evaluation runs a query. Optimize queries to scan less data using filters and partitioned tables.
- **Evaluation interval:** Don't set intervals shorter than necessary. A 1-minute interval runs 1,440 queries per day per alert rule.
- **Query timeout:** Complex queries may timeout. Simplify queries or pre-aggregate data for alerting.
- **Partition pruning:** Use `$__timeFilter` on partitioned columns to limit scanned data.

### Cost optimization example

Instead of scanning an entire table:

```sql
-- Expensive: scans all data
SELECT COUNT(*) AS errors
FROM `project.dataset.large_table`
WHERE error = true
```

Filter to recent data and use partitioning:

```sql
-- Optimized: uses partition pruning
SELECT COUNT(*) AS errors
FROM `project.dataset.large_table`
WHERE $__timeFilter(_PARTITIONTIME)
  AND error = true
```

## Best practices

Follow these recommendations for effective BigQuery alerts:

- **Use meaningful names:** Name alerts descriptively, like "High Error Rate - Production API" instead of "Alert 1".
- **Add annotations:** Include context in annotations to help responders understand the alert.
- **Set appropriate thresholds:** Avoid noisy alerts by setting thresholds based on historical data.
- **Use labels:** Add labels for routing alerts to the correct teams or channels.
- **Test queries first:** Verify your query returns expected results in the query editor before creating an alert.
- **Consider time zones:** BigQuery uses UTC by default. Account for time zone differences in your queries.

## Troubleshoot alerts

Use these tips to diagnose common alerting issues.

### Alert not firing

If an alert isn't firing when expected:

1. Verify the query returns data by running it in the query editor.
1. Check that the returned values actually meet the alert condition.
1. Ensure the evaluation interval has passed.
1. Verify the data source connection is working.

### Alert always firing

If an alert fires continuously:

1. Check the threshold value is appropriate.
1. Verify the query is returning expected values.
1. Look for data quality issues in the source data.

### Query errors in alerts

If alert queries fail:

1. Check the data source credentials are valid and not expired.
1. Verify the service account has required permissions.
1. Test the query manually in the query editor.
1. Check for query syntax errors.

## Related resources

- [Grafana Alerting](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/alerting/)
- [Create alert rules](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/alerting/alerting-rules/create-grafana-managed-rule/)
- [Configure notifications](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/alerting/configure-notifications/)
