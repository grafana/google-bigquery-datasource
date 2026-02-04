---
description: Troubleshoot common issues with the Google BigQuery data source in Grafana
keywords:
  - grafana
  - bigquery
  - google
  - gcp
  - troubleshooting
  - errors
  - authentication
  - query
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Troubleshooting
title: Troubleshoot Google BigQuery data source issues
weight: 600
---

# Troubleshoot Google BigQuery data source issues

This document provides solutions to common issues you may encounter when configuring or using the Google BigQuery data source. For configuration instructions, refer to [Configure the BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/).

## Authentication errors

These errors occur when credentials are invalid, missing, or don't have the required permissions.

### "Access denied" or "Permission denied"

**Symptoms:**

- Save & test fails with access denied errors
- Queries return permission denied messages
- Projects, datasets, or tables don't load in drop-downs

**Possible causes and solutions:**

| Cause | Solution |
|-------|----------|
| Missing BigQuery roles | Assign the **BigQuery Data Viewer** and **BigQuery Job User** roles to the service account. |
| Service account key expired or revoked | Create a new key in the Google Cloud Console and update the data source configuration. |
| Wrong project selected | Verify the default project matches where your data is located. |
| API not enabled | Enable the [BigQuery API](https://console.cloud.google.com/apis/library/bigquery.googleapis.com) in your project. |

### "Invalid JWT signature" or "Invalid token"

**Symptoms:**

- Data source test fails immediately
- Error mentions JWT or token validation

**Solutions:**

1. Verify the service account key file is valid JSON.
1. Check that the private key in the configuration matches the key file.
1. Ensure the `tokenUri` is set to `https://oauth2.googleapis.com/token`.
1. Create a new service account key if the current one is corrupted.

### "Service account impersonation failed"

**Symptoms:**

- Queries fail when using service account impersonation
- Error mentions impersonation or token creation

**Solutions:**

1. Verify the source service account has the **Service Account Token Creator** role (`roles/iam.serviceAccountTokenCreator`).
1. Ensure the target service account (being impersonated) has the required BigQuery roles.
1. Check that the target service account email is correctly configured.

### Forward OAuth Identity not working

**Symptoms:**

- Queries fail when using Forward OAuth Identity
- User sees authentication errors after logging in

**Solutions:**

1. Verify the OAuth scope `https://www.googleapis.com/auth/bigquery` is configured in Grafana's OAuth settings.
1. Ensure users have authenticated with Google OAuth before accessing BigQuery dashboards.
1. Check that the **Default project** is configured in the data source settings.

{{< admonition type="note" >}}
Forward OAuth Identity doesn't support alerting or other background features that require credentials when users aren't logged in.
{{< /admonition >}}

## Connection errors

These errors occur when Grafana cannot reach Google BigQuery endpoints.

### "Connection refused" or timeout errors

**Symptoms:**

- Data source test times out
- Queries fail with network errors
- Intermittent connection failures

**Solutions:**

1. Verify network connectivity from the Grafana server to Google Cloud endpoints.
1. Check firewall rules allow outbound HTTPS (port 443) to `*.googleapis.com`.
1. If using a proxy, ensure it's configured correctly in Grafana's settings.
1. For Grafana Cloud accessing private resources, configure [Private data source connect](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/).

### "Could not resolve host"

**Symptoms:**

- DNS resolution errors in logs
- Unable to reach Google API endpoints

**Solutions:**

1. Verify DNS settings on the Grafana server.
1. Test DNS resolution: `nslookup bigquery.googleapis.com`.
1. Check for network policy restrictions blocking external DNS.

## Query errors

These errors occur when executing queries against BigQuery.

### "No data" or empty results

**Symptoms:**

- Query executes without error but returns no data
- Charts show "No data" message
- Tables are empty

**Possible causes and solutions:**

| Cause | Solution |
|-------|----------|
| Time range doesn't contain data | Expand the dashboard time range or verify data exists in BigQuery for the selected period. |
| Wrong project, dataset, or table | Verify you've selected the correct resources in the query. |
| Filter conditions too restrictive | Review `WHERE` clauses and ensure they match existing data. |
| Macro not expanding correctly | Check the generated SQL in Query Inspector to verify macro expansion. |

### "Syntax error" or "Query parse error"

**Symptoms:**

- Query fails with syntax error
- Error points to a specific position in the query

**Solutions:**

1. Use the query validator in the SQL editor to identify syntax issues.
1. Verify table and column names are correctly quoted with backticks.
1. Check that macros are used correctly (for example, `$__timeFilter(column)` not `$__timeFilter`).
1. Ensure BigQuery Standard SQL syntax is used, not Legacy SQL.

### Query timeout

**Symptoms:**

- Query runs for a long time then fails
- Error mentions timeout or exceeded limits

**Solutions:**

1. Narrow the time range to reduce data volume.
1. Add filters to reduce the result set.
1. Use partitioned tables and filter on the partition column.
1. Add `LIMIT` clause for exploratory queries.
1. Consider pre-aggregating data for frequently-used queries.

### "Query exceeded resource limits"

**Symptoms:**

- Error mentions resource limits or quota exceeded
- Query fails after processing some data

**Solutions:**

1. Simplify the query by reducing JOINs or subqueries.
1. Break complex queries into smaller parts.
1. Use approximate aggregation functions where precision isn't critical.
1. Request a quota increase in Google Cloud Console if needed.

### Incorrect data types

**Symptoms:**

- Numbers appear as strings
- Timestamps aren't recognized
- Visualization doesn't work as expected

**Solutions:**

1. Use explicit type casting in your query: `CAST(column AS INT64)`.
1. Alias timestamp columns as `time`: `SELECT timestamp_col AS time`.
1. Verify the column types in BigQuery match what Grafana expects.

## Template variable errors

These errors occur when using template variables with the data source.

### Variables return no values

**Symptoms:**

- Variable drop-down is empty
- "No options found" message appears

**Solutions:**

1. Test the data source connection using **Save & test**.
1. Run the variable query manually in the query editor to verify it returns results.
1. Check that the service account has permission to query the tables referenced in the variable query.
1. For chained variables, ensure parent variables have valid selections.

### Variables are slow to load

**Symptoms:**

- Dashboard takes a long time to load
- Variable drop-downs are unresponsive

**Solutions:**

1. Set variable refresh to **On dashboard load** instead of **On time range change**.
1. Add `LIMIT` to variable queries to reduce result count.
1. Simplify variable queries to scan less data.
1. Use caching if available in your Grafana edition.

### Variable value not interpolated

**Symptoms:**

- Query shows `$variable` literally instead of the value
- Error about unknown identifier

**Solutions:**

1. Verify the variable name matches exactly (case-sensitive).
1. Use `${variable}` syntax when the variable is adjacent to other text.
1. Check the Query Inspector to see how variables are interpolated.

## Performance issues

These issues relate to slow queries or high costs.

### Queries are slow

**Symptoms:**

- Dashboards take a long time to load
- Queries timeout frequently

**Solutions:**

1. Use partitioned tables and filter on partition columns with `$__timeFilter`.
1. Select only the columns you need instead of `SELECT *`.
1. Use appropriate aggregation intervals to reduce data points.
1. Consider using BigQuery BI Engine for frequently accessed data.

### High query costs

**Symptoms:**

- Unexpected BigQuery charges
- Quota warnings from Google Cloud

**Solutions:**

1. Review query costs in BigQuery Console under **Query history**.
1. Use `$__timeFilter` to limit data scanned to the dashboard time range.
1. Avoid `SELECT *` and select only required columns.
1. Set appropriate dashboard refresh intervals (don't refresh more often than needed).
1. Use the **Query priority** option to set batch priority for non-urgent queries.
1. Consider enabling query caching in Grafana Enterprise or Grafana Cloud.

### Storage API errors

**Symptoms:**

- Errors when using the Storage API option
- "Storage API not enabled" message

**Solutions:**

1. Enable the [BigQuery Storage API](https://console.cloud.google.com/apis/library/bigquerystorage.googleapis.com) in your project.
1. Ensure the service account has the **BigQuery Read Session User** role.
1. Disable Storage API if not needed for your use case.

{{< admonition type="note" >}}
The Storage API doesn't work with Forward OAuth Identity authentication.
{{< /admonition >}}

## Configuration errors

These errors occur during data source setup or provisioning.

### "Failed to save datasource"

**Symptoms:**

- Unable to save data source configuration
- Error when clicking **Save & test**

**Solutions:**

1. Verify all required fields are filled in.
1. Check that the JSON key file is valid and complete.
1. Ensure Grafana has write permissions to its data directory.

### Provisioning errors

**Symptoms:**

- Provisioned data source doesn't appear
- Errors in Grafana logs about provisioning

**Solutions:**

1. Verify YAML syntax is correct (use a YAML validator).
1. Check that `type` is set to `grafana-bigquery-datasource`.
1. Ensure `authenticationType` matches the credentials provided.
1. For `privateKey` in `secureJsonData`, ensure newlines are preserved (use `|` for multiline strings in YAML).

**Example with multiline private key:**

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    jsonData:
      authenticationType: jwt
      clientEmail: <SERVICE_ACCOUNT_EMAIL>
      defaultProject: <PROJECT_ID>
      tokenUri: https://oauth2.googleapis.com/token
    secureJsonData:
      privateKey: |
        -----BEGIN PRIVATE KEY-----
        <KEY_CONTENT>
        -----END PRIVATE KEY-----
```

## Enable debug logging

To capture detailed error information for troubleshooting:

1. Set the Grafana log level to `debug` in the configuration file:

   ```ini
   [log]
   level = debug
   ```

1. Restart Grafana.
1. Review logs in `/var/log/grafana/grafana.log` (or your configured log location).
1. Look for `bigquery` or `grafana-bigquery-datasource` entries.
1. Reset the log level to `info` after troubleshooting to avoid excessive log volume.

## Use Query Inspector

The Query Inspector helps debug query issues:

1. Open a panel in edit mode.
1. Click the **Query Inspector** button.
1. Review the **Query** tab to see the exact SQL sent to BigQuery.
1. Check the **Stats** tab for query timing information.
1. Look at the **JSON** tab for the raw response data.

## Get additional help

If you've tried the solutions above and still encounter issues:

1. Check the [Grafana community forums](https://community.grafana.com/) for similar issues.
1. Review the [BigQuery plugin GitHub issues](https://github.com/grafana/google-bigquery-datasource/issues) for known bugs.
1. Consult the [Google BigQuery documentation](https://cloud.google.com/bigquery/docs) for BigQuery-specific guidance.
1. Contact [Grafana Support](https://grafana.com/support/) if you're a Grafana Cloud or Enterprise customer.

When reporting issues, include:

- Grafana version
- BigQuery plugin version
- Error messages (redact sensitive information)
- Steps to reproduce
- Relevant configuration (redact credentials)
- Query Inspector output if applicable
