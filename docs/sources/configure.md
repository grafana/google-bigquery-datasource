---
description: Configure the Google BigQuery data source plugin for Grafana
keywords:
  - grafana
  - bigquery
  - google
  - gcp
  - configuration
  - authentication
  - provisioning
  - terraform
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Configure
title: Configure the Google BigQuery data source
weight: 100
review_date: 2026-02-11
---

# Configure the Google BigQuery data source

This document explains how to configure the Google BigQuery data source in Grafana.

## Before you begin

Before configuring the data source, ensure you have:

- **Grafana version:** 11.6.0 or later (plugin version 3.x). For older Grafana versions, use plugin version 2.x (requires Grafana 10.4.8+) or 1.x.
- **Grafana permissions:** `Organization administrator` role to add data sources.
- **Google Cloud APIs enabled:** The following APIs must be enabled on each GCP project you query:
  - [BigQuery API](https://console.cloud.google.com/apis/library/bigquery.googleapis.com)
  - [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)
- **Google Cloud credentials:** Depending on your authentication method, you need either a service account key file or access to the Google Metadata Server.
- **Required GCP IAM roles:** The service account (or impersonated service account) must have the following roles on each project it accesses:
  - **BigQuery Data Viewer** (`roles/bigquery.dataViewer`) — read access to BigQuery data
  - **BigQuery Job User** (`roles/bigquery.jobUser`) — permission to run BigQuery jobs
  - **`resourcemanager.projects.get`** permission — required for the project dropdown to populate in the query editor. This permission is included in the **Browser** role (`roles/browser`) or can be granted through a custom role.

{{< admonition type="note" >}}
If the service account has project-level access but not dataset or table-level access, **Save & test** may succeed while individual queries return 403 errors. Ensure the service account has read access to the specific datasets and tables you intend to query.
{{< /admonition >}}

{{< admonition type="note" >}}
Each data source instance connects to a single GCP project. To visualize data from multiple GCP projects, create one data source per project.
{{< /admonition >}}

## Add the data source

To add the Google BigQuery data source:

1. Click **Connections** in the left-side menu.
1. Click **Add new connection**.
1. Type `BigQuery` in the search bar.
1. Select **Google BigQuery**.
1. Click **Add new data source**.

## Configure settings

| Setting     | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| **Name**    | The name used to refer to the data source in panels and queries. |
| **Default** | Toggle to make this the default data source for new panels.      |

## Authentication

Google BigQuery data source supports multiple authentication methods. Choose the method that best fits your deployment environment.

### Google Service Account key

Use this method when running Grafana outside of Google Cloud Platform, or when you need explicit credentials.

To configure service account authentication:

1. [Create a Google Cloud Platform (GCP) Service Account](https://cloud.google.com/iam/docs/creating-managing-service-accounts).
1. Assign the following roles to the service account:
   - **BigQuery Data Viewer** - Provides read access to BigQuery data
   - **BigQuery Job User** - Allows running BigQuery jobs
1. Create and download a JSON key file for the service account.
1. In the data source configuration, select **Google JWT File** as the authentication type.
1. Upload the JSON key file or paste its contents.

### Google Metadata Server

Use this method when running Grafana on a Google Compute Engine (GCE) virtual machine.

When Grafana runs on a GCE virtual machine, it can automatically retrieve the default project ID and authentication token from the metadata server. To use this method:

1. Ensure your virtual machine has a service account configured as the default account.
1. Assign the service account the **BigQuery Data Viewer** and **BigQuery Job User** roles.
1. In the data source configuration, select **Google Metadata Server** as the authentication type.

### Service account impersonation

Use [service account impersonation](https://cloud.google.com/iam/docs/service-account-impersonation) when you need to delegate access to BigQuery without distributing service account keys with broad permissions. With impersonation, the key stored in Grafana has minimal permissions — it can only generate short-lived tokens for a separate service account that has BigQuery access. This means the stored credentials cannot directly read data, reducing risk if they are compromised. This is the recommended secure authentication method for connecting Grafana Cloud to BigQuery.

Service account impersonation involves two service accounts:

- **Authenticating service account** — The service account whose JSON key is uploaded to Grafana. This account's only permission is to create access tokens for the impersonated account. It requires the [Service Account Token Creator role](https://cloud.google.com/iam/docs/roles-permissions/iam#iam.serviceAccountTokenCreator) (`roles/iam.serviceAccountTokenCreator`).
- **Impersonated service account** — The service account that has permissions to read data from BigQuery. Grafana assumes this account's identity to run queries. It requires the **BigQuery Data Viewer** and **BigQuery Job User** roles.

#### Configure GCP permissions

Before configuring the data source in Grafana, set up the required permissions in GCP. Replace `AUTH_SA`, `IMPERSONATED_SA`, and `PROJECT_ID` with your values.

Grant the authenticating service account permission to create tokens for the impersonated service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  IMPERSONATED_SA@PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:AUTH_SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

Grant the impersonated service account BigQuery access:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:IMPERSONATED_SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:IMPERSONATED_SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

#### Configure the data source in Grafana

To configure service account impersonation in the data source settings:

1. In the **Authentication** section, select **Google JWT File** as the authentication type.
1. Upload the JSON key file for the **authenticating** service account.
1. Enable **Service Account Impersonation**.
1. Enter the full email address of the **impersonated** service account.
1. Click **Save & test** to verify the connection.

### Workload Identity Federation

Use [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation) (WIF) to let Grafana users authenticate to BigQuery with an external identity provider (such as Okta or another OIDC provider) instead of a service account key.

{{< admonition type="note" >}}
This authentication method is available on **Grafana Cloud** only. Grafana Cloud exchanges the signed-in user's external OIDC token for a short-lived Google Cloud access token before the request reaches the plugin.
{{< /admonition >}}

Configuring Workload Identity Federation involves three systems: Google Cloud, your Grafana Cloud stack, and the data source itself.

#### In Google Cloud

1. Create a [Workload Identity Pool and Provider](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers) that trusts your OIDC identity provider. When configuring the provider, set up attribute mappings so that `google.subject` maps to the relevant claim from your identity provider (for example, `assertion.sub` — the exact mapping depends on your provider's claim format).
1. Grant the BigQuery permissions needed to run queries. How you grant them depends on whether you use service account impersonation:
   - **Without impersonation** — grant the WIF pool principal directly:
     - **BigQuery Data Viewer**
     - **BigQuery Job User**
   - **With impersonation** — create a service account, grant it those same roles, then grant the WIF pool principal the **Service Account Token Creator** role on that service account.

#### In Grafana Cloud

1. Configure your Grafana Cloud stack's SSO integration against the same OIDC provider, so the signed-in user's identity is available for Grafana Cloud to exchange for a Google Cloud access token before the request reaches the plugin. Refer to [Configure OAuth2 authentication](https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/generic-oauth/) for setup details.

#### In the data source configuration

1. Open the BigQuery data source settings and select **Workload Identity Federation** as the authentication type.
1. In the **Workload Identity Pool Provider** field, enter the full resource path of your provider:
   `projects/<project-number>/locations/global/workloadIdentityPools/<pool-id>/providers/<provider-id>`

   {{< admonition type="note" >}}
Use the **project number** (a numeric ID such as `123456789`), not the project ID (such as `my-project`). You can find the project number on the Google Cloud Console home page.
   {{< /admonition >}}

1. If you set up service account impersonation, enter the service account email in the **Service account email** field. If you granted permissions directly to the WIF pool, leave this blank.
1. Enter the **Default project** where your BigQuery queries will run.

{{< admonition type="note" >}}
Credentials from Workload Identity Federation are tied to the signed-in user's active session — there is no long-lived credential available to the Grafana backend. This means any feature that runs without a user present will not work, including alerting, scheduled reports, and public dashboards. If you rely on these features, use a service account key (JWT) instead.
{{< /admonition >}}

### Forward OAuth Identity

Use Forward OAuth Identity when you want to use Grafana's Google OAuth authentication with BigQuery.

To configure Forward OAuth Identity:

1. Configure [Google OAuth authentication](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-security/configure-authentication/google/) in Grafana.
1. Add the following scopes to the OAuth application:
   - `https://www.googleapis.com/auth/bigquery` (required)
   - `https://www.googleapis.com/auth/drive` (optional, for querying Google Sheets data)
1. In the data source configuration, select **Forward OAuth Identity** as the authentication type.
1. Enter the **Default project** where queries run.

{{< admonition type="note" >}}
Credentials from Forward OAuth Identity are tied to the signed-in user's active session — there is no long-lived credential available to the Grafana backend. This means any feature that runs without a user present will not work, including alerting, scheduled reports, and public dashboards. If you rely on these features, use a service account key (JWT) instead.
{{< /admonition >}}

## Additional settings

Expand the **Additional Settings** section to configure optional settings.

| Setting                 | Description                                                                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Processing location** | Specifies the [geographic location](https://cloud.google.com/bigquery/docs/locations) where BigQuery processes queries. Options include multi-regional locations (US, EU) and specific regions. Leave empty for automatic location selection. |
| **Service endpoint**    | Custom network address for the BigQuery API. Use this when connecting through a private endpoint or VPC Service Controls. Example: `https://bigquery.googleapis.com/bigquery/v2/`                                                             |
| **Max bytes billed**    | Limits the bytes billed for a query. Queries that would exceed this limit fail instead of running. Use this to prevent unexpectedly expensive queries. Example: `5242880` (5 MB).                                                             |
| **Restrict to accessible datasets** | Rejects queries that reference tables outside the projects this data source has access to, for example public datasets. Every query is checked with a dry run before it executes, so tables reached through views are covered. Use IAM to control access within your own projects.                                                             |
| **Additional allowed datasets**    | Only shown when the restriction is enabled. Comma-separated list of datasets outside the accessible projects that queries may also reference, entered as `project.dataset` or `dataset` (in the default project). Use this for public or shared datasets you want to allow. These datasets also show up in the query builder's project and dataset selectors. Example: `bigquery-public-data.samples`                                                             |

{{< admonition type="note" >}}
When **Restrict to accessible datasets** is enabled, some statements are rejected because their referenced tables cannot be verified: multi-statement scripts, `EXECUTE IMMEDIATE`, and procedure calls. Run each statement as a separate query instead. Queries referencing 50 or more tables are rejected for the same reason.

With Forward OAuth Identity the plugin cannot list the projects the signed-in user has access to, so only the default project counts as accessible. Any other dataset needs an entry in **Additional allowed datasets**.
{{< /admonition >}}

## Verify the connection

Click **Save & test** to verify the connection. A successful test displays the message "Data source is working". If you encounter errors, refer to [Troubleshooting](https://grafana.com/docs/plugins/grafana-bigquery-datasource/latest/troubleshooting/).

## Provision the data source

You can define the data source in YAML files as part of the Grafana provisioning system.
For more information, refer to [Provisioning Grafana data sources](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/administration/provisioning/#data-sources).

### Service account key with private key in secure JSON

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    editable: true
    enabled: true
    jsonData:
      authenticationType: jwt
      clientEmail: <SERVICE_ACCOUNT_EMAIL>
      defaultProject: <DEFAULT_PROJECT_ID>
      tokenUri: https://oauth2.googleapis.com/token
    secureJsonData:
      privateKey: <PRIVATE_KEY>
```

### Service account key with private key path

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    editable: true
    enabled: true
    jsonData:
      authenticationType: jwt
      clientEmail: <SERVICE_ACCOUNT_EMAIL>
      defaultProject: <DEFAULT_PROJECT_ID>
      tokenUri: https://oauth2.googleapis.com/token
      privateKeyPath: '/etc/secrets/bigquery.pem'
```

### Google Metadata Server

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    editable: true
    enabled: true
    jsonData:
      authenticationType: gce
```

### Google Metadata Server with service account impersonation

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    editable: true
    enabled: true
    jsonData:
      authenticationType: gce
      usingImpersonation: true
      serviceAccountToImpersonate: <SERVICE_ACCOUNT_EMAIL>
      defaultProject: <DEFAULT_PROJECT_ID>
```

### Service account key with service account impersonation

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    editable: true
    enabled: true
    jsonData:
      authenticationType: jwt
      clientEmail: <AUTH_SERVICE_ACCOUNT_EMAIL>
      defaultProject: <DEFAULT_PROJECT_ID>
      tokenUri: https://oauth2.googleapis.com/token
      usingImpersonation: true
      serviceAccountToImpersonate: <IMPERSONATED_SERVICE_ACCOUNT_EMAIL>
    secureJsonData:
      privateKey: <PRIVATE_KEY>
```

### Workload Identity Federation

Available on Grafana Cloud only.

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    editable: true
    enabled: true
    jsonData:
      authenticationType: workloadIdentityFederation
      workloadIdentityPoolProvider: projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/<POOL>/providers/<PROVIDER>
      wifServiceAccountEmail: <SERVICE_ACCOUNT_EMAIL> # optional
      defaultProject: <DEFAULT_PROJECT_ID>
```

### Forward OAuth Identity

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    editable: true
    enabled: true
    jsonData:
      authenticationType: forwardOAuthIdentity
      defaultProject: <DEFAULT_PROJECT_ID>
      oauthPassThru: true
```

### With additional settings

```yaml
apiVersion: 1
datasources:
  - name: BigQuery
    type: grafana-bigquery-datasource
    editable: true
    enabled: true
    jsonData:
      authenticationType: jwt
      clientEmail: <SERVICE_ACCOUNT_EMAIL>
      defaultProject: <DEFAULT_PROJECT_ID>
      tokenUri: https://oauth2.googleapis.com/token
      processingLocation: US
      MaxBytesBilled: 5242880
      restrictToAccessibleDatasets: true
      additionalAllowedDatasets: bigquery-public-data.samples
      serviceEndpoint: https://bigquery.googleapis.com/bigquery/v2/
    secureJsonData:
      privateKey: <PRIVATE_KEY>
```

### Provisioning configuration reference

| Key                            | Type    | Description                                                                                       |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| `authenticationType`           | string  | Authentication method: `jwt`, `gce`, `workloadIdentityFederation`, or `forwardOAuthIdentity`      |
| `clientEmail`                  | string  | Service account email (required for `jwt`)                                                        |
| `defaultProject`               | string  | Default GCP project for queries                                                                   |
| `tokenUri`                     | string  | OAuth token endpoint (required for `jwt`): `https://oauth2.googleapis.com/token`                  |
| `privateKeyPath`               | string  | Path to private key file (alternative to `secureJsonData.privateKey`)                             |
| `usingImpersonation`           | boolean | Enable service account impersonation                                                              |
| `serviceAccountToImpersonate`  | string  | Email of service account to impersonate                                                           |
| `workloadIdentityPoolProvider` | string  | WIF provider resource path (required for `workloadIdentityFederation`, Grafana Cloud only)        |
| `wifServiceAccountEmail`       | string  | Service account to impersonate via WIF (optional, Grafana Cloud only)                             |
| `oauthPassThru`                | boolean | Enable OAuth pass-through (required for `forwardOAuthIdentity`)                                   |
| `processingLocation`           | string  | Query processing location (for example, `US`, `EU`, `us-central1`)                                |
| `MaxBytesBilled`               | integer | Maximum bytes billed per query                                                                    |
| `restrictToAccessibleDatasets` | boolean | Reject queries referencing tables outside the projects the data source has access to             |
| `additionalAllowedDatasets`    | string  | Comma-separated list of extra datasets to allow (`project.dataset` or `dataset`)                 |
| `serviceEndpoint`              | string  | Custom BigQuery API endpoint URL                                                                  |
| `enableSecureSocksProxy`       | boolean | Enable Secure Socks Proxy (requires Grafana configuration)                                        |

| Secure Key   | Type   | Description                              |
| ------------ | ------ | ---------------------------------------- |
| `privateKey` | string | Service account private key (PEM format) |

## Provision with Terraform

You can provision the data source using the [Grafana Terraform provider](https://registry.terraform.io/providers/grafana/grafana/latest/docs).

### Service account key

```hcl
resource "grafana_data_source" "bigquery" {
  type = "grafana-bigquery-datasource"
  name = "BigQuery"

  json_data_encoded = jsonencode({
    authenticationType = "jwt"
    clientEmail        = "<SERVICE_ACCOUNT_EMAIL>"
    defaultProject     = "<DEFAULT_PROJECT_ID>"
    tokenUri           = "https://oauth2.googleapis.com/token"
  })

  secure_json_data_encoded = jsonencode({
    privateKey = file("path/to/service-account-key.pem")
  })
}
```

### Google Metadata Server

```hcl
resource "grafana_data_source" "bigquery" {
  type = "grafana-bigquery-datasource"
  name = "BigQuery"

  json_data_encoded = jsonencode({
    authenticationType = "gce"
  })
}
```

### With service account impersonation

```hcl
resource "grafana_data_source" "bigquery" {
  type = "grafana-bigquery-datasource"
  name = "BigQuery"

  json_data_encoded = jsonencode({
    authenticationType          = "gce"
    usingImpersonation          = true
    serviceAccountToImpersonate = "<SERVICE_ACCOUNT_EMAIL>"
    defaultProject              = "<DEFAULT_PROJECT_ID>"
  })
}
```

### Workload Identity Federation

Available on Grafana Cloud only.

```hcl
resource "grafana_data_source" "bigquery" {
  type = "grafana-bigquery-datasource"
  name = "BigQuery"

  json_data_encoded = jsonencode({
    authenticationType           = "workloadIdentityFederation"
    workloadIdentityPoolProvider = "projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/<POOL>/providers/<PROVIDER>"
    wifServiceAccountEmail       = "<SERVICE_ACCOUNT_EMAIL>" # optional
    defaultProject               = "<DEFAULT_PROJECT_ID>"
  })
}
```

### With additional settings

```hcl
resource "grafana_data_source" "bigquery" {
  type = "grafana-bigquery-datasource"
  name = "BigQuery"

  json_data_encoded = jsonencode({
    authenticationType = "jwt"
    clientEmail        = "<SERVICE_ACCOUNT_EMAIL>"
    defaultProject     = "<DEFAULT_PROJECT_ID>"
    tokenUri           = "https://oauth2.googleapis.com/token"
    processingLocation = "US"
    MaxBytesBilled               = 5242880
    restrictToAccessibleDatasets = true
    additionalAllowedDatasets    = "bigquery-public-data.samples"
    serviceEndpoint              = "https://bigquery.googleapis.com/bigquery/v2/"
  })

  secure_json_data_encoded = jsonencode({
    privateKey = var.bigquery_private_key
  })
}
```

For more information, refer to the [Grafana Terraform provider documentation](https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/data_source).

## Import queries from DoiT International BigQuery plugin

If you previously used the DoiT International BigQuery community plugin, you can import your existing queries into the Grafana BigQuery data source.

To import queries:

1. Open the dashboard containing queries from the DoiT International plugin.
1. Edit each panel and change the data source to Grafana BigQuery.
1. Save the dashboard.

{{< admonition type="note" >}}
Imported queries are converted to raw SQL queries.
{{< /admonition >}}

## Related resources

- [Google BigQuery documentation](https://cloud.google.com/bigquery/docs)
- [Create a service account](https://cloud.google.com/iam/docs/creating-managing-service-accounts)
- [BigQuery IAM roles](https://cloud.google.com/bigquery/docs/access-control)
- [Grafana provisioning documentation](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/administration/provisioning/)
