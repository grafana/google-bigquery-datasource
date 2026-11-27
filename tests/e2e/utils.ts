import type { Page, Response } from '@playwright/test';

export const PLUGIN_ID = 'grafana-bigquery-datasource';
export const PROVISIONING_FILENAME = 'bigquery.e2e.yaml';

/**
 * True when running against Grafana Cloud (set by the reusable playwright-cloud.yml workflow),
 * false for local dev and PR/push CI, which run against a locally provisioned Grafana with
 * placeholder (non-functional) BigQuery credentials — every query/health-check response there is
 * mocked. Real-backend assertions are gated on this everywhere, since the nightly Cloud lane is
 * the only environment with real BigQuery credentials.
 */
export const isCloudRun = !!process.env.GRAFANA_URL;

export const DATA_SOURCE_NAME = isCloudRun ? '[managed_data_source] - BigQuery [JWT] (PDC)' : 'BigQuery E2E';

/**
 * Real BigQuery JWT credentials, injected into the nightly Cloud lane's Playwright process via
 * cron.yml's `repo-secrets` (see DS_INSTANCE_* env vars there). Only meaningful when isCloudRun.
 */
export function cloudCredentials() {
  return {
    clientEmail: process.env.DS_INSTANCE_CLIENT_EMAIL ?? '',
    defaultProject: process.env.DS_INSTANCE_PROJECT_ID ?? '',
    tokenUri: process.env.DS_INSTANCE_TOKEN_URI ?? '',
    privateKey: process.env.DS_INSTANCE_PRIVATE_KEY ?? '',
  };
}

/**
 * The Private Data Source Connect network this datasource must route through to reach real
 * BigQuery from inside Grafana Cloud — set by cron.yml's `pdc-network-name` input (piped in as
 * DS_PDC_NETWORK_NAME by the reusable playwright-cloud.yml workflow). Empty locally/in PR CI.
 */
export function cloudPdcNetworkName(): string {
  return process.env.DS_PDC_NETWORK_NAME ?? '';
}

// Grafana can send these queries to /apis/<group>/<version>/namespaces/<ns>/query (query.grafana.app or
// datasource.grafana.app) instead of /api/ds/query, the only URL the plugin-e2e query helpers match.
const QUERY_URL_GLOBS = ['**/api/ds/query*', '**/apis/*/*/namespaces/*/query*'];
const QUERY_URL = /\/api\/ds\/query|\/apis\/[^/]+\/[^/]+\/namespaces\/[^/]+\/query(\?|$)/;

export function waitForQueryResponse(page: Page): Promise<Response> {
  return page.waitForResponse((r) => r.request().method() === 'POST' && QUERY_URL.test(r.url()));
}

export async function mockQueryResponse(page: Page, body: unknown) {
  for (const glob of QUERY_URL_GLOBS) {
    await page.route(glob, (route) => route.fulfill({ status: 200, json: body }));
  }
}
