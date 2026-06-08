Configure the Google BigQuery datasource for local development by setting up provisioning and credentials.

## Steps

1. **Check for existing provisioning directory**

   ```bash
   ls provisioning/datasources/ 2>/dev/null || echo "missing"
   ```

   If it doesn't exist, create the directory structure:

   ```bash
   mkdir -p provisioning/datasources
   ```

2. **Ask the user which authentication method they want to use:**
   - `jwt` — Google Service Account key (JSON file)
   - `gce` — Google Metadata Server (GCE/GKE environment)
   - `forwardOAuthIdentity` — Forward OAuth Identity (Grafana Google OAuth)

3. **Create the provisioning file** at `provisioning/datasources/bigquery.yaml` based on the chosen method.

   ### Service Account key (`jwt`)

   Ask the user for:
   - Path to their service account JSON key file OR the contents of the key
   - Default GCP project ID

   If they provide a **file path**, use `privateKeyPath`:

   ```yaml
   apiVersion: 1
   datasources:
     - name: BigQuery
       type: grafana-bigquery-datasource
       editable: true
       enabled: true
       jsonData:
         authenticationType: jwt
         clientEmail: <CLIENT_EMAIL_FROM_KEY_FILE>
         defaultProject: <DEFAULT_PROJECT_ID>
         tokenUri: https://oauth2.googleapis.com/token
         privateKeyPath: '<ABSOLUTE_PATH_TO_KEY_FILE>'
   ```

   If they paste the **key contents**, extract `client_email` and `private_key` from the JSON and use `secureJsonData`:

   ```yaml
   apiVersion: 1
   datasources:
     - name: BigQuery
       type: grafana-bigquery-datasource
       editable: true
       enabled: true
       jsonData:
         authenticationType: jwt
         clientEmail: <CLIENT_EMAIL>
         defaultProject: <DEFAULT_PROJECT_ID>
         tokenUri: https://oauth2.googleapis.com/token
       secureJsonData:
         privateKey: |
           <PRIVATE_KEY>
   ```

   ### Google Metadata Server (`gce`)

   Ask the user if they want service account impersonation enabled.

   Without impersonation:

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

   With impersonation — also ask for the service account email and default project:

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

   ### Forward OAuth Identity (`forwardOAuthIdentity`)

   Ask the user for their default GCP project ID:

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

4. **Ask about additional settings** (optional — skip if the user says no):

   | Setting | Description |
   |---|---|
   | `processingLocation` | e.g. `US`, `EU`, `us-central1` — leave empty for automatic |
   | `MaxBytesBilled` | Integer in bytes, e.g. `5242880` for 5 MB |
   | `serviceEndpoint` | Custom API endpoint, e.g. `https://bigquery.googleapis.com/bigquery/v2/` |

   Append any provided values to the `jsonData` block of the provisioning file.

5. **Verify the required GCP APIs are enabled** — remind the user to check:
   - [BigQuery API](https://console.cloud.google.com/apis/library/bigquery.googleapis.com)
   - [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)

   The **BigQuery Data Viewer** and **BigQuery Job User** IAM roles must be granted to the service account.

6. **Start Grafana** with:

   ```bash
   yarn server
   ```

   This uses `docker-compose.yaml` which mounts `provisioning/` into the container at `/etc/grafana/provisioning`.

7. **Confirm the datasource loaded** by opening Grafana at http://localhost:3000, going to **Connections → Data sources**, and checking that BigQuery appears. Click **Save & test** to verify the connection.

## Notes

- Each datasource instance connects to a **single GCP project**. Create one datasource per project for multi-project access.
- The `provisioning/` directory is gitignored by default to avoid committing credentials. Confirm with the user before adding any key material to version control.
- For `jwt` auth, ensure the private key is in PEM format (starts with `-----BEGIN RSA PRIVATE KEY-----` or `-----BEGIN PRIVATE KEY-----`).
- Forward OAuth Identity does not support alerting or other Grafana backend features that require always-available credentials.
