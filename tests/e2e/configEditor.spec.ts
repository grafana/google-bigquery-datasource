import { expect, test } from '@grafana/plugin-e2e';

import type { BigQueryOptions } from '../../src/types';

import { cloudCredentials, cloudPdcNetworkName, isCloudRun, PLUGIN_ID, PROVISIONING_FILENAME } from './utils';

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
      // configPage.saveAndTest() waits for the classic /api/datasources/uid/<uid> REST paths,
      // but this Grafana Cloud stack routes datasource save/health through the newer app-platform
      // API instead (confirmed live against https://datasourcese2e.grafana-dev.net) — the save
      // request never matches, so saveAndTest() hangs until timeout. Covered by local/PR CI,
      // same as clickhouse-datasource's equivalent ad-hoc save & test tests.
      test.skip(isCloudRun, 'Ad-hoc save & test is not reliable on the shared Cloud instance; covered by local/PR CI.');
      const configPage = await createDataSourceConfigPage({ type: PLUGIN_ID });

      // mockHealthCheckResponse(body, status) — body first, status second. A fulfill-options-style
      // single argument would silently mock a *successful* (HTTP 200) response instead.
      // `status` (not just `message`) must be present in the body — Grafana's settings page
      // crashes rendering the result otherwise, which trips its own error boundary instead of
      // showing our alert at all.
      await configPage.mockHealthCheckResponse({ status: 'ERROR', message: 'unable to authenticate' }, 400);

      await expect(configPage.saveAndTest()).not.toBeOK();
      await expect(configPage).toHaveAlert('error', { hasText: 'unable to authenticate' });
    });

    test('shows a success alert when the health check succeeds', async ({ createDataSourceConfigPage }) => {
      // See the skip comment on the previous test — same reason.
      test.skip(isCloudRun, 'Ad-hoc save & test is not reliable on the shared Cloud instance; covered by local/PR CI.');
      const configPage = await createDataSourceConfigPage({ type: PLUGIN_ID });

      await configPage.mockHealthCheckResponse({ status: 'OK', message: 'Data source is working' }, 200);
      // A successful health check makes Grafana eagerly resolve the default project, which hits
      // our backend's real (unmocked) BigQuery resource handlers. With no real credentials behind
      // this mocked success, those calls 500 and trip an error boundary that swallows the alert
      // we're asserting on below — mock them too so only the health check result is under test.
      await configPage.mockResourceResponse('defaultProjects', '');
      await configPage.mockResourceResponse('projects', []);

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
      // The "Private key" Field's label isn't associated with its input (an upstream
      // @grafana/google-sdk issue, not ours) — its only accessible name is the placeholder.
      await page.getByPlaceholder('Enter Private key').fill(creds.privateKey);

      const pdcNetworkName = cloudPdcNetworkName();
      if (pdcNetworkName) {
        // Grafana Cloud can only reach this datasource's real backend through PDC, per the
        // "Support PDC when present" pattern in docs/testing/cloud-e2e-testing.md — otherwise
        // this test exercises a connectivity path Cloud doesn't actually use, leaving the
        // workflow's pdc-network-name input unexercised.
        //
        // Grafana Cloud's own PDC combobox (not the open-source SecureSocksProxySettings switch,
        // which doesn't need toggling first) — matches clickhouse-datasource's proven
        // configurePDC() helper in tests/e2e/configEditor.spec.ts, whose nightly Cloud run passes.
        // Each option is rendered as "<name> (N agents connected)", so this must NOT be an exact
        // match — confirmed live against https://datasourcese2e.grafana-dev.net.
        await page.getByRole('combobox', { name: 'Private data source connect' }).click();
        await page.getByText(pdcNetworkName).click();
        // The search input's own `value` attribute stays empty even after a successful
        // selection — confirmed live — so it can't be used to detect the commit. The selected
        // network instead renders as its own static text once the list closes; wait for that
        // instead of assuming the preceding click already settled before "Save & test".
        await expect(page.getByText(pdcNetworkName)).toBeVisible();
      }

      // Can't use configPage.saveAndTest() here: it waits for the classic
      // /api/datasources/uid/<uid> REST paths, but this Grafana Cloud stack routes datasource
      // save/health through the newer app-platform API instead — PUT and GET .../health under
      // /apis/<plugin>.datasource.grafana.app/v0alpha1/namespaces/stacks-<n>/datasources/<uid> —
      // confirmed live against https://datasourcese2e.grafana-dev.net, and still unfixed as of
      // @grafana/plugin-e2e@3.14.0 (the latest). Match on the UID instead of a specific path
      // shape, so this works under either API generation.
      const healthResponsePromise = page.waitForResponse(
        (resp) => resp.url().includes(configPage.datasource.uid) && resp.url().includes('health')
      );
      await page.getByRole('button', { name: 'Save & test' }).click();
      await expect(healthResponsePromise).toBeOK();
      // "Data source is working" is sqlds' default CheckHealth success message (health.go);
      // the BigQuery datasource doesn't override it with a custom Pre/PostCheckHealth message.
      await expect(configPage).toHaveAlert('success', { hasText: 'Data source is working' });
    });
  });
});
