import { QueryEditorProps } from '@grafana/data';
import { EditorField, EditorRow, EditorRows, Space } from '@grafana/experimental';
import { CodeEditor } from '@grafana/ui';
import { CodeEditor as RawCodeEditor } from 'components/CodeEditor';
import { SQLBuilderSelectRow } from 'components/SQLBuilderSelectRow';
import React, { useState, useEffect, useCallback } from 'react';
import { useAsync } from 'react-use';
import { applyQueryDefaults, isQueryValid } from 'utils';
import { getApiClient } from '../api';
import QueryHeader from '../components/QueryHeader';
import { BigQueryDatasource } from '../datasource';
import { BigQueryOptions, BigQueryQueryNG, EditorMode, QueryRowFilter } from '../types';
import { SQLBuilderWhereRow } from './SQLBuilderWhereRow';
import { SQLGroupByRow } from './SQLGroupByRow';
import { SQLOrderByRow } from './SQLOrderByRow';

type Props = QueryEditorProps<BigQueryDatasource, BigQueryQueryNG, BigQueryOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const { loading: apiLoading, error: apiError, value: apiClient } = useAsync(
    async () => await getApiClient(datasource.id),
    [datasource]
  );

  const [queryRowFilter, setQueryRowFilter] = useState<QueryRowFilter>({
    filter: false,
    group: false,
    order: false,
    preview: true,
  });

  const queryWithDefaults = applyQueryDefaults(query, datasource);

  useEffect(() => {
    return () => {
      getApiClient(datasource.id).then((client) => client.dispose());
    };
  }, [datasource.id]);

  const processQuery = useCallback(
    (q: BigQueryQueryNG) => {
      if (isQueryValid(q) && onRunQuery) {
        onRunQuery();
      }
    },
    [onRunQuery]
  );

  const onColumnsChange = (q: BigQueryQueryNG) => {
    onChange(q);
    processQuery(q);
  };

  if (apiLoading || apiError || !apiClient) {
    return null;
  }

  return (
    <>
      <QueryHeader
        onChange={onChange}
        onRunQuery={onRunQuery}
        onQueryRowChange={setQueryRowFilter}
        queryRowFilter={queryRowFilter}
        query={queryWithDefaults}
        // TODO: add proper dirty check
        sqlCodeEditorIsDirty={!!queryWithDefaults.sql.columns?.length}
        apiClient={apiClient}
      />

      <Space v={0.5} />

      {queryWithDefaults.editorMode !== EditorMode.Code && (
        <EditorRows>
          <EditorRow>
            <SQLBuilderSelectRow query={queryWithDefaults} onQueryChange={onColumnsChange} apiClient={apiClient} />
          </EditorRow>
          {queryRowFilter.filter && (
            <EditorRow>
              <EditorField label="Filter by column value" optional>
                <SQLBuilderWhereRow apiClient={apiClient} query={queryWithDefaults} onQueryChange={onColumnsChange} />
              </EditorField>
            </EditorRow>
          )}
          {queryRowFilter.group && (
            <EditorRow>
              <EditorField label="Group by column">
                <SQLGroupByRow query={queryWithDefaults} onQueryChange={onColumnsChange} apiClient={apiClient} />
              </EditorField>
            </EditorRow>
          )}
          {queryRowFilter.order && (
            <EditorRow>
              <SQLOrderByRow query={queryWithDefaults} onQueryChange={onColumnsChange} apiClient={apiClient} />
            </EditorRow>
          )}
          {queryRowFilter.preview && queryWithDefaults.rawSql && (
            <EditorRow>
              <EditorField label="Preview">
                {/* TODO: Figure out how to not hardcode width */}
                <CodeEditor height={80} width={800} language="sql" value={queryWithDefaults.rawSql} readOnly={true} />
              </EditorField>
            </EditorRow>
          )}
        </EditorRows>
      )}

      {queryWithDefaults.editorMode === EditorMode.Code && (
        <RawCodeEditor
          apiClient={apiClient}
          queryWithDefaults={queryWithDefaults}
          onChange={onChange}
          onRunQuery={onRunQuery}
        />
      )}
    </>
  );
}
