import { QueryEditorProps } from '@grafana/data';
import { EditorField, EditorMode, EditorRow, EditorRows, Space } from '@grafana/experimental';
import { CodeEditor as RawCodeEditor } from 'components/CodeEditor';
import { BQSelectRow } from 'components/BQSelectRow';
import React, { useCallback, useEffect, useState } from 'react';
import { useAsync } from 'react-use';
import { applyQueryDefaults, isQueryValid, setDatasourceId } from 'utils';
import { getApiClient } from '../api';
import { QueryHeader } from '../components/QueryHeader';
import { BigQueryDatasource } from '../datasource';
import { BigQueryOptions, BigQueryQueryNG, QueryRowFilter } from '../types';
import { Preview } from './visual-query-builder/Preview';
import { BQWhereRow } from './BQWhereRow';
import { BQGroupByRow } from './BQGroupByRow';
import { BQOrderByRow } from './BQOrderByRow';

type Props = QueryEditorProps<BigQueryDatasource, BigQueryQueryNG, BigQueryOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  setDatasourceId(datasource.id);
  const { loading: apiLoading, error: apiError, value: apiClient } = useAsync(
    async () => await getApiClient(datasource.id),
    [datasource]
  );
  const queryWithDefaults = applyQueryDefaults(query, datasource);
  const [queryRowFilter, setQueryRowFilter] = useState<QueryRowFilter>({
    filter: !!queryWithDefaults.sql.whereString,
    group: !!queryWithDefaults.sql.groupBy?.[0]?.property.name,
    order: !!queryWithDefaults.sql.orderBy?.property.name,
    preview: true,
  });

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

  const onQueryChange = (q: BigQueryQueryNG) => {
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
        apiClient={apiClient}
      />

      <Space v={0.5} />

      {queryWithDefaults.editorMode !== EditorMode.Code && (
        <EditorRows>
          <EditorRow>
            <BQSelectRow query={queryWithDefaults} onQueryChange={onQueryChange} />
          </EditorRow>
          {queryRowFilter.filter && (
            <EditorRow>
              <EditorField label="Filter by column value" optional>
                <BQWhereRow apiClient={apiClient} query={queryWithDefaults} onQueryChange={onQueryChange} />
              </EditorField>
            </EditorRow>
          )}
          {queryRowFilter.group && (
            <EditorRow>
              <EditorField label="Group by column">
                <BQGroupByRow query={queryWithDefaults} onQueryChange={onQueryChange} />
              </EditorField>
            </EditorRow>
          )}
          {queryRowFilter.order && (
            <EditorRow>
              <BQOrderByRow query={queryWithDefaults} onQueryChange={onQueryChange} />
            </EditorRow>
          )}
          {queryRowFilter.preview && queryWithDefaults.rawSql && (
            <EditorRow>
              <Preview rawSql={queryWithDefaults.rawSql} />
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
