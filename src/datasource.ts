import {
  DataQuery,
  DataQueryRequest,
  DataSourceInstanceSettings,
  ScopedVars,
  VariableSupportType,
} from '@grafana/data';
import { EditorMode } from '@grafana/experimental';
import { GoogleAuthType } from '@grafana/google-sdk';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { getApiClient } from 'api';
import { uniqueId } from 'lodash';
import { VariableEditor } from './components/VariableEditor';
import { BigQueryOptions, BigQueryQueryNG, QueryFormat, QueryModel } from './types';
import { interpolateVariable } from './utils/interpolateVariable';

export class BigQueryDatasource extends DataSourceWithBackend<BigQueryQueryNG, BigQueryOptions> {
  jsonData: BigQueryOptions;

  authenticationType: string;
  annotations = {};

  constructor(instanceSettings: DataSourceInstanceSettings<BigQueryOptions>) {
    super(instanceSettings);

    this.jsonData = instanceSettings.jsonData;
    this.authenticationType = instanceSettings.jsonData.authenticationType || GoogleAuthType.JWT;
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
      return { status: 'error', message: health.message, details: health.details };
    }

    const client = await getApiClient(this.id);
    try {
      await client.getProjects();
    } catch (err: any) {
      return {
        status: 'error',
        message: err.data?.message || 'Error connecting to resource manager.',
        details: err.data?.details,
      };
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
      },
    };
    return result;
  }
}
