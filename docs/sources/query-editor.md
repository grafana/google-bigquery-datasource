---
description: Use the Google BigQuery query editor to build and run queries in Grafana
keywords:
  - grafana
  - bigquery
  - google
  - gcp
  - query
  - sql
  - visual
  - macros
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Query editor
title: Google BigQuery query editor
weight: 200
last_reviewed: 2026-02-11
---

# Google BigQuery query editor

This document explains how to use the Google BigQuery query editor to build and run queries in Grafana.

## Before you begin

Before using the query editor:

- [Configure the Google BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/).
- Verify your credentials have appropriate permissions to query the datasets you need.

## Query editor modes

The BigQuery data source provides two query editor modes, which you can switch between using the **Builder** / **Code** toggle in the query editor header:

- **Builder (Visual query editor):** Build queries without writing SQL using a point-and-click interface.
- **Code (SQL query editor):** Write raw SQL queries with autocompletion and validation.

### Query editor header

The query editor header includes the following options:

| Option | Description |
|--------|-------------|
| **Processing location** | Override the data source processing location for this query. |
| **Format** | Select the output format: **Time series** or **Table**. |
| **Use Storage API** | Enable the BigQuery Storage API for this query (Code mode only). |
| **Filter/Group/Order/Preview** | Toggle sections in the Visual query editor (Builder mode only). |
| **Builder/Code** | Switch between Visual query builder and SQL code editor. |

## SQL query editor

The SQL query editor provides a rich editing experience for writing BigQuery Standard SQL queries.

### Autocompletion

The SQL query editor includes autocompletion for:

- **BigQuery Standard SQL syntax:** Keywords, functions, and operators.
- **Schema objects:** Datasets, tables, and columns from your BigQuery project.
- **Macros:** Grafana macros like `$__timeFilter` and `$__timeGroup`.
- **Template variables:** Dashboard variables you've defined.

To trigger autocompletion, press `Ctrl+Space` (Windows/Linux) or `Cmd+Space` (macOS).

### Query validation

The SQL query editor validates your query as you type. If the query contains errors, the editor displays information about what's wrong.

When the query is valid, the editor shows an estimated query size, helping you understand the data volume before running the query.

### Extended code editor

For complex queries, use the full-screen code editor. Click the expand button (double arrow icon) in the query toolbar to open the extended editor.

### Format query

Click the **Format query** button (brackets icon) in the query toolbar to automatically format your SQL code for better readability.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Return` | Run the query |
| `Ctrl + Space` | Trigger autocompletion |

## Visual query editor

The Visual query editor lets you build BigQuery queries without writing SQL. It's useful for users who aren't familiar with SQL or for building simple queries quickly.

### Resource selectors

In Builder mode, the query editor header displays resource selectors:

| Selector | Description |
|----------|-------------|
| **Project** | Select the GCP project containing your data. |
| **Dataset** | Select the dataset within the project. |
| **Table** | Select the table to query. |

### Query building

The Visual query editor supports the following sections (toggle visibility using the switches in the header):

| Section | Description |
|---------|-------------|
| **Select** | Choose columns and apply aggregation functions. |
| **Filter** | Add `WHERE` conditions to filter data by column values. |
| **Group** | Group results by one or more columns (required when using aggregations). |
| **Order** | Sort results by column values in ascending or descending order. |
| **Preview** | View the generated SQL query. |

### Aggregation functions

The following aggregation functions are available:

- `AVG` - Average value
- `COUNT` - Count of rows
- `MIN` - Minimum value
- `MAX` - Maximum value
- `SUM` - Sum of values
- `STDDEV` - Standard deviation
- `VARIANCE` - Variance

The Visual query editor validates your query as you build it, similar to the SQL query editor.

## Query as time series

To visualize data as a time series:

1. Include a [`TIMESTAMP`](https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types#timestamp_type) column in your query.
1. The timestamp column is used as the time axis.
1. All other columns are treated as value columns.

{{< admonition type="note" >}}
Grafana interprets timestamp rows without an explicit time zone as UTC.
{{< /admonition >}}

### Time series example

```sql
SELECT
  timestamp_column AS time,
  value_column,
  metric_name
FROM `project.dataset.table`
WHERE $__timeFilter(timestamp_column)
ORDER BY timestamp_column
```

### Multi-series time series

To display multiple series (for example, metrics by region), include a label column. Each unique value creates a separate series:

```sql
SELECT
  $__timeGroup(timestamp_column, $__interval) AS time,
  region,
  AVG(metric_value) AS value
FROM `project.dataset.metrics`
WHERE $__timeFilter(timestamp_column)
GROUP BY time, region
ORDER BY time
```

## Query as table

Table visualizations work with any valid BigQuery query. You don't need to include a timestamp column for table results.

### Table example

```sql
SELECT
  user_id,
  user_name,
  email,
  created_at
FROM `project.dataset.users`
LIMIT 100
```

## Macros

Macros simplify queries by providing dynamic values based on the dashboard context. Use macros to filter data by the dashboard time range without hardcoding dates.

| Macro | Description | Example output |
|-------|-------------|----------------|
| `$__timeFilter(column)` | Filters results to the dashboard time range | `column BETWEEN TIMESTAMP('2024-01-01 00:00:00') AND TIMESTAMP('2024-01-02 00:00:00')` |
| `$__timeFrom()` | Returns the start of the dashboard time range | `TIMESTAMP('2024-01-01 00:00:00')` |
| `$__timeTo()` | Returns the end of the dashboard time range | `TIMESTAMP('2024-01-02 00:00:00')` |
| `$__timeGroup(column, interval)` | Groups results by time interval for use in `GROUP BY` | `TIMESTAMP_MILLIS(DIV(UNIX_MILLIS(column), 300000) * 300000)` |
| `$__timeShifting(interval)` | Creates a duplicate query with time range shifted. The macro is removed from SQL. | Runs query twice for comparison |

### Macro examples

The following examples demonstrate common macro usage patterns.

#### Filter by time range

Use `$__timeFilter` to filter data to the dashboard's selected time range:

```sql
SELECT
  timestamp_column AS time,
  value_column
FROM `project.dataset.table`
WHERE $__timeFilter(timestamp_column)
```

#### Group by time interval

Use `$__timeGroup` to aggregate data into time buckets:

```sql
SELECT
  $__timeGroup(timestamp_column, $__interval) AS time,
  AVG(value_column) AS avg_value
FROM `project.dataset.table`
WHERE $__timeFilter(timestamp_column)
GROUP BY time
ORDER BY time
```

#### Use time boundaries

Use `$__timeFrom()` and `$__timeTo()` when you need explicit time boundaries:

```sql
SELECT
  COUNT(*) AS total_events,
  $__timeFrom() AS period_start,
  $__timeTo() AS period_end
FROM `project.dataset.events`
WHERE timestamp_column BETWEEN $__timeFrom() AND $__timeTo()
```

#### Compare data across time periods

Use `$__timeShifting` to compare current data with historical data. When you include this macro in your query, Grafana creates a duplicate query with the time range shifted by the specified interval:

```sql
SELECT
  $__timeGroup(timestamp_column, $__interval) AS time,
  AVG(value_column) AS avg_value
FROM `project.dataset.metrics`
WHERE $__timeFilter(timestamp_column)
GROUP BY time
ORDER BY time
-- $__timeShifting(7d)
```

The `$__timeShifting(7d)` macro is removed from the SQL and instead shifts the time range. This query runs twice: once for the current time range, and once for the same period 7 days ago. The results appear as separate series in your visualization, allowing you to compare week-over-week data.

Supported intervals: `s` (seconds), `min` (minutes), `h` (hours), `d` (days), `w` (weeks), `m` (months), `M` (months), `y` (years).

## Query partitioned tables

BigQuery [partitioned tables](https://cloud.google.com/bigquery/docs/partitioned-tables) improve query performance and reduce costs. The query editor provides autocompletion for partition filters.

### Ingestion-time partitioned tables

For tables partitioned by ingestion time, filter on `_PARTITIONTIME`:

```sql
SELECT
  timestamp_column AS time,
  value_column
FROM `project.dataset.partitioned_table`
WHERE _PARTITIONTIME BETWEEN $__timeFrom() AND $__timeTo()
  AND $__timeFilter(timestamp_column)
```

### Column-partitioned tables

For tables partitioned by a specific column, filter on that column:

```sql
SELECT
  event_date AS time,
  value_column
FROM `project.dataset.date_partitioned_table`
WHERE $__timeFilter(event_date)
```

{{< admonition type="note" >}}
Always include partition filters in your queries to minimize data scanned and reduce costs.
{{< /admonition >}}

## Storage API

The plugin supports the [BigQuery Storage API](https://cloud.google.com/bigquery/docs/reference/storage) for reading large result sets more efficiently.

To enable the Storage API:

- **Code mode:** Toggle **Use Storage API** in the query header.
- **Builder mode:** Expand the **Options** section at the bottom and toggle **Use Storage API**.

{{< admonition type="note" >}}
The Storage API doesn't work with Forward OAuth Identity authentication.
{{< /admonition >}}

## Query options

The query editor provides additional options depending on the mode:

### Code mode options

In Code mode, access the **Use Storage API** toggle directly in the query header.

### Builder mode options

In Builder mode, expand the **Options** section at the bottom of the query editor to access:

| Option | Description |
|--------|-------------|
| **Use Storage API** | Enable the BigQuery Storage API for improved performance with large result sets. |

## Next steps

- [Use template variables](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/template-variables/) to create dynamic dashboards
- Add [Transformations](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/panels-visualizations/query-transform-data/transform-data/) to manipulate query results
- Set up [Alerting](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/alerting/) rules based on your BigQuery data
