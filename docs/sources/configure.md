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
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Configure
title: Configure the Google BigQuery data source
weight: 100
---

# Configure the Google BigQuery data source

This document explains how to configure the Google BigQuery data source in Grafana.

## Before you begin

Before configuring the data source, ensure you have:

- **Grafana permissions:** Organization administrator role to add data sources
- **Google Cloud APIs enabled:** The following APIs must be enabled in your GCP project:
  - [BigQuery API](https://console.cloud.google.com/apis/library/bigquery.googleapis.com)
  - [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)
- **Google Cloud credentials:** Depending on your authentication method, you need either a service account key file or access to the Google Metadata Server

## Add the data source

To add the Google BigQuery data source:

1. Click **Connections** in the left-side menu.
1. Click **Add new connection**.
1. Type `BigQuery` in the search bar.
1. Select **Google BigQuery**.
1. Click **Add new data source**.

## Configure settings

| Setting | Description |
|---------|-------------|
| **Name** | The name used to refer to the data source in panels and queries. |
| **Default** | Toggle to make this the default data source for new panels. |

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
1. In the data source configuration, select **Google Service Account Key** as the authentication type.
1. Upload the JSON key file or paste its contents.

### Google Metadata Server

Use this method when running Grafana on a Google Compute Engine (GCE) virtual machine.

When Grafana runs on a GCE virtual machine, it can automatically retrieve the default project ID and authentication token from the metadata server. To use this method:

1. Ensure your virtual machine has a service account configured as the default account.
1. Assign the service account the **BigQuery Data Viewer** and **BigQuery Job User** roles.
1. In the data source configuration, select **Google Metadata Server** as the authentication type.

### Service account impersonation

Use [service account impersonation](https://cloud.google.com/iam/docs/service-account-impersonation) when you need to delegate access to BigQuery without distributing service account keys.

To configure service account impersonation:

1. Ensure the service account used by the plugin has the `iam.serviceAccounts.getAccessToken` permission. This permission is included in the [Service Account Token Creator role](https://cloud.google.com/iam/docs/roles-permissions/iam#iam.serviceAccountTokenCreator) (`roles/iam.serviceAccountTokenCreator`).
1. Ensure the service account being impersonated has the following roles:
   - **BigQuery Data Viewer**
   - **BigQuery Job User**
1. In the data source configuration, enable **Service Account Impersonation**.
1. Enter the email address of the service account to impersonate.

### Forward OAuth Identity

Use Forward OAuth Identity when you want to use Grafana's Google OAuth authentication with BigQuery.

To configure Forward OAuth Identity:

1. Configure [Google OAuth authentication](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-security/configure-authentication/google/) in Grafana.
1. Add the `https://www.googleapis.com/auth/bigquery` scope to the OAuth application.
1. In the data source configuration, select **Forward OAuth Identity** as the authentication type.
1. Enter the **Default project** where queries run.

{{< admonition type="note" >}}
Some Grafana features don't function as expected with Forward OAuth Identity, including alerting. Grafana backend features require credentials to always be in scope, which isn't the case with this authentication method.
{{< /admonition >}}

## Verify the connection

Click **Save & test** to verify the connection. A successful test confirms that Grafana can connect to BigQuery with the provided credentials.

## Provision the data source

You can define the data source in YAML files as part of Grafana's provisioning system.
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

## Import queries from DoiT International BigQuery plugin

If you previously used the DoiT International BigQuery community plugin, you can import your existing queries into the Grafana BigQuery data source.

To import queries:

1. Open the dashboard containing queries from the DoiT International plugin.
1. Edit each panel and change the data source to Grafana BigQuery.
1. Save the dashboard.

{{< admonition type="note" >}}
Imported queries are converted to raw SQL queries. This feature requires Grafana 8.5 or later.
{{< /admonition >}}
