import { DataSourceJsonData } from '@grafana/data';

export enum GoogleAuthType {
  JWT = 'jwt',
  GCE = 'gce',
}

export enum QueryPriority {
  Interactive = 'INTERACTIVE',
  Batch = 'BATCH',
}

export interface BigQueryOptions extends DataSourceJsonData {
  authenticationType: GoogleAuthType;
  flatRateProject?: string;
  processingLocation?: string;
  queryPriority?: QueryPriority;
  tokenUri?: string;
  clientEmail?: string;
  defaultProject?: string;
}

export interface BigQuerySecureJsonData {
  // apiKey?: string;
  // jwt?: string;
  privateKey?: string;
}
