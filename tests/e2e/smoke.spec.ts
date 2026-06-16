import { expect, test } from '@grafana/plugin-e2e';

test('Smoke test: plugin loads', async ({ createDataSourceConfigPage, page }) => {
  await createDataSourceConfigPage({ type: 'grafana-bigquery-datasource' });

  await expect(page.getByText('Authentication', { exact: true })).toBeVisible();
});
