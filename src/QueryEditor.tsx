import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { GrafanaTheme2, QueryEditorProps, SelectableValue } from '@grafana/data';
import { BigQueryDatasource } from './datasource';
import { DEFAULT_REGION, PROCESSING_LOCATIONS, QUERY_FORMAT_OPTIONS } from './constants';
import {
  CustomScrollbar,
  Field,
  HorizontalGroup,
  JSONFormatter,
  Select,
  Tab,
  TabContent,
  TabsBar,
  Tooltip,
  useTheme2,
} from '@grafana/ui';
import { QueryEditorRaw } from './components/query-editor-raw/QueryEditorRaw';
import { DatasetSelector } from './components/DatasetSelector';
import { BigQueryQueryNG } from './bigquery_query';
import { BigQueryOptions, QueryFormat } from './types';
import { getApiClient, TableFieldSchema } from './api';
import { useAsync, useAsyncFn } from 'react-use';

import { Parser } from 'node-sql-parser/build/bigquery';

type Props = QueryEditorProps<BigQueryDatasource, BigQueryQueryNG, BigQueryOptions>;

function applyQueryDefaults(q: BigQueryQueryNG, ds: BigQueryDatasource) {
  const result = { ...q };

  // result.dataset = q.dataset;
  result.location = q.location || ds.jsonData.defaultRegion || DEFAULT_REGION;
  result.format = q.format !== undefined ? q.format : QueryFormat.Table;
  result.rawSql = q.rawSql || '';

  return result;
}

const isQueryValid = (q: BigQueryQueryNG) => {
  return Boolean(q.location && q.rawSql);
};

export function QueryEditor(props: Props) {
  const schemaCache = useRef(new Map<string, { schema: TableFieldSchema[]; columns: string[] }>());
  const queryParser = useMemo(() => new Parser(), []);

  const {
    loading: apiLoading,
    error: apiError,
    value: apiClient,
  } = useAsync(async () => await getApiClient(props.datasource.id), [props.datasource]);

  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const theme: GrafanaTheme2 = useTheme2();

  const queryWithDefaults = applyQueryDefaults(props.query, props.datasource);

  const [fetchTableSchemaState, fetchTableSchema] = useAsyncFn(
    async (l?: string, d?: string, t?: string) => {
      if (!Boolean(l && d && t) || !apiClient) {
        return null;
      }

      if (schemaCache.current?.has(t!)) {
        return schemaCache.current?.get(t!);
      }
      const schema = await apiClient.getTableSchema(l!, d!, t!);
      const columns = await apiClient.getColumns(l!, d!, t!);
      const results = {
        schema: schema.schema || [],
        columns,
      };
      schemaCache.current.set(t!, results);
      return results;
    },
    [apiClient]
  );

  const getColumns = useCallback(
    // excpects fully qualified table name: <project-id>.<dataset-id>.<table-id>
    async (t: string) => {
      if (!apiClient || !queryWithDefaults.location) {
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

      return cols.map((c) => ({ name: c }));
    },
    [apiClient, queryWithDefaults.location, queryWithDefaults.dataset]
  );

  const getTables = useCallback(
    async (d?: string) => {
      if (!queryWithDefaults.location || !apiClient) {
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

  useEffect(() => {
    if (!queryWithDefaults.location || !queryWithDefaults.dataset || !queryWithDefaults.table) {
      return;
    }
    fetchTableSchema(queryWithDefaults.location, queryWithDefaults.dataset, queryWithDefaults.table);
  }, [fetchTableSchema, queryWithDefaults.location, queryWithDefaults.dataset, queryWithDefaults.table]);

  const processQuery = (q: BigQueryQueryNG) => {
    if (isQueryValid(q)) {
      props.onRunQuery();
    }
  };

  const onFormatChange = (e: SelectableValue) => {
    const next = { ...props.query, format: e.value || QueryFormat.Timeseries };
    props.onChange(next);
    processQuery(next);
  };

  const onLocationChange = (e: SelectableValue) => {
    const next = { ...props.query, location: e.value || DEFAULT_REGION };
    props.onChange(next);
    processQuery(next);
  };

  const onDatasetChange = (e: SelectableValue) => {
    const next = {
      ...queryWithDefaults,
      dataset: e.value,
      table: undefined,
    };

    setIsSchemaOpen(false);
    props.onChange(next);
    processQuery(next);
  };

  const onRawQueryChange = useCallback(
    (q: BigQueryQueryNG) => {
      // const a = queryParser.tableList(q.rawSql);
      // console.log(a);

      props.onChange(q);
      processQuery(q);
    },
    [props.onChange, queryParser]
  );

  const schemaTab = (
    <Tab
      label="Table schema"
      active={isSchemaOpen}
      onChangeTab={() => {
        if (!Boolean(queryWithDefaults.table)) {
          return;
        }
        setIsSchemaOpen(true);
      }}
      icon={fetchTableSchemaState.loading ? 'fa fa-spinner' : undefined}
    />
  );

  if (apiLoading || apiError || !apiClient) {
    return null;
  }

  return (
    <>
      <HorizontalGroup>
        <Field label="Processing location">
          <Select
            options={PROCESSING_LOCATIONS}
            value={queryWithDefaults.location}
            onChange={onLocationChange}
            className="width-12"
            menuShouldPortal={true}
          />
        </Field>

        <Field label="Dataset">
          <DatasetSelector
            apiClient={apiClient}
            location={queryWithDefaults.location!}
            value={queryWithDefaults.dataset}
            onChange={onDatasetChange}
            className="width-12"
          />
        </Field>

        <Field label="Format as">
          <Select
            options={QUERY_FORMAT_OPTIONS}
            value={queryWithDefaults.format}
            onChange={onFormatChange}
            className="width-12"
            menuShouldPortal={true}
          />
        </Field>
      </HorizontalGroup>

      <TabsBar>
        <Tab label={'Query'} active={!isSchemaOpen} onChangeTab={() => setIsSchemaOpen(false)} />
        {queryWithDefaults.table ? schemaTab : <Tooltip content={'Choose table first'}>{schemaTab}</Tooltip>}
      </TabsBar>

      <TabContent>
        {!isSchemaOpen && (
          <QueryEditorRaw
            getTables={getTables}
            getColumns={getColumns}
            query={queryWithDefaults}
            onChange={onRawQueryChange}
            onRunQuery={props.onRunQuery}
          />
        )}

        {isSchemaOpen && (
          <div
            style={{
              height: '300px',
              padding: `${theme.spacing(1)}`,
              marginBottom: `${theme.spacing(1)}`,
              border: `1px solid ${theme.colors.border.medium}`,
              overflow: 'auto',
            }}
          >
            {fetchTableSchemaState.value && fetchTableSchemaState.value.schema && props.query.table && (
              <CustomScrollbar>
                <JSONFormatter json={fetchTableSchemaState.value.schema} open={2} />
              </CustomScrollbar>
            )}
          </div>
        )}
      </TabContent>
    </>
  );
}
