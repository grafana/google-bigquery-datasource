import { BigQueryAPI } from 'api';
import { QueryEditorRaw } from './query-editor-raw/QueryEditorRaw';
import React, { useCallback } from 'react';
import { BigQueryQueryNG, QueryWithDefaults } from 'types';
import { getColumnInfoFromSchema } from 'utils/getColumnInfoFromSchema';

export function CodeEditor({
  apiClient,
  queryWithDefaults,
  onChange,
  onRunQuery,
}: {
  apiClient: BigQueryAPI;
  queryWithDefaults: QueryWithDefaults;
  onChange: (query: BigQueryQueryNG) => void;
  onRunQuery: () => void;
}) {
  const getColumns = useCallback(
    // expects fully qualified table name: <project-id>.<dataset-id>.<table-id>
    async (t: string) => {
      if (!apiClient) {
        return [];
      }
      let cols;
      const tablePath = t.split('.');

      if (tablePath.length === 3) {
        cols = await apiClient.getColumns(queryWithDefaults.location, tablePath[1], tablePath[2]);
      } else {
        if (!queryWithDefaults.dataset) {
          return [];
        }
        cols = await apiClient.getColumns(queryWithDefaults.location, queryWithDefaults.dataset, t!);
      }

      if (cols.length > 0) {
        const schema = await apiClient.getTableSchema(queryWithDefaults.location, tablePath[1], tablePath[2]);
        return cols.map((c) => {
          const cInfo = schema.schema ? getColumnInfoFromSchema(c, schema.schema) : null;
          return { name: c, ...cInfo };
        });
      } else {
        return [];
      }
    },
    [apiClient, queryWithDefaults.location, queryWithDefaults.dataset]
  );

  const getTables = useCallback(
    async (d?: string) => {
      if (!apiClient) {
        return [];
      }

      let datasets = [];
      if (!d) {
        datasets = await apiClient.getDatasets(queryWithDefaults.location);
        return datasets.map((d) => ({ name: d, completion: `${apiClient.getDefaultProject()}.${d}.` }));
      } else {
        const path = d.split('.').filter((s) => s);
        if (path.length > 2) {
          return [];
        }
        if (path[0] && path[1]) {
          const tables = await apiClient.getTables(queryWithDefaults.location, path[1]);
          return tables.map((t) => ({ name: t }));
        } else if (path[0]) {
          datasets = await apiClient.getDatasets(queryWithDefaults.location);
          return datasets.map((d) => ({ name: d, completion: `${d}` }));
        } else {
          return [];
        }
      }
    },
    [apiClient, queryWithDefaults.location]
  );
  return (
    <>
      <QueryEditorRaw
        getTables={getTables}
        getColumns={getColumns}
        query={queryWithDefaults}
        onChange={onChange}
        onRunQuery={onRunQuery}
      />
    </>
  );
}
