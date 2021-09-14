import { DataSourceJsonData } from '@grafana/data';

export interface IJwt {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

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
  queryPriority?: string;
  tokenUri?: string;
  clientEmail?: string;
  defaultProject?: string;
}

export interface BigQuerySecureJsonData {
  // apiKey?: string;
  // jwt?: string;
  privateKey?: string;
}
