import { getBackendSrv } from '@grafana/runtime';

export interface TableFieldSchema {
  name: string;
  description?: string;
  type: string;
  schema: TableFieldSchema[];
}

export interface TableSchema {
  schema?: TableFieldSchema[];
}

export interface BigQueryAPI {
  getDatasets: (location: string) => Promise<string[]>;
  getTables: (location: string, dataset: string) => Promise<string[]>;
  getTableSchema: (location: string, dataset: string, table: string) => Promise<TableSchema>;
}

class BigQueryAPIClient implements BigQueryAPI {
  private baseUrl: string;
  private resourcesUrl: string;

  constructor(datasourceId: number) {
    this.baseUrl = `/api/datasources/${datasourceId}`;
    this.resourcesUrl = `${this.baseUrl}/resources`;
  }

  getProject = async (): Promise<string> => {
    return await getBackendSrv().post(this.resourcesUrl + '/projects', {});
  };

  getDatasets = async (location: string): Promise<string[]> => {
    return await getBackendSrv().post(this.resourcesUrl + '/datasets', {
      location,
    });
  };

  getTables = async (location: string, dataset: string): Promise<string[]> => {
    return await getBackendSrv().post(this.resourcesUrl + '/dataset/tables', {
      location,
      dataset,
    });
  };

  getTableSchema = async (location: string, dataset: string, table: string): Promise<TableSchema> => {
    return await getBackendSrv().post(this.resourcesUrl + '/dataset/table/schema', {
      location,
      dataset,
      table,
    });
  };
}

const apis: Map<number, BigQueryAPI> = new Map();

export function getApiClient(datasourceId: number) {
  if (!apis.has(datasourceId)) {
    apis.set(datasourceId, new BigQueryAPIClient(datasourceId));
  }

  return apis.get(datasourceId)!;
}
