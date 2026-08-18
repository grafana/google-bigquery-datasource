import { expect, test } from '@grafana/plugin-e2e';

import { DATA_SOURCE_NAME, isCloudRun } from './utils';

const MOCKED_QUERY_RESPONSE = {
  results: {
    A: { status: 200, frames: [{ schema: { fields: [{ name: 'value' }] }, data: { values: [[1]] } }] },
  },
};

async function switchToCodeMode(page: import('@playwright/test').Page) {
  await page.getByRole('radio', { name: 'Code' }).click();
}

function sqlEditor(page: import('@playwright/test').Page) {
  // Monaco exposes the visible content as the `value` of the hidden accessibility textarea.
  return page.getByRole('textbox', { name: /editor content/i });
}

async function typeQuery(page: import('@playwright/test').Page, sql: string) {
  const editor = sqlEditor(page);
  // Monaco's editor is a contenteditable div, not a real <input> — fill() does not work on it.
  // Drive it with real keyboard events instead, per the CodeMirror/Monaco e2e pitfall.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(sql);
}

test.describe('Query editor', () => {
  test.describe('rendering', () => {
    test('smoke: should render query editor', { tag: '@plugins' }, async ({ panelEditPage, page }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);

      await expect(page.getByRole('radio', { name: 'Builder' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Code' })).toBeVisible();
    });

    test('renders common fields and the Builder/Code toggle', async ({ panelEditPage, page }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);

      await expect(page.getByRole('radio', { name: 'Builder' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Code' })).toBeVisible();
      await expect(page.getByLabel('Processing location')).toBeVisible();
      await expect(page.getByLabel('Format')).toBeVisible();
    });
  });

  test.describe('Builder mode', () => {
    test('renders the project, dataset and table selectors', async ({ panelEditPage, page }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);

      await expect(page.getByLabel('Project selector')).toBeVisible();
      await expect(page.getByLabel('Dataset selector')).toBeVisible();
      await expect(page.getByLabel('Table selector')).toBeVisible();
    });

    test('runs a mocked query without an error', async ({ panelEditPage }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);
      await panelEditPage.setVisualization('Table');

      await panelEditPage.mockQueryDataResponse(MOCKED_QUERY_RESPONSE);
      await panelEditPage.refreshPanel();

      await expect(panelEditPage.panel.getErrorIcon()).not.toBeVisible();
    });
  });

  test.describe('Code mode', () => {
    test('accepts a raw SQL query typed into the editor', async ({ panelEditPage, page }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);
      await switchToCodeMode(page);

      await typeQuery(page, 'SELECT 1 AS value');

      // Monaco keeps content in its own model, not the accessibility textarea's inner text — the
      // textarea's `value` attribute is what reflects the typed content, so assert on that
      // (toContainText would always fail here).
      await expect(sqlEditor(page)).toHaveValue(/SELECT 1 AS value/);
    });

    test('runs a mocked query without an error', async ({ panelEditPage, page }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);
      await panelEditPage.setVisualization('Table');
      await switchToCodeMode(page);
      await typeQuery(page, 'SELECT 1 AS value');

      await panelEditPage.mockQueryDataResponse(MOCKED_QUERY_RESPONSE);
      await panelEditPage.refreshPanel();

      await expect(panelEditPage.panel.getErrorIcon()).not.toBeVisible();
    });
  });

  test.describe('query execution', () => {
    // Real backend tests share a live BigQuery connection — run them one at a time so parallel
    // workers don't compete for it and produce slow responses that look like failures.
    test.describe.configure({ mode: 'serial' });

    test('a real SELECT query against BigQuery returns results', async ({ panelEditPage, page }) => {
      test.skip(!isCloudRun, 'Only runs in the nightly Cloud lane, where real credentials are available');

      await panelEditPage.datasource.set(DATA_SOURCE_NAME);
      await panelEditPage.setVisualization('Table');
      await switchToCodeMode(page);
      // A schema-independent smoke query: proves the real connection/auth round-trip without
      // depending on the exact tables/columns seeded into the managed e2e dataset.
      await typeQuery(page, 'SELECT 1 AS value');

      // refreshPanel() clicks the panel's Refresh button and returns the /api/ds/query response.
      const response = await panelEditPage.refreshPanel({ timeout: 150_000 });

      expect(response.ok()).toBe(true);
      await expect(panelEditPage.panel.getErrorIcon()).not.toBeVisible();
      await expect(panelEditPage.panel.fieldNames).toContainText(['value']);
    });
  });
});
