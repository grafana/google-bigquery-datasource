import { expect, test } from '@grafana/plugin-e2e';

import type { BigQueryOptions } from '../../src/types';

import { cloudCredentials, isCloudRun, PLUGIN_ID, PROVISIONING_FILENAME } from './utils';

test.describe('Config editor', () => {
  test.describe('rendering', () => {
    test('smoke: should render config editor', { tag: '@plugins' }, async ({ createDataSourceConfigPage, page }) => {
      await createDataSourceConfigPage({ type: PLUGIN_ID });

      await expect(page.getByText('Authentication', { exact: true })).toBeVisible();
    });

    test('renders the Additional Settings section', async ({ createDataSourceConfigPage, page }) => {
      await createDataSourceConfigPage({ type: PLUGIN_ID });

      // The section is collapsible but open by default (isInitiallyOpen defaults to true).
      await expect(page.getByRole('heading', { name: 'Additional Settings', exact: true })).toBeVisible();
      await expect(page.getByLabel('Processing location')).toBeVisible();
      await expect(page.getByLabel('Service endpoint')).toBeVisible();
      await expect(page.getByLabel('Max bytes billed')).toBeVisible();
      await expect(page.getByLabel('Restrict to accessible datasets')).toBeVisible();
    });
  });

  test.describe('provisioned datasource', () => {
    test('loads provisioned JWT field values', async ({ gotoDataSourceConfigPage, readProvisionedDataSource, page }) => {
      // Exercises the locally provisioned datasource file, which only exists in local dev/PR CI —
      // the nightly Cloud lane tests a separately managed datasource instead.
      test.skip(isCloudRun, 'Local-only: exercises the locally provisioned datasource');

      const ds = await readProvisionedDataSource<BigQueryOptions>({ fileName: PROVISIONING_FILENAME });
      await gotoDataSourceConfigPage(ds.uid);

      await expect(page.getByLabel('Client email')).toHaveValue(ds.jsonData.clientEmail ?? '');
      await expect(page.getByLabel('Token URI')).toHaveValue(ds.jsonData.tokenUri ?? '');
    });
  });

  test.describe('save & test', () => {
    test('shows an error alert when the health check fails', async ({ createDataSourceConfigPage }) => {
      const configPage = await createDataSourceConfigPage({ type: PLUGIN_ID });

      // mockHealthCheckResponse(body, status) — body first, status second. A fulfill-options-style
      // single argument would silently mock a *successful* (HTTP 200) response instead.
      await configPage.mockHealthCheckResponse({ message: 'unable to authenticate' }, 400);

      await expect(configPage.saveAndTest()).not.toBeOK();
      await expect(configPage).toHaveAlert('error', { hasText: 'unable to authenticate' });
    });

    test('shows a success alert when the health check succeeds', async ({ createDataSourceConfigPage }) => {
      const configPage = await createDataSourceConfigPage({ type: PLUGIN_ID });

      await configPage.mockHealthCheckResponse({ message: 'Data source is working' }, 200);

      await expect(configPage.saveAndTest()).toBeOK();
      await expect(configPage).toHaveAlert('success', { hasText: 'Data source is working' });
    });

    test('passes the health check with real BigQuery credentials', async ({ createDataSourceConfigPage, page }) => {
      // Only the nightly Cloud lane has real credentials, injected via cron.yml's repo-secrets
      // into the Playwright process env (see cloudCredentials() in ./utils).
      test.skip(!isCloudRun, 'Only runs in the nightly Cloud lane, where real credentials are available');

      const creds = cloudCredentials();
      const configPage = await createDataSourceConfigPage({ type: PLUGIN_ID });

      // A brand new datasource has no JWT fields yet, so AuthConfig renders the
      // paste/upload/fill-manually chooser first — switch to the manual entry form.
      await page.getByRole('button', { name: 'Fill In JWT Token manually' }).click();

      await page.getByLabel('Client email').fill(creds.clientEmail);
      await page.getByLabel('Token URI').fill(creds.tokenUri);
      await page.getByLabel('Project ID').fill(creds.defaultProject);
      await page.getByLabel('Private key').fill(creds.privateKey);

      await expect(configPage.saveAndTest()).toBeOK();
      // "Data source is working" is sqlds' default CheckHealth success message (health.go);
      // the BigQuery datasource doesn't override it with a custom Pre/PostCheckHealth message.
      await expect(configPage).toHaveAlert('success', { hasText: 'Data source is working' });
    });
  });
});
