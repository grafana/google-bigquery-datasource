---
'grafana-bigquery-datasource': minor
---

# Add a "Use GCE for alerting" option to authenticate alert queries with GCE

## Problem

When the data source is configured with **Forward OAuth Identity**, queries
authenticate by forwarding the signed-in user's OAuth token to BigQuery. Alert
rules evaluate in the background with no user session, so there is no token to
forward and the query reaches BigQuery with no credentials:

```text
googleapi: Error 401: Request is missing required authentication credential.
Expected OAuth 2 access token... reason: CREDENTIALS_MISSING
```

This makes alerting unusable on instances that rely on OAuth identity forwarding.

## Solution

A new, opt-in data source setting, **Use GCE for alerting**. When enabled, queries
that originate from Grafana alerting authenticate with the **GCE service account**
(Application Default Credentials) instead of the absent forwarded identity.
Interactive queries are unchanged and continue to forward the user's identity.

## How it works

- **Alert detection** — Grafana sets the `FromAlert` marker as request metadata
  (`QueryDataRequest.Headers`), not as a forwarded HTTP header, so it isn't visible
  in `Connect`. It is read in `MutateQueryData` (sqlds's `QueryDataMutator` hook,
  which receives the full request) and propagated via `context`.
- **Auth switch** — In `Connect`, when the request is from alerting *and* the option
  is enabled *and* OAuth passthrough is the configured auth, the HTTP client is built
  with the existing GCE token-provider path instead of header forwarding. Existing
  impersonation settings are preserved.
- **Connection caching** — GCE-authenticated alert connections are cached under a
  separate key (`…:gce-alerting`) so they are never reused for interactive OAuth
  queries, and vice versa.

## Backward compatibility

Fully backward compatible. The option defaults to off; existing data sources behave
exactly as before until a user explicitly enables it.

## Notes

- GCE auth resolves via `google.DefaultTokenSource`, so the environment must provide
  credentials (GKE Workload Identity, or `GOOGLE_APPLICATION_CREDENTIALS`).
- The override covers the standard query path; the Storage Read API client still uses
  the JWT token source.
