---
description: Use template variables with the Google BigQuery data source in Grafana
keywords:
  - grafana
  - bigquery
  - google
  - gcp
  - variables
  - templates
  - dashboard
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Template variables
title: Google BigQuery template variables
weight: 300
---

# Google BigQuery template variables

Template variables let you create dynamic, reusable dashboards. Instead of hard-coding values like project names, datasets, or filter conditions, you can use variables that users can change from the dashboard.

## Before you begin

Before using template variables:

- [Configure the Google BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/)
- Understand [Grafana template variables](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/variables/)

## Supported variable types

| Variable type | Supported | Description |
|---------------|-----------|-------------|
| **Query** | Yes | Populate options from a BigQuery query |
| **Custom** | Yes | Define a static list of options |
| **Text box** | Yes | Free-form text input |
| **Constant** | Yes | Single constant value |
| **Data source** | Yes | Select from available BigQuery data sources |
| **Interval** | Yes | Time interval values for time grouping |

## Create a query variable

Query variables let you dynamically populate a drop-down with values from BigQuery.

To create a query variable:

1. Navigate to **Dashboard settings** (gear icon).
1. Click **Variables** in the left menu.
1. Click **Add variable**.
1. Enter a **Name** for the variable (for example, `dataset`).
1. Select **Query** as the variable type.
1. Select your **Google BigQuery** data source.
1. Enter a query that returns the values you want.
1. Click **Run query** to preview the results.
1. Click **Apply** to save the variable.

## Query variable examples

The following examples show common queries for populating variable options.

### List datasets in a project

```sql
SELECT schema_name
FROM `project_id.INFORMATION_SCHEMA.SCHEMATA`
ORDER BY schema_name
```

### List tables in a dataset

```sql
SELECT table_name
FROM `project_id.dataset_name.INFORMATION_SCHEMA.TABLES`
ORDER BY table_name
```

### List distinct values from a column

```sql
SELECT DISTINCT region
FROM `project_id.dataset_name.table_name`
ORDER BY region
```

### List columns from a table

```sql
SELECT column_name
FROM `project_id.dataset_name.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'table_name'
ORDER BY ordinal_position
```

### List values with a display name

Return two columns to use different values for the display name and the actual value:

```sql
SELECT 
  display_name AS __text,
  id AS __value
FROM `project_id.dataset_name.lookup_table`
ORDER BY display_name
```

The `__text` column appears in the drop-down, and `__value` is used in queries.

### List values filtered by time range

Use macros to filter variable options based on the dashboard time range:

```sql
SELECT DISTINCT category
FROM `project_id.dataset_name.events`
WHERE $__timeFilter(event_time)
ORDER BY category
```

## Use variables in queries

After creating variables, reference them in your queries using the `$variable_name` or `${variable_name}` syntax.

### Basic variable usage

Variables inside backticks (for table references) don't need quotes because they're part of BigQuery identifiers:

```sql
SELECT
  timestamp AS time,
  value
FROM `project_id.$dataset.$table`
WHERE $__timeFilter(timestamp)
```

### Variable in WHERE clause

For single-select variables, add quotes around the variable:

```sql
SELECT
  timestamp AS time,
  metric_value
FROM `project_id.dataset.metrics`
WHERE $__timeFilter(timestamp)
  AND region = '$region'
```

### Multi-value variables

For variables that allow multiple selections, use the `IN` operator without adding quotes:

```sql
SELECT
  timestamp AS time,
  metric_value
FROM `project_id.dataset.metrics`
WHERE $__timeFilter(timestamp)
  AND region IN ($region)
```

{{< admonition type="note" >}}
The BigQuery data source **automatically quotes** values for multi-select variables and variables with the **Include All option** enabled. Do not add quotes around these variables in your queries, or you'll get double-quoted values that cause errors.
{{< /admonition >}}

### Variable quoting behavior

The data source handles variable quoting differently based on the variable configuration:

| Variable type | Quoting behavior | Example query | Result with `us-east1` selected |
|---------------|------------------|---------------|----------------------------------|
| Single-select | No auto-quoting | `region = '$var'` | `region = 'us-east1'` |
| Multi-select | Auto-quoted | `region IN ($var)` | `region IN ('us-east1')` |
| Multi-select (multiple values) | Auto-quoted, comma-separated | `region IN ($var)` | `region IN ('us-east1','us-west1')` |

{{< admonition type="warning" >}}
Using `'$var'` with a multi-select variable causes double quoting: `''us-east1''` — which is invalid SQL.
{{< /admonition >}}

### Pattern matching with LIKE

Use variables for search patterns:

```sql
SELECT
  timestamp AS time,
  metric_name,
  metric_value
FROM `project_id.dataset.metrics`
WHERE $__timeFilter(timestamp)
  AND metric_name LIKE '$search%'
```

### Numeric variables

For variables containing numbers (such as a limit or threshold), don't use quotes:

```sql
SELECT
  timestamp AS time,
  metric_value
FROM `project_id.dataset.metrics`
WHERE $__timeFilter(timestamp)
  AND metric_value > $threshold
LIMIT $row_limit
```

## Chain variables

You can create cascading variables where one variable's options depend on another variable's selection.

### Example: Dataset and table chain

1. Create a `dataset` variable:

   ```sql
   SELECT schema_name
   FROM `project_id.INFORMATION_SCHEMA.SCHEMATA`
   ORDER BY schema_name
   ```

1. Create a `table` variable that references `$dataset`:

   ```sql
   SELECT table_name
   FROM `project_id.$dataset.INFORMATION_SCHEMA.TABLES`
   ORDER BY table_name
   ```

When users select a dataset, the table drop-down automatically updates to show only tables in that dataset.

### Example: Column selector

Create a variable that lists columns from the currently selected table:

1. Ensure you have `dataset` and `table` variables.

1. Create a `column` variable:

   ```sql
   SELECT column_name
   FROM `project_id.$dataset.INFORMATION_SCHEMA.COLUMNS`
   WHERE table_name = '$table'
   ORDER BY ordinal_position
   ```

Use this to let users select which column to aggregate or filter on.

## Variable syntax options

Grafana supports multiple syntax formats for variables:

| Syntax | Example | Use case |
|--------|---------|----------|
| `$variable` | `$region` | Simple reference |
| `${variable}` | `${region}` | When variable is adjacent to other text |
| `${variable:option}` | `${region:csv}` | Apply formatting options |

### Formatting options

| Option | Description | Example input | Example output |
|--------|-------------|---------------|----------------|
| `csv` | Comma-separated values | `['us-east1', 'us-west1']` | `us-east1,us-west1` |
| `pipe` | Pipe-separated values | `['us-east1', 'us-west1']` | `us-east1\|us-west1` |
| `singlequote` | Single-quoted, comma-separated | `['us-east1', 'us-west1']` | `'us-east1','us-west1'` |
| `doublequote` | Double-quoted, comma-separated | `['us-east1', 'us-west1']` | `"us-east1","us-west1"` |

For more formatting options, refer to [Advanced variable format options](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/variables/variable-syntax/#advanced-variable-format-options).

## Best practices

Follow these recommendations for effective template variable usage:

- **Use meaningful names:** Choose descriptive variable names like `environment` instead of `var1`.
- **Add descriptions:** Include descriptions to help users understand what each variable controls.
- **Set defaults:** Configure sensible default values so dashboards load with useful data.
- **Limit options:** For variables with many possible values, consider adding a `LIMIT` clause or filtering to improve performance.
- **Test with All option:** If using the "All" option, verify your queries handle multi-value scenarios correctly.

## Related resources

- [Grafana template variables](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/variables/)
- [Variable syntax](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/variables/variable-syntax/)
- [Add a query variable](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/variables/add-template-variables/#add-a-query-variable)
