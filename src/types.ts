import { TimeRange } from '@grafana/data';
import {
  DataSourceOptions,
  DataSourceSecureJsonData,
  GOOGLE_AUTH_TYPE_OPTIONS,
  OAUTH_PASSTHROUGH_AUTH_TYPE_OPTION,
  WIF_AUTH_TYPE_OPTION,
} from '@grafana/google-sdk';
import { EditorMode } from '@grafana/plugin-ui';
import { DataQuery } from '@grafana/schema';
import { JsonTree } from '@react-awesome-query-builder/ui';
import { BigQueryAPI } from 'api';
import {
  QueryEditorFunctionExpression,
  QueryEditorGroupByExpression,
  QueryEditorPropertyExpression,
} from 'expressions';
import { applyQueryDefaults } from 'utils';

import { isCloud } from './utils';

export enum QueryPriority {
  Interactive = 'INTERACTIVE',
  Batch = 'BATCH',
}

export interface QueryRowFilter {
  filter: boolean;
  group: boolean;
  order: boolean;
  preview: boolean;
}

export interface BigQueryOptions extends DataSourceOptions {
  flatRateProject?: string;
  processingLocation?: string;
  queryPriority?: QueryPriority;
  enableSecureSocksProxy?: boolean;
  MaxBytesBilled?: number;
  serviceEndpoint?: string;
  oauthPassThru?: boolean;
  useGceForAlerting?: boolean;
}

export const bigQueryAuthTypes = [
  ...GOOGLE_AUTH_TYPE_OPTIONS,
  OAUTH_PASSTHROUGH_AUTH_TYPE_OPTION,
  ...(isCloud() ? [WIF_AUTH_TYPE_OPTION] : []),
];

export interface BigQuerySecureJsonData extends DataSourceSecureJsonData {}

export enum GroupType {
  Time = 'time',
  Column = 'column',
}

export enum QueryFormat {
  Timeseries = 0,
  Table = 1,
}

export interface QueryModel extends DataQuery {
  rawSql: string;
  format: QueryFormat;
  connectionArgs: {
    dataset: string;
    table: string;
    location: string;
    enableStorageAPI: boolean;
  };
}

export interface SQLExpression {
  columns?: QueryEditorFunctionExpression[];
  from?: string;
  whereJsonTree?: JsonTree;
  whereString?: string;
  groupBy?: QueryEditorGroupByExpression[];
  // TODO: Maybe change this to array in the future
  orderBy?: QueryEditorPropertyExpression;
  orderByDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface ResourceSelectorProps {
  apiClient: BigQueryAPI;
  disabled?: boolean;
  className?: string;
  applyDefault?: boolean;
}
export interface BigQueryQueryNG extends DataQuery {
  dataset?: string;
  table?: string;
  project?: string;

  format: QueryFormat;
  rawQuery?: boolean;
  rawSql: string;
  location?: string;
  enableStorageAPI?: boolean;

  partitioned?: boolean;
  partitionedField?: string;
  convertToUTC?: boolean;
  sharded?: boolean;
  queryPriority?: QueryPriority;
  timeShift?: string;
  editorMode?: EditorMode;
  sql?: SQLExpression;
}

export type QueryWithDefaults = ReturnType<typeof applyQueryDefaults>;

export interface QueryEditorProps {
  apiClient: BigQueryAPI;
  query: QueryWithDefaults;
  onChange: (query: BigQueryQueryNG) => void;
  range?: TimeRange;
}
