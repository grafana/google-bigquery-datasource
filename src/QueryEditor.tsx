import React, { useMemo } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { BigQueryDatasource } from './datasource';
import { QUERY_FORMAT_OPTIONS } from './constants';
// import { AthenaDataSourceOptions, AthenaQuery, defaultQuery, FormatOptions, SelectableFormatOptions } from './types';
import { InlineField, InlineSegmentGroup, Select } from '@grafana/ui';
// import { QueryEditorRaw } from './QueryEditorRaw';
import { DatasetSelector } from './components/DatasetSelector';
import { TableSelector } from './components/TableSelector';
import { BigQueryQueryNG } from './bigquery_query';
import { BigQueryOptions, QueryFormat } from './types';
import { getApiClient } from './api';

type Props = QueryEditorProps<BigQueryDatasource, BigQueryQueryNG, BigQueryOptions>;

export function QueryEditor(props: Props) {
  const apiClient = useMemo(() => getApiClient(props.datasource.id), [props.datasource]);
  //   const queryWithDefaults = {
  //     ...defaultQuery,
  //     ...props.query,
  //     connectionArgs: {
  //       ...defaultQuery.connectionArgs,
  //       ...props.query.connectionArgs,
  //     },
  //   };

  //   // Region selector
  //   const [region, setRegion] = useState(queryWithDefaults.connectionArgs.region);
  //   const fetchRegions = async () => {
  //     const regions = await props.datasource.getResource('regions');
  //     return regions;
  //   };
  //   const onRegionChange = (region: string | null) => {
  //     setRegion(region || '');
  //     props.onChange({
  //       ...props.query,
  //       connectionArgs: {
  //         ...queryWithDefaults.connectionArgs,
  //         region: region || '',
  //       },
  //     });
  //   };

  //   // Catalog selector
  //   const [catalog, setCatalog] = useState<string | null>(queryWithDefaults.connectionArgs.catalog);
  //   const fetchCatalogs = async () => await props.datasource.postResource('catalogs', { region });
  //   const onCatalogChange = (catalog: string | null) => {
  //     setCatalog(catalog);
  //     props.onChange({
  //       ...props.query,
  //       connectionArgs: {
  //         ...queryWithDefaults.connectionArgs,
  //         catalog: catalog || '',
  //       },
  //     });
  //   };

  //   // Database selector
  //   const [database, setDatabase] = useState<string | null>(queryWithDefaults.connectionArgs.database);
  //   const fetchDatabases = async () => await props.datasource.postResource('databases', { region, catalog });
  //   const onDatabaseChange = (database: string | null) => {
  //     setDatabase(database);
  //     props.onChange({
  //       ...props.query,
  //       connectionArgs: {
  //         ...queryWithDefaults.connectionArgs,
  //         database: database || '',
  //       },
  //     });
  //     // now that connection args are complete, run request
  //     props.onRunQuery();
  //   };

  //   // Tables selector
  //   const [table, setTable] = useState<string | null>(queryWithDefaults.table || null);
  //   const fetchTables = async () =>
  //     await props.datasource.postResource('tablesWithConnectionDetails', { region, catalog, database });
  //   const onTableChange = (newTable: string | null) => {
  //     setTable(newTable);
  //     props.onChange({
  //       ...queryWithDefaults,
  //       table: newTable || undefined,
  //       column: undefined,
  //     });
  //     props.onRunQuery();
  //   };

  //   // column
  //   const [column, setColumn] = useState<string | null>(queryWithDefaults.column || null);
  //   const columnDependencies = {
  //     ...queryWithDefaults.connectionArgs,
  //     table: queryWithDefaults.table,
  //   };
  //   const fetchColumns = async () =>
  //     await props.datasource.postResource('columnsWithConnectionDetails', columnDependencies);
  //   const onColumnChange = (newColumn: string | null) => {
  //     setColumn(newColumn);
  //     props.onChange({
  //       ...queryWithDefaults,
  //       column: newColumn || undefined,
  //     });
  //     props.onRunQuery();
  //   };

  const onChangeFormat = (e: SelectableValue) => {
    props.onChange({
      ...props.query,
      format: e.value || QueryFormat.Timeseries,
    });
    props.onRunQuery();
  };

  return (
    <>
      <InlineSegmentGroup>
        <DatasetSelector
          apiClient={apiClient}
          projectId={props.query.project}
          location={props.query.location}
          onChange={(c) => {
            console.log(c);
          }}
        />
        <TableSelector
          apiClient={apiClient}
          projectId={props.query.project}
          location={props.query.location}
          dataset={props.query.dataset}
          disabled={props.query.dataset === undefined}
          onChange={(c) => {
            console.log(c);
          }}
        />

        <InlineField label="Format as" labelWidth={11}>
          <Select
            options={QUERY_FORMAT_OPTIONS}
            value={props.query.format}
            onChange={(e) => {
              console.log(e);
            }}
            className="width-12"
          />
        </InlineField>

        {/* <div className="gf-form-group"> */}
        {/* <AthenaResourceSelector
            resource="region"
            value={region}
            fetch={fetchRegions}
            onChange={onRegionChange}
            default={props.datasource.defaultRegion}
            labelWidth={11}
            className="width-12"
          />
          <AthenaResourceSelector
            resource="catalog"
            value={catalog}
            fetch={fetchCatalogs}
            onChange={onCatalogChange}
            default={props.datasource.defaultCatalog}
            dependencies={[region]}
            labelWidth={11}
            className="width-12"
          />
          <AthenaResourceSelector
            resource="database"
            value={database}
            fetch={fetchDatabases}
            onChange={onDatabaseChange}
            default={props.datasource.defaultDatabase}
            dependencies={[region, catalog]}
            labelWidth={11}
            className="width-12"
          />
          <AthenaResourceSelector
            resource="table"
            value={table}
            fetch={fetchTables}
            onChange={onTableChange}
            dependencies={[region, catalog, database]}
            tooltip="Use the selected table with the $__table macro"
            labelWidth={11}
            className="width-12"
          />
          <AthenaResourceSelector
            resource="column"
            value={column}
            fetch={fetchColumns}
            onChange={onColumnChange}
            dependencies={[region, catalog, database, table]}
            tooltip="Use the selected column with the $__column macro"
            labelWidth={11}
            className="width-12"
          /> */}
        {/* <h6>Frames</h6>
          
        </div> */}
        <div style={{ minWidth: '400px', marginLeft: '10px', flex: 1 }}>
          <QueryEditorRaw query={props.query} onChange={props.onChange} onRunQuery={props.onRunQuery} />
        </div>
      </InlineSegmentGroup>
    </>
  );
}
