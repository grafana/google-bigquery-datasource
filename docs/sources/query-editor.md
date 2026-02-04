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
---

# Google BigQuery query editor

This document explains how to use the Google BigQuery query editor to build and run queries in Grafana.

## Before you begin

Before using the query editor:

- [Configure the Google BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/)
- Verify your credentials have appropriate permissions to query the datasets you need

## Query editor modes

The BigQuery data source provides two query editor modes:

- **SQL query editor:** Write raw SQL queries with autocompletion and validation
- **Visual query editor:** Build queries without writing SQL using a point-and-click interface

## SQL query editor

The SQL query editor provides a rich editing experience for writing BigQuery Standard SQL queries.

{{< figure src="/media/docs/bigquery/BQCodeEditor.png" max-width="800px" alt="BigQuery SQL query editor" caption="The SQL query editor with autocompletion" >}}

### Autocompletion

The SQL query editor includes autocompletion for:

- **BigQuery Standard SQL syntax:** Keywords, functions, and operators
- **Schema objects:** Datasets, tables, and columns from your BigQuery project
- **Macros:** Grafana macros like `$__timeFilter` and `$__timeGroup`
- **Template variables:** Dashboard variables you've defined

To trigger autocompletion, press `Ctrl+Space` (Windows/Linux) or `Cmd+Space` (macOS).

### Query validation

The SQL query editor validates your query as you type. If the query contains errors, the editor displays information about what's wrong.

When the query is valid, the editor shows an estimated query size, helping you understand the data volume before running the query.

{{< figure src="/media/docs/bigquery/BQCodeEditorValidation.gif" max-width="800px" alt="BigQuery query validation" caption="Query validation showing errors and estimated query size" >}}

### Extended code editor

For complex queries, use the full-screen code editor. Click the expand button in the query editor toolbar to open the extended editor.

{{< figure src="/media/docs/bigquery/BQCodeEditorFS.gif" max-width="800px" alt="BigQuery full-screen editor" caption="The full-screen code editor for working with long queries" >}}

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Return` | Run the query |

## Visual query editor

The Visual query editor lets you build BigQuery queries without writing SQL. It's useful for users who aren't familiar with SQL or for building simple queries quickly.

{{< figure src="/media/docs/bigquery/BQVqb.gif" max-width="800px" alt="BigQuery Visual query editor" caption="Building a query with the Visual query editor" >}}

The Visual query editor supports:

- **Selecting columns:** Choose which columns to include in results
- **Aggregations:** Apply functions like `COUNT`, `SUM`, `AVG`, `MIN`, and `MAX`
- **Filtering:** Add `WHERE` conditions to filter data
- **Grouping:** Group results by one or more columns
- **Ordering:** Sort results by column values
- **Preview:** View the generated SQL query

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
| `$__timeShifting(interval)` | Compares data across time periods by shifting the time range | Used for time-over-time comparisons |

### Macro examples

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

Use `$__timeShifting` to compare current data with historical data:

```sql
SELECT
  timestamp_column AS time,
  value_column,
  $__timeShifting(7d)
FROM `project.dataset.metrics`
WHERE $__timeFilter(timestamp_column)
```

This creates a shifted query that compares the current time range with the same period 7 days ago.

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

1. Open the query editor.
1. Expand the **Query options** section.
1. Enable **Use Storage API**.

{{< admonition type="note" >}}
The Storage API doesn't work with Forward OAuth Identity authentication.
{{< /admonition >}}

## Query options

Expand the **Query options** section in the query editor to access additional settings:

| Option | Description |
|--------|-------------|
| **Use Storage API** | Enable the BigQuery Storage API for improved performance with large result sets. |
| **Query priority** | Set the query priority (interactive or batch). |

## Next steps

- [Use template variables](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/template-variables/) to create dynamic dashboards
- Add [Transformations](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/panels-visualizations/query-transform-data/transform-data/) to manipulate query results
- Set up [Alerting](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/alerting/) rules based on your BigQuery data
