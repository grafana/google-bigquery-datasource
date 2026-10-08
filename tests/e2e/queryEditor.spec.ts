import { expect, test } from '@grafana/plugin-e2e';

import { DATA_SOURCE_NAME, isCloudRun } from './utils';

// Newer Grafana images (>13) default to the new dashboard layout engine, which frequently isn't
// ready in time for these tests and causes flaky failures unrelated to anything under test here.
test.use({ featureToggles: { dashboardNewLayouts: false } });

const MOCKED_QUERY_RESPONSE = {
  results: {
    A: { status: 200, frames: [{ schema: { fields: [{ name: 'value' }] }, data: { values: [[1]] } }] },
  },
};

async function switchToCodeMode(page: import('@playwright/test').Page) {
  await page.getByRole('radio', { name: 'Code' }).click();
}

// @grafana/ui ships two interchangeable code editor implementations (Monaco and CodeMirror) —
// which one actually renders depends on the running Grafana version, not on anything in this
// repo. Rather than guessing at either implementation's internal accessible-name/DOM structure,
// use the stable, version-managed data-testid both are expected to expose on their wrapping
// container (selectors.components.CodeEditor.container, from @grafana/e2e-selectors).
function sqlEditorContainer(panelEditPage: import('@grafana/plugin-e2e').PanelEditPage, selectors: import('@grafana/plugin-e2e').E2ESelectorGroups) {
  return panelEditPage.getByGrafanaSelector(selectors.components.CodeEditor.container);
}

async function typeQuery(
  panelEditPage: import('@grafana/plugin-e2e').PanelEditPage,
  page: import('@playwright/test').Page,
  selectors: import('@grafana/plugin-e2e').E2ESelectorGroups,
  sql: string
) {
  // Neither implementation is a real <input> — fill() does not work on either. Click the
  // container to focus the editor, then drive it with real keyboard events.
  await sqlEditorContainer(panelEditPage, selectors).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(sql);
}

// panelEditPage.refreshPanel() looks for the refresh button scoped inside a specific panel-editor
// "General" content region that doesn't exist in every Grafana version — it can time out even
// though a plain, unscoped "Refresh" button is visible and working. Click it directly instead, and
// register the response listener first per the waitForQueryDataResponse timing pitfall.
async function runQuery(
  panelEditPage: import('@grafana/plugin-e2e').PanelEditPage,
  page: import('@playwright/test').Page,
  options?: { timeout?: number }
) {
  const responsePromise = panelEditPage.waitForQueryDataResponse();
  // getByRole('button', { name: 'Refresh' }) is ambiguous: it substring-matches the adjacent
  // "Auto refresh turned off..." interval-picker button too. Use its data-testid directly.
  await page.getByTestId('data-testid RefreshPicker run button').click({ timeout: options?.timeout });
  return responsePromise;
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
      // getByLabel is unreliable here on newer Grafana versions, which add an aria-label to the
      // wrapping <label> element itself and cause strict-mode violations — use the role instead,
      // per .config/AGENTS/e2e-testing.md's Select convention.
      await expect(page.getByRole('combobox', { name: 'Processing location' })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Format' })).toBeVisible();
    });
  });

  test.describe('Builder mode', () => {
    test('renders the project, dataset and table selectors', async ({ panelEditPage, page }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);

      // ProjectSelector sets aria-label="Project selector" on its Combobox, but Grafana's
      // Combobox (unlike Select, used by Dataset/Table below) doesn't forward a plain aria-label
      // to the actual combobox element — its accessible name ends up being the wrapping
      // EditorField's "Project" label instead.
      await expect(page.getByRole('combobox', { name: 'Project' })).toBeVisible();
      await expect(page.getByLabel('Dataset selector')).toBeVisible();
      await expect(page.getByLabel('Table selector')).toBeVisible();
    });

    test('runs a mocked query without an error', async ({ panelEditPage, page }) => {
      // Builder mode can't construct a runnable query until project/dataset/table resolve, and
      // those come from real (unmocked) backend resource calls — with no real BigQuery connection
      // behind this datasource, they'd 500 and the query would never fire. Mock the resource chain
      // so the visual builder has something to select and can build a real (mocked) query from it.
      await panelEditPage.mockResourceResponse('defaultProjects', 'mocked-project');
      await panelEditPage.mockResourceResponse('projects', [{ projectId: 'mocked-project', displayName: 'Mocked Project' }]);
      await panelEditPage.mockResourceResponse('datasets', ['mocked_dataset']);
      await panelEditPage.mockResourceResponse('tables', ['mocked_table']);
      await panelEditPage.mockResourceResponse('columns', ['mocked_column']);
      // The Column dropdown cross-references this schema (utils/useColumns.ts) and silently
      // excludes any column with no matching entry here — an empty schema means an empty dropdown.
      await panelEditPage.mockResourceResponse('dataset/table/schema', {
        schema: [{ name: 'mocked_column', type: 'STRING', repeated: false, schema: [] }],
      });

      await panelEditPage.datasource.set(DATA_SOURCE_NAME);
      await panelEditPage.setVisualization('Table');

      // Project auto-selects its first option, but dataset, table and the SELECT column don't —
      // all three are always a deliberate user choice in this plugin's Builder mode. Without a
      // column chosen, the builder never generates a rawSql string, and filterQuery() (datasource.ts)
      // silently drops queries with no rawSql before they ever reach the network.
      await page.getByLabel('Dataset selector').click();
      await page.getByText('mocked_dataset', { exact: true }).click();
      await page.getByLabel('Table selector').click();
      await page.getByText('mocked_table', { exact: true }).click();
      // getByLabel('Column') is ambiguous — the Table panel's own options sidebar has several
      // "Column ..." labeled fields. The query builder's own combobox role is unambiguous.
      await page.getByRole('combobox', { name: 'Column' }).click();
      await page.getByText('mocked_column', { exact: true }).click();

      await panelEditPage.mockQueryDataResponse(MOCKED_QUERY_RESPONSE);
      // Builder-mode edits pass process=false in QueryEditor's onChange (deliberate — the user
      // builds up a query across several fields before running it), so unlike Code mode, nothing
      // auto-runs here and Grafana's global refresh only re-runs an *already-run* query. Use our
      // own "Run query" button instead.
      const responsePromise = panelEditPage.waitForQueryDataResponse();
      await page.getByRole('button', { name: 'Run query' }).click();
      await responsePromise;

      await expect(panelEditPage.panel.getErrorIcon()).not.toBeVisible();
    });
  });

  test.describe('Code mode', () => {
    test('accepts a raw SQL query typed into the editor', async ({ panelEditPage, page, selectors }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);
      await switchToCodeMode(page);

      await typeQuery(panelEditPage, page, selectors, 'SELECT 1 AS value');

      // Asserting on the container's visible text works for both Monaco and CodeMirror (unlike
      // Monaco's hidden accessibility textarea, whose `value` is the only thing that reflects
      // typed content on that implementation specifically — the container's rendered lines are
      // real text nodes on both).
      await expect(sqlEditorContainer(panelEditPage, selectors)).toContainText('SELECT 1 AS value');
    });

    test('runs a mocked query without an error', async ({ panelEditPage, page, selectors }) => {
      await panelEditPage.datasource.set(DATA_SOURCE_NAME);
      await panelEditPage.setVisualization('Table');
      await switchToCodeMode(page);
      await typeQuery(panelEditPage, page, selectors, 'SELECT 1 AS value');

      await panelEditPage.mockQueryDataResponse(MOCKED_QUERY_RESPONSE);
      await runQuery(panelEditPage, page);

      await expect(panelEditPage.panel.getErrorIcon()).not.toBeVisible();
    });
  });

  test.describe('query execution', () => {
    // Real backend tests share a live BigQuery connection — run them one at a time so parallel
    // workers don't compete for it and produce slow responses that look like failures.
    test.describe.configure({ mode: 'serial' });

    test('a real SELECT query against BigQuery returns results', async ({ panelEditPage, page, selectors }) => {
      test.skip(!isCloudRun, 'Only runs in the nightly Cloud lane, where real credentials are available');

      await panelEditPage.datasource.set(DATA_SOURCE_NAME);
      await panelEditPage.setVisualization('Table');
      await switchToCodeMode(page);
      // A schema-independent smoke query: proves the real connection/auth round-trip without
      // depending on the exact tables/columns seeded into the managed e2e dataset.
      await typeQuery(panelEditPage, page, selectors, 'SELECT 1 AS value');

      const response = await runQuery(panelEditPage, page, { timeout: 150_000 });

      expect(response.ok()).toBe(true);
      await expect(panelEditPage.panel.getErrorIcon()).not.toBeVisible();
      await expect(panelEditPage.panel.fieldNames).toContainText(['value']);
    });
  });
});
