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
  - workload identity federation
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Troubleshooting
title: Troubleshoot Google BigQuery data source issues
weight: 600
review_date: 2026-08-17
---

# Troubleshoot Google BigQuery data source issues

This document provides solutions to common issues you may encounter when configuring or using the Google BigQuery data source. For configuration instructions, refer to [Configure the BigQuery data source](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/).

## Version and upgrade guidance

An outdated or out-of-sync plugin version is the most common cause of BigQuery data source failures. Before deeper troubleshooting, confirm you're on the latest version. Upgrading and then restarting Grafana resolves a wide range of problems.

{{< admonition type="note" >}}
On Grafana Cloud, the Google BigQuery plugin is managed by Grafana and updates automatically. On self-managed Grafana, you must update the plugin manually. In other managed environments, such as Azure Managed Grafana, the plugin version is controlled by the platform provider and can lag behind the latest release.
{{< /admonition >}}

### Symptoms of an outdated plugin version

These symptoms often appear after a Grafana or platform upgrade:

- **Save & test** fails with "An error occurred within the plugin" or another generic plugin error.
- The data source won't save, or dashboards that previously loaded stop loading.
- The configuration tab looks blank or incomplete.
- Intermittent `Plugin unavailable` or HTTP 500 errors, especially after a Pod or instance restart.

### Check and update the plugin version

1. Navigate to **Administration** > **Plugins and data** > **Plugins**.
1. Search for **Google BigQuery** and open its page.
1. Review the installed version and the latest available version.
1. If an update is available and you're on self-managed Grafana, click **Update**. You can also install or upgrade from the command line:

   ```bash
   grafana cli plugins install grafana-bigquery-datasource
   ```

1. Restart Grafana after updating. The new version often doesn't take effect until the instance restarts and finishes syncing the plugin.

Plugin version 3.x requires Grafana 11.6.11 or later. On Grafana 12.x, the plugin also requires these minimum patch versions: 12.0.10, 12.1.7, or 12.2.5, depending on your minor release. For older Grafana versions, use plugin version 2.x (requires Grafana 10.4.8 or later) or 1.x.

### "An error occurred within the plugin" or generic plugin errors

**Symptoms:**

- **Save & test** fails with "An error occurred within the plugin"
- Generic "plugin error" messages without specific details
- Dashboards stop loading after a Grafana upgrade

**Solutions:**

1. Update the BigQuery plugin to the latest version using the steps in [Check and update the plugin version](#check-and-update-the-plugin-version).
1. Restart Grafana. An update that looks successful in the UI can still run the previous version until the instance restarts.
1. Verify the plugin version is compatible with your Grafana version.
1. If the error continues after update and restart, follow [Plugin not registered or plugin not found](#plugin-not-registered-or-plugin-not-found).

### "Plugin not registered" or "plugin not found"

**Symptoms:**

- Error message indicates the plugin is not registered, not found, or failed to load
- Dashboards show **Datasource Error** after a Grafana or platform change
- The plugin page shows the plugin as uninstalled or in an error state
- Occurs after Pod or instance restarts, including in Grafana Cloud
- Data source was previously working but becomes unavailable

**Solutions:**

1. Open **Administration** > **Plugins and data** > **Plugins**, search for **Google BigQuery**, and check its status. If it isn't installed or shows an error, install or reinstall it (uninstall, then install again).
1. Restart Grafana after reinstalling. After a platform update or Pod restart, the plugin sometimes doesn't re-register until you reinstall and restart.
1. On self-managed Grafana, review the Grafana server logs for `grafana-bigquery-datasource` or `gpx_bigquery` errors. Refer to [Enable debug logging](#enable-debug-logging).
1. On Grafana Cloud, you can't access backend plugin logs directly. If a reinstall doesn't restore the data source, contact [Grafana Support](https://grafana.com/support/) and ask them to review the plugin logs.
1. If the issue persists after reinstalling, contact [Grafana Support](https://grafana.com/support/).

## Authentication errors

These errors occur when credentials are invalid, missing, or don't have the required permissions.

### "Access denied" or "Permission denied"

**Symptoms:**

- Save & test fails with access denied errors
- Queries return permission denied messages
- Projects, datasets, or tables don't load in drop-downs

**Possible causes and solutions:**

| Cause                                  | Solution                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Missing BigQuery roles                 | Assign the **BigQuery Data Viewer** and **BigQuery Job User** roles to the service account on each project it queries. |
| Service account key expired or revoked | Create a new key in the Google Cloud Console and update the data source configuration.                            |
| Wrong project selected                 | Verify the default project matches where your data is located.                                                    |
| API not enabled                        | Enable the [BigQuery API](https://console.cloud.google.com/apis/library/bigquery.googleapis.com) in your project. |
| Dataset or table-level restrictions    | Grant the service account access to the specific datasets or tables, not just the project.                        |
| Empty project drop-down                | That's a Cloud Resource Manager permission issue, not a query 403. Refer to [Project drop-down not populating](#project-drop-down-not-populating). |
| Empty dataset drop-down                | Project-level Data Viewer and Job User aren't enough if access is only on specific datasets. Grant dataset READER (or `bigquery.datasets.get`) on those datasets. Refer to [Dataset drop-down not populating](#dataset-drop-down-not-populating). |

To isolate whether the failure is in Grafana or GCP, run the same query as the service account outside Grafana. In the [Google Cloud Console](https://console.cloud.google.com/bigquery) query editor, or with the [`bq` CLI](https://cloud.google.com/bigquery/docs/bq-command-line-tool) after activating the key:

```bash
gcloud auth activate-service-account --key-file=<KEY_FILE>
bq query --use_legacy_sql=false --project_id=<PROJECT_ID> 'SELECT 1'
```

If that query fails, fix IAM or APIs in GCP before changing the data source. If it succeeds and Grafana still returns 403, the data source is using different credentials or a different project than the ones you tested.

### 403 errors on queries when Save & test passes

**Symptoms:**

- **Save & test** succeeds but queries return 403 permission denied errors
- Only some queries fail while others work

**Solutions:**

1. The service account has project-level access but is missing dataset or table-level permissions. In the BigQuery Console, verify the service account has read access to the specific datasets being queried.
1. If you use one service account across several GCP projects, grant **BigQuery Data Viewer** and **BigQuery Job User** on every project the queries touch, not only the default project.
1. Ensure the [BigQuery API](https://console.cloud.google.com/apis/library/bigquery.googleapis.com) is enabled in each target project, not just the default project.
1. Confirm the same query succeeds outside Grafana using the `bq` CLI or Cloud Console steps in ["Access denied" or "Permission denied"](#access-denied-or-permission-denied).

### Project drop-down not populating

**Symptoms:**

- The GCP project drop-down in the query editor is empty
- No projects are listed when configuring the data source
- Other query features work correctly

**Solutions:**

1. Grant the service account the `resourcemanager.projects.get` permission. This permission is included in the **Browser** role (`roles/browser`) or can be assigned through a custom role.
1. Ensure the [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com) is enabled in the project.
1. Verify the service account has access to the projects you expect to see listed. The drop-down only shows projects where the service account has at least one role.

### Dataset drop-down not populating

**Symptoms:**

- The project drop-down has values, but the dataset drop-down is empty or missing datasets
- You can run SQL that names the dataset, but you can't select it in Builder mode

The query editor lists datasets with BigQuery [`datasets.list`](https://cloud.google.com/bigquery/docs/reference/rest/v2/datasets/list), which returns only datasets the caller can get (`bigquery.datasets.get`). **BigQuery Data Viewer** and **BigQuery Job User** at project level include that. Dataset-scoped grants don't, unless the identity is also a dataset [READER](https://cloud.google.com/bigquery/docs/control-access-to-resources-iam#grant_access_to_a_dataset).

**Solutions:**

1. Prefer project-level **BigQuery Data Viewer** on the project that owns the datasets.
1. If you must use dataset-level IAM, add the service account as a dataset READER (or grant `bigquery.datasets.get`) on each dataset that should appear in the drop-down.
1. Confirm the same identity can list datasets in the [Google Cloud Console](https://console.cloud.google.com/bigquery) or with `bq ls --project_id=<PROJECT_ID>`.

### "Invalid JWT signature" or "Invalid token"

**Symptoms:**

- Data source test fails immediately
- Error mentions JWT or token validation
- Saving or replacing the service account key fails
- Your organization doesn't want to store a service account key in Grafana

**Solutions:**

1. Upload a **JSON** service account key from the Google Cloud Console. P12 keys aren't supported. The file must include `client_email`, `private_key`, and `token_uri`.
1. If replacing a key on an existing data source fails, update the BigQuery plugin first, then restart Grafana and try again. Older plugin versions could fail to reset or change the stored JWT.
1. Verify the private key in the configuration matches the JSON file, and that `tokenUri` is `https://oauth2.googleapis.com/token`.
1. Create a new JSON key in Google Cloud if the current one is corrupted or revoked, then paste or upload it again.

For policies that limit long-lived keys:

- **Service account impersonation** still stores a JWT, but that key only needs permission to mint tokens. The impersonated account holds BigQuery access. Refer to [Service account impersonation](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/#service-account-impersonation).
- **GCE Default Service Account** stores no key. Use it when Grafana runs on a GCE VM.
- **Workload Identity Federation** stores no key, but it's Grafana Cloud only and doesn't support alerting. Refer to [Workload Identity Federation](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/#workload-identity-federation).

### "Service account impersonation failed"

**Symptoms:**

- Queries fail when using service account impersonation
- Error mentions impersonation or token creation
- Only a "Service account email to impersonate" field is visible and it's unclear how to proceed

**Solutions:**

1. Verify you have configured authentication *before* enabling impersonation. Service account impersonation requires an underlying authentication method (either Google JWT File or GCE Default Service Account). Upload your authenticating service account's JSON key first, then under **Service account impersonation**, turn on **Enable**.
1. Verify the authenticating service account has the **Service Account Token Creator** role (`roles/iam.serviceAccountTokenCreator`) on the impersonated service account.
1. Ensure the impersonated service account has the required BigQuery roles (**BigQuery Data Viewer** and **BigQuery Job User**).
1. Check that the impersonated service account email is the full email address (for example, `my-sa@my-project.iam.gserviceaccount.com`).

For detailed setup instructions including `gcloud` commands, refer to [Service account impersonation](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/#service-account-impersonation).

### Workload Identity Federation authentication failing

**Symptoms:**

- Queries fail when using Workload Identity Federation (WIF)
- Errors mention token exchange, invalid audience, or the workload identity pool provider
- The project, dataset, or table selectors in the query editor show load errors because the default project can't be resolved
- Authentication works on interactive dashboards but fails for alerts, scheduled reports, or public dashboards

**Solutions:**

1. Confirm you're on Grafana Cloud. Workload Identity Federation is available on Grafana Cloud only, because Grafana Cloud exchanges the signed-in user's external OIDC token for a short-lived Google Cloud access token before the request reaches the plugin.
1. Verify the **Workload Identity Pool Provider** resource path is correct and uses the format `projects/<project-number>/locations/global/workloadIdentityPools/<pool-id>/providers/<provider-id>`. Use the project **number** (a numeric ID such as `123456789`), not the project ID (such as `my-project`).
1. Check the provider's attribute mappings in Google Cloud. The `google.subject` attribute must map to the correct claim from your identity provider (for example, `assertion.sub`; the exact mapping depends on your provider's claim format).
1. Verify the BigQuery permissions are granted to the correct principal:
   - **Without impersonation:** the WIF pool principal needs the **BigQuery Data Viewer** and **BigQuery Job User** roles, and the **Service account email** field must be left blank.
   - **With impersonation:** the impersonated service account needs the **BigQuery Data Viewer** and **BigQuery Job User** roles, the WIF pool principal needs the **Service Account Token Creator** role on that service account, and the impersonated service account's full email must be entered in the **Service account email** field.
1. Ensure your Grafana Cloud stack's SSO integration is configured against the same OIDC provider that the workload identity pool trusts. If the signed-in user's identity isn't available, Grafana Cloud can't exchange it for a Google Cloud access token.

{{< admonition type="note" >}}
Credentials from Workload Identity Federation are tied to the signed-in user's active session. There is no long-lived credential available to the Grafana backend, so features that run without a user present don't work, including alerting, scheduled reports, and public dashboards. If you rely on these features, use a service account key (JWT) instead.
{{< /admonition >}}

For detailed setup instructions, refer to [Workload Identity Federation](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/configure/#workload-identity-federation).

### Forward OAuth Identity not working

**Symptoms:**

- Queries fail when using Forward OAuth Identity
- User sees authentication errors after logging in
- OAuth scopes appear correct in configuration files but authentication still fails

**Solutions:**

1. Verify the OAuth scopes are configured in the Grafana OAuth settings: `https://www.googleapis.com/auth/bigquery` and `https://www.googleapis.com/auth/drive` (if querying data linked to Google Drive).
1. Ensure users have authenticated with Google OAuth before accessing BigQuery dashboards.
1. Check that the **Default project** is configured in the data source settings.
1. If you updated OAuth scopes in a configuration file but the data source still fails, the Grafana database may be storing stale settings that override the file-based configuration. To fix this, open the data source settings in the Grafana UI, re-enter the correct scopes, and click **Save & test**.

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
1. If using a proxy, ensure it's configured correctly in the Grafana settings.
1. For Grafana Cloud accessing private resources, configure [Private data source connect](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/).

### "Could not resolve host"

**Symptoms:**

- DNS resolution errors in logs
- Unable to reach Google API endpoints

**Solutions:**

1. Verify DNS settings on the Grafana server.
1. Test DNS resolution: `nslookup bigquery.googleapis.com`.
1. Check for network policy restrictions blocking external DNS.

### Private data source connect (PDC) errors

**Symptoms:**

- `socks connect tcp ... network unreachable` error messages
- SSH tunnel opens but closes immediately
- Intermittent connection failures when using PDC
- Data source works locally but fails in Grafana Cloud with PDC

**Solutions:**

1. Verify the PDC agent is running and connected. Check the agent logs and the PDC status in your Grafana Cloud instance under **Administration** > **Private data source connect**. `network unreachable` usually means Grafana Cloud has no connected agent to route through.
1. Restart the PDC agent if it has disconnected.
1. Run more than one PDC agent with the same configuration. A single agent is a single point of failure. For production, Grafana recommends at least three agents so PDC can load-balance and fail over. Refer to [Configure PDC](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/configure-pdc/).
1. If the SSH tunnel opens but immediately closes, this can indicate a plugin installation error rather than a network problem. Verify the BigQuery plugin is correctly installed and not in an error state. Refer to [Version and upgrade guidance](#version-and-upgrade-guidance).
1. Ensure the PDC agent's network allows outbound HTTPS (port 443) to `*.googleapis.com`.
1. For intermittent failures, high latency, or agent overload, follow [Troubleshoot PDC issues](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/troubleshooting/) rather than switching agent install methods. The Docker image includes a supported OpenSSH; the binary requires OpenSSH 9.2 or later (or `-use-gossh`).

For general PDC setup, refer to [Private data source connect](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/).

## Configuration errors

These errors occur during data source setup or provisioning.

### Failed to save data source

**Symptoms:**

- Unable to save data source configuration
- Error when clicking **Save & test**, including `Failed to save datasource`

**Solutions:**

1. Verify all required fields are filled in.
1. Check that the JSON key file is valid and complete.
1. Ensure Grafana has write permissions to its data directory.

### Provisioning errors

**Symptoms:**

- Provisioned data source doesn't appear
- Errors in Grafana logs about provisioning

**Solutions:**

1. Verify YAML syntax is correct (use a YAML syntax checker).
1. Check that `type` is set to `grafana-bigquery-datasource`.
1. Ensure `authenticationType` matches the credentials provided.
1. For `privateKey` in `secureJsonData`, ensure newlines are preserved (use `|` for multi-line strings in YAML).

**Example with a multi-line private key:**

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

## Query errors

These errors occur when executing queries against BigQuery.

### "No data" or empty results

**Symptoms:**

- Query executes without error but returns no data
- Charts show "No data" message
- Tables are empty

**Possible causes and solutions:**

| Cause                             | Solution                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| Time range doesn't contain data   | Expand the dashboard time range or verify data exists in BigQuery for the selected period. |
| Wrong project, dataset, or table  | Verify you've selected the correct resources in the query.                                 |
| Filter conditions too restrictive | Review `WHERE` clauses and ensure they match existing data.                                |
| Macro not expanding correctly     | Check the generated SQL in Query Inspector to verify macro expansion. Macros inside SQL comments (`--`, `#`, `/* */`) aren't expanded, and those comments are stripped from the query sent to BigQuery. |

### "Syntax error" or "Query parse error"

**Symptoms:**

- Query fails with syntax error
- Error points to a specific position in the query

**Solutions:**

1. Use query validation in the SQL editor to identify syntax issues.
1. Verify table and column names are correctly quoted with backticks.
1. Check that macros are used correctly (for example, `$__timeFilter(column)` not `$__timeFilter`).
1. Ensure BigQuery Standard SQL syntax is used, not Legacy SQL.

### Table outside accessible projects

These errors appear when **Restrict to accessible datasets** is enabled in the data source settings.

**Symptoms:**

- The query fails before it runs, with a message about datasets, referenced tables, or `EXECUTE IMMEDIATE`
- The same SQL works when the restriction is turned off

**Possible causes and solutions:**

| Cause | Solution |
|-------|----------|
| The query references a table outside the projects this data source can access, including tables reached through views | Add the dataset to **Additional allowed datasets** as `project.dataset`, or query a table in an accessible project. |
| Multi-statement scripts, `EXECUTE IMMEDIATE`, or procedure calls | The plugin can't verify referenced tables for these statement types. Run each statement as a separate query. |
| The query references 50 or more tables | Split the query so each statement references fewer tables. BigQuery reports at most 50 referenced tables in dry-run statistics. |
| Bare dataset names in **Additional allowed datasets** with no default project | Use the `project.dataset` form, or set a **Default project** so bare names can be qualified. |

### Query timeout

**Symptoms:**

- Query runs for a long time then fails
- Error mentions timeout or exceeded limits
- `context deadline exceeded`, especially on alerting rules or dashboards with many panels

**Possible causes and solutions:**

| Cause | Solution |
|-------|----------|
| The query scans too much data | In the [BigQuery Console query history](https://cloud.google.com/bigquery/docs/managing-jobs#view-jobs), check bytes processed. Add partition or cluster filters, narrow the dashboard time range, and avoid `SELECT *`. |
| Grafana query timeout | The BigQuery data source has no timeout setting. Dashboard queries use the Grafana data proxy timeout (default 30 seconds). Alert rules use the alerting evaluation timeout (default 30 seconds). |
| Many panels or alert rules at once | Dashboards with many BigQuery panels, and alert rules in the same evaluation group, run queries concurrently and can all hit the timeout together. |

**Solutions:**

1. Optimize the query first. Increasing a timeout doesn't help a scan of terabytes. Filter on the partition column with `$__timeFilter`, use clustered tables, and select only the columns you need.
1. On self-managed Grafana, you can raise the Grafana timeouts if the query is already efficient:
   - Dashboards: `[dataproxy] timeout` in `grafana.ini` (default `30`). Refer to [timeout](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-grafana/#timeout).
   - Alerting: `[unified_alerting] evaluation_timeout` (default `30s`). Refer to the [`evaluation_timeout`](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-grafana/#evaluation_timeout) setting.
1. Restart Grafana after changing `grafana.ini`.
1. On Grafana Cloud, you typically can't raise these timeouts. Reduce bytes scanned, or pre-aggregate data in BigQuery.
1. For alerting, split heavy rules into separate evaluation groups so they don't all query BigQuery at the same time. Refer to [Performance considerations](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/alerting/#performance-considerations).
1. Add a `LIMIT` clause while developing queries.

{{< admonition type="note" >}}
Queries that process terabytes of data likely exceed any reasonable timeout. Refactor the query to reduce data scanned rather than raising the timeout.
{{< /admonition >}}

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

### Stale variables in scheduled reports

**Symptoms:**

- Scheduled reports (Grafana Reporting) use outdated variable values
- Reports always render with the same variable selection instead of refreshing dynamically
- Variable values in the report don't match what's currently in BigQuery

**Solutions:**

1. Scheduled reports can cache variable values at the time the report is created. If the underlying BigQuery data changes, the report continues using the original values.
1. To force a dynamic refresh at runtime, use the [Grafana Reporting API](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/developers/http_api/reporting/) to clear the report's saved variable configuration. Remove the `templateVars` field from the report definition so variables are evaluated fresh at each scheduled run.
1. Alternatively, recreate the report after updating variable queries to pick up the latest values.

## Performance issues

These issues relate to slow queries or high costs.

### Queries are slow

**Symptoms:**

- Dashboards take a long time to load
- Queries timeout frequently
- High bytes billed per query

**Solutions:**

1. **Use partition filters.** Always filter on the partition column using `$__timeFilter(partition_column)`. Without a partition filter, BigQuery scans the entire table regardless of the dashboard time range.
1. **Narrow the time range.** Shorter time ranges scan less data. Use the dashboard time picker to limit the window.
1. **Avoid `SELECT *`.** Select only the columns your visualization needs. BigQuery is columnar, so fewer columns means less data scanned.
1. **Add `LIMIT` during development.** Use `LIMIT` when building and testing queries to reduce scan costs.
1. **Use appropriate aggregation intervals.** Aggregate data to match the visualization granularity. There's no benefit in returning per-second data for a chart showing daily trends.
1. **Set `Max bytes billed`.** Configure this in **Additional Settings** to prevent unexpectedly expensive queries from running.
1. **Enable `Restrict to accessible datasets`.** Configure this in **Additional Settings** to reject queries that reference tables outside the projects the data source has access to. This blocks queries against public datasets such as `bigquery-public-data`, which IAM cannot restrict.
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

## Grafana Cloud vs. self-managed differences

If you are migrating from self-managed Grafana to Grafana Cloud, be aware of the following behavioral differences with the BigQuery plugin.

### Dataset and table browsing

On self-managed Grafana, the BigQuery plugin connects directly to Google Cloud APIs. On Grafana Cloud, the connection may route through [Private data source connect (PDC)](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/) if your BigQuery resources are not publicly accessible. This routing can affect the speed at which datasets and tables load in the query editor drop-downs.

Whether all projects are visible in the project selector depends on service account permissions rather than PDC. Ensure the service account has `resourcemanager.projects.get` on each project you expect to see listed.

If dataset browsing works on self-managed Grafana but not on Grafana Cloud, verify your PDC agent is running and that the service account permissions are identical between environments.

### Query variable substitution

Template variable substitution behavior is consistent between self-managed Grafana and Grafana Cloud. If you observe differences after migration, check:

1. The plugin version matches between environments. Older plugin versions may handle multi-value variables differently.
1. The data source configuration is identical, particularly the **Default project** and **Processing location** settings.
1. Variable queries that rely on `$__interval` or time-range macros may produce different results if the default dashboard time range differs between environments.

## Auditing and usage tracking

To track which Grafana users are running BigQuery queries:

- **Grafana audit logging** (available in Grafana Enterprise and Grafana Cloud) can identify the user and data source associated with a query request, but does not log the specific SQL query text or which BigQuery tables were accessed. For details, refer to [Auditing](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-security/audit-grafana/).
- **BigQuery audit logs** in GCP provide full query-level detail, including the SQL text, tables accessed, bytes scanned, and job metadata. Enable [Cloud Audit Logs for BigQuery](https://cloud.google.com/bigquery/docs/reference/auditlogs) to capture this information.

For complete query-level auditing, use BigQuery's audit logs. You can correlate them with Grafana audit logs by matching timestamps and the service account identity.

## BigQuery metrics in Google Cloud Monitoring

If you use Google Cloud Monitoring to track BigQuery usage metrics (such as `bigquery.googleapis.com/query/count` or `bigquery.googleapis.com/query/execution_times`), be aware that GCP attributes these metrics to the project that *runs* the query job, not the project that *hosts* the data. This means:

- If your Grafana service account runs jobs in Project A but queries data in Project B, the metrics appear under Project A.
- This is standard [GCP metric attribution behavior](https://cloud.google.com/bigquery/docs/monitoring), not something controlled by the Grafana plugin.

When building Cloud Monitoring dashboards for BigQuery usage, filter by the project configured as the **Default project** in the BigQuery data source settings (or the project specified in the `$__timeFilter` query), as that is where job metrics are attributed.

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
