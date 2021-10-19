import React, { useMemo } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { BigQueryDatasource } from './datasource';
import { DEFAULT_REGION, PROCESSING_LOCATIONS, QUERY_FORMAT_OPTIONS } from './constants';
import { Field, HorizontalGroup, Select } from '@grafana/ui';
import { QueryEditorRaw } from './QueryEditorRaw';
import { DatasetSelector } from './components/DatasetSelector';
import { TableSelector } from './components/TableSelector';
import { BigQueryQueryNG } from './bigquery_query';
import { BigQueryOptions, GoogleAuthType, QueryFormat } from './types';
import { getApiClient } from './api';
import { ProjectSelector } from 'components/ProjectSelector';

type Props = QueryEditorProps<BigQueryDatasource, BigQueryQueryNG, BigQueryOptions>;

function applyQueryDefaults(q: BigQueryQueryNG, ds: BigQueryDatasource) {
  const result = { ...q };

  result.project = q.project || ds.jsonData.defaultProject;
  result.dataset = q.dataset || ds.jsonData.defaultDataset;
  result.location = q.location || ds.jsonData.defaultRegion || DEFAULT_REGION;
  result.format = q.format || 0;
  result.rawSql = q.rawSql || 'Select ...';

  return result;
}
export function QueryEditor(props: Props) {
  const apiClient = useMemo(() => getApiClient(props.datasource.id), [props.datasource]);
  const queryWithDefaults = applyQueryDefaults(props.query, props.datasource);

  const processQuery = () => {
    if (
      queryWithDefaults.location &&
      queryWithDefaults.project &&
      queryWithDefaults.dataset &&
      queryWithDefaults.table
    ) {
      props.onRunQuery();
    }
  };

  const onFormatChange = (e: SelectableValue) => {
    props.onChange({
      ...queryWithDefaults,
      format: e.value || QueryFormat.Timeseries,
    });
    processQuery();
  };

  const onLocationChange = (e: SelectableValue) => {
    props.onChange({
      ...queryWithDefaults,
      location: e.value || DEFAULT_REGION,
    });
    processQuery();
  };

  const onProjectChange = (e: SelectableValue) => {
    props.onChange({
      ...queryWithDefaults,
      project: e.value,
      dataset: undefined,
      table: undefined,
    });
  };

  const onDatasetChange = (e: SelectableValue) => {
    props.onChange({
      ...queryWithDefaults,
      dataset: e.value,
      table: undefined,
    });
    processQuery();
  };

  const onTableChange = (e: SelectableValue) => {
    props.onChange({
      ...queryWithDefaults,
      table: e.value,
    });
    processQuery();
  };

  return (
    <>
      <HorizontalGroup>
        <Field label="Processing location">
          <Select
            options={PROCESSING_LOCATIONS}
            value={queryWithDefaults.location}
            onChange={onLocationChange}
            className="width-12"
          />
        </Field>
        <Field label="Project">
          <ProjectSelector
            readonly={props.datasource.jsonData.authenticationType === GoogleAuthType.JWT}
            apiClient={apiClient}
            projectId={queryWithDefaults.project!}
            location={queryWithDefaults.location!}
            onChange={onProjectChange}
            className="width-12"
          />
        </Field>

        <Field label="Dataset">
          <DatasetSelector
            apiClient={apiClient}
            projectId={queryWithDefaults.project!}
            location={queryWithDefaults.location!}
            value={queryWithDefaults.dataset}
            onChange={onDatasetChange}
            className="width-12"
          />
        </Field>

        <Field label="Table">
          <TableSelector
            apiClient={apiClient}
            projectId={queryWithDefaults.project!}
            location={queryWithDefaults.location!}
            dataset={queryWithDefaults.dataset!}
            value={queryWithDefaults.table}
            disabled={queryWithDefaults.dataset === undefined}
            onChange={onTableChange}
            className="width-12"
            applyDefault
          />
        </Field>

        <Field label="Format as">
          <Select
            options={QUERY_FORMAT_OPTIONS}
            value={props.query.format}
            onChange={onFormatChange}
            className="width-12"
          />
        </Field>
      </HorizontalGroup>

      <QueryEditorRaw query={props.query} onChange={props.onChange} onRunQuery={props.onRunQuery} />
    </>
  );
}
