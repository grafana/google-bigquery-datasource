import { test, expect } from '@grafana/plugin-e2e';

test('Smoke test: plugin loads', async ({ createDataSourceConfigPage, page }) => {
  await createDataSourceConfigPage({ type: 'grafana-bigquery-datasource' });

  await expect(await page.getByText('Type: Google BigQuery', { exact: true })).toBeVisible();
  await expect(await page.locator('legend', { hasText: 'Authentication' })).toBeVisible();
});
