import React, { useMemo, useEffect, useState, useRef } from 'react';
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
import { QueryEditorRaw } from './QueryEditorRaw';
import { DatasetSelector } from './components/DatasetSelector';
import { TableSelector } from './components/TableSelector';
import { BigQueryQueryNG } from './bigquery_query';
import { BigQueryOptions, GoogleAuthType, QueryFormat } from './types';
import { getApiClient, TableSchema } from './api';
import { useAsync, useAsyncFn } from 'react-use';

type Props = QueryEditorProps<BigQueryDatasource, BigQueryQueryNG, BigQueryOptions>;

async function applyQueryDefaults(q: BigQueryQueryNG, ds: BigQueryDatasource) {
  debugger;
  const result = { ...q };

  if (!result.project && ds.jsonData.authenticationType === GoogleAuthType.GCE) {
    const defaultGCEProject = await getApiClient(ds.id).getProject();
    result.project = defaultGCEProject;
  } else {
    result.project = q.project || ds.jsonData.defaultProject;
  }

  result.dataset = q.dataset;
  result.location = q.location || ds.jsonData.defaultRegion || DEFAULT_REGION;
  result.format = q.format !== undefined ? q.format : QueryFormat.Table;
  result.rawSql = q.rawSql || '';

  return result;
}

const isQueryValid = (q: BigQueryQueryNG) => {
  return Boolean(q.location && q.project && q.dataset && q.table && q.rawSql);
};

export function QueryEditor(props: Props) {
  const schemaCache = useRef(new Map<string, TableSchema>());
  // const queryWithDefaults = applyQueryDefaults(props.query, props.datasource);
  const apiClient = useMemo(() => getApiClient(props.datasource.id), [props.datasource]);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const theme: GrafanaTheme2 = useTheme2();

  const queryWithDefaults = useAsync(async () => {
    const q = await applyQueryDefaults(props.query, props.datasource);
    props.onChange(q);
    return q;
  }, [props.query, props.datasource, props.onChange]);

  const [fetchTableSchemaState, fetchTableSchema] = useAsyncFn(async (q: BigQueryQueryNG) => {
    if (!Boolean(q.location && q.project && q.dataset && q.table)) {
      return null;
    }

    const tablePath = `${q.project}:${q.dataset}.${q.table}`;
    if (schemaCache.current?.has(tablePath)) {
      return schemaCache.current?.get(tablePath);
    }
    const schema = await apiClient.getTableSchema(q.project!, q.location!, q.dataset!, q.table!);
    schemaCache.current.set(tablePath, schema);
    return schema;
  }, []);

  useEffect(() => {
    fetchTableSchema(queryWithDefaults);
  }, [fetchTableSchema]);

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

  const onTableChange = (e: SelectableValue) => {
    const next = {
      ...queryWithDefaults,
      table: e.value,
    };
    props.onChange(next);
    fetchTableSchema(next);
    processQuery(next);
  };

  const schemaTab = (
    <Tab
      label="Table schema"
      active={isSchemaOpen}
      onChangeTab={() => {
        if (!Boolean(queryWithDefaults.value?.table)) {
          return;
        }
        setIsSchemaOpen(true);
      }}
      icon={fetchTableSchemaState.loading ? 'fa fa-spinner' : undefined}
    />
  );

  if (queryWithDefaults.loading || !queryWithDefaults.value) {
    return null;
  }

  return (
    <>
      <HorizontalGroup>
        <Field label="Processing location">
          <Select
            options={PROCESSING_LOCATIONS}
            value={queryWithDefaults.value.location}
            onChange={onLocationChange}
            className="width-12"
          />
        </Field>

        {props.datasource.jsonData.authenticationType === GoogleAuthType.GCE && (
          <Field label="Project">
            <div>{queryWithDefaults.value.project || 'Fetching project'}</div>
          </Field>
        )}

        <Field label="Dataset">
          <DatasetSelector
            disabled={Boolean(queryWithDefaults.value.project)}
            apiClient={apiClient}
            projectId={queryWithDefaults.value.project!}
            location={queryWithDefaults.value.location!}
            value={queryWithDefaults.value.dataset}
            onChange={onDatasetChange}
            className="width-12"
          />
        </Field>

        <Field label="Table">
          <TableSelector
            apiClient={apiClient}
            projectId={queryWithDefaults.value.project!}
            location={queryWithDefaults.value.location!}
            dataset={queryWithDefaults.value.dataset!}
            value={queryWithDefaults.value.table}
            disabled={queryWithDefaults.value.dataset === undefined}
            onChange={onTableChange}
            className="width-12"
            applyDefault
          />
        </Field>

        <Field label="Format as">
          <Select
            options={QUERY_FORMAT_OPTIONS}
            value={queryWithDefaults.value.format}
            onChange={onFormatChange}
            className="width-12"
          />
        </Field>
      </HorizontalGroup>

      <TabsBar>
        <Tab label={'Query'} active={!isSchemaOpen} onChangeTab={() => setIsSchemaOpen(false)} />
        {queryWithDefaults.value.table ? schemaTab : <Tooltip content={'Choose table first'}>{schemaTab}</Tooltip>}
      </TabsBar>

      <TabContent>
        {!isSchemaOpen && (
          <QueryEditorRaw query={queryWithDefaults} onChange={props.onChange} onRunQuery={props.onRunQuery} />
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
