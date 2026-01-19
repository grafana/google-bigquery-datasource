import { uniqueId } from 'lodash';

import { DataQueryRequest, DataSourceInstanceSettings, ScopedVars, VariableSupportType } from '@grafana/data';
import { EditorMode } from '@grafana/plugin-ui';
import { DataSourceWithBackend, HealthCheckError, getTemplateSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { getApiClient } from 'api';

import { VariableEditor } from './components/VariableEditor';
import { BigQueryAuth, BigQueryOptions, BigQueryQueryNG, QueryFormat, QueryModel } from './types';
import { interpolateVariable } from './utils/interpolateVariable';

export class BigQueryDatasource extends DataSourceWithBackend<BigQueryQueryNG, BigQueryOptions> {
  jsonData: BigQueryOptions;

  authenticationType: string;
  annotations = {};

  constructor(instanceSettings: DataSourceInstanceSettings<BigQueryOptions>) {
    super(instanceSettings);

    this.jsonData = instanceSettings.jsonData;
    this.authenticationType = instanceSettings.jsonData.authenticationType || BigQueryAuth.JWT;
    this.variables = {
      getType: () => VariableSupportType.Custom,
      // Have to use any here as DatasourceApi will not be the same as BigQueryDatasource
      editor: VariableEditor as any,
      query: (request: DataQueryRequest<BigQueryQueryNG>) => {
        // Make sure that every query has a refId
        const queries = request.targets.map((query) => {
          return { ...query, refId: query.refId || uniqueId('tempVar') };
        });
        return this.query({ ...request, targets: queries });
      },
    };
  }

  filterQuery(query: BigQueryQueryNG) {
    if (query.hide || !query.rawSql) {
      return false;
    }
    return true;
  }

  async importQueries(queries: DataQuery[]) {
    const importedQueries = [];

    for (let i = 0; i < queries.length; i++) {
      if (queries[i].datasource?.type === 'doitintl-bigquery-datasource') {
        const {
          // ignore not supported fields
          group,
          metricColumn,
          orderByCol,
          orderBySort,
          select,
          timeColumn,
          timeColumnType,
          where,
          convertToUTC,
          // use the rest of the fields
          ...commonQueryProps
        } = queries[i] as any;

        importedQueries.push({
          ...commonQueryProps,
          location: (queries[i] as any).location || '',
          format: (queries[i] as any).format === 'time_series' ? QueryFormat.Timeseries : QueryFormat.Table,
          editorMode: EditorMode.Code,
        } as BigQueryQueryNG);
      }
    }

    return Promise.resolve(importedQueries) as any;
  }

  async testDatasource() {
    const health = await this.callHealthCheck();
    if (health.status?.toLowerCase() === 'error') {
      return Promise.reject({
        status: 'error',
        message: health.message,
        error: new HealthCheckError(health.message, health.details),
      });
    }

    const client = await getApiClient(this.uid);
    try {
      await client.getProjects();
    } catch (err: any) {
      return Promise.reject({
        status: 'error',
        message: err.data?.message || 'Error connecting to resource manager.',
        error: new HealthCheckError(err.data?.message, err.data?.details),
      });
    }
    return {
      status: 'OK',
      message: 'Data source is working',
    };
  }

  applyTemplateVariables(queryModel: BigQueryQueryNG, scopedVars: ScopedVars): QueryModel {
    const interpolatedSql = getTemplateSrv().replace(queryModel.rawSql, scopedVars, interpolateVariable);

    const result = {
      refId: queryModel.refId,
      hide: queryModel.hide,
      key: queryModel.key,
      queryType: queryModel.queryType,
      datasource: queryModel.datasource,
      rawSql: interpolatedSql,
      format: queryModel.format,
      connectionArgs: {
        dataset: queryModel.dataset!,
        table: queryModel.table!,
        location: queryModel.location!,
        enableStorageAPI: queryModel.enableStorageAPI || false,
      },
    };
    return result;
  }
}
