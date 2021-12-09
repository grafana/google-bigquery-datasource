import _ from 'lodash';
import BigQueryQuery, { BigQueryQueryNG } from './bigquery_query';
import { BigQueryOptions, GoogleAuthType, QueryModel } from './types';
import { v4 as generateID } from 'uuid';
import { DataSourceInstanceSettings, ScopedVars, VariableModel } from '@grafana/data';
import { DataSourceWithBackend, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { formatBigqueryError, quoteLiteral } from 'utils';
import BQTypes from '@google-cloud/bigquery/build/src/types';

export class BigQueryDatasource extends DataSourceWithBackend<BigQueryQueryNG, BigQueryOptions> {
  private readonly baseUrl: string;
  private readonly url?: string;

  private queryModel: BigQueryQuery;
  private processingLocation?: string;
  // private queryPriority?: QueryPriority;
  jsonData: BigQueryOptions;

  authenticationType: string;

  constructor(instanceSettings: DataSourceInstanceSettings<BigQueryOptions>) {
    super(instanceSettings);
    this.baseUrl = `/bigquery/`;
    this.url = instanceSettings.url;
    // this.responseParser = new ResponseParser();
    this.queryModel = new BigQueryQuery({} as any);

    this.jsonData = instanceSettings.jsonData;
    this.authenticationType = instanceSettings.jsonData.authenticationType || GoogleAuthType.JWT;

    this.processingLocation =
      this.jsonData.processingLocation && this.jsonData.processingLocation.length
        ? this.jsonData.processingLocation
        : undefined;

    // this.queryPriority = this.jsonData.queryPriority;
  }

  filterQuery(query: BigQueryQueryNG) {
    if (
      // !query.dataset || !query.table ||
      !query.rawSql
    ) {
      return false;
    }
    return true;
  }

  async metricFindQuery(query: string, optionalOptions: any) {
    let refId = 'tempvar';
    if (optionalOptions && optionalOptions.variable && optionalOptions.variable.name) {
      refId = optionalOptions.variable.name;
    }

    const interpolatedQuery = {
      datasourceId: this.id,
      format: 'table',
      rawSql: getTemplateSrv().replace(query, {}, this.interpolateVariable),
      refId,
    };

    return [];

    // return await this.doQuery(interpolatedQuery.rawSql, refId).then((metricData) => {
    //   if (!metricData) {
    //     return [];
    //   }
    //   return ResponseParser.toVar(metricData);
    // });
  }

  async annotationQuery(options: any): Promise<any> {
    // const path = `v2/projects/${this.runInProject}/queries`;
    // const url = this.url + `${this.baseUrl}${path}`;
    // if (!options.annotation.rawQuery) {
    //   return Promise.reject({
    //     message: 'Query missing in annotation definition',
    //   });
    // }
    // const rawSql = getTemplateSrv().replace(options.annotation.rawQuery, options.scopedVars, this.interpolateVariable);
    // const query = {
    //   // datasourceId: this.id,
    //   format: QueryFormat.Table,
    //   rawSql,
    //   refId: options.annotation.name,
    // } as BigQueryQueryNG;
    // this.queryModel.target.rawSql = query.rawSql;
    // query.rawSql = this.queryModel.expend_macros(options);
    // return getBackendSrv()
    //   .fetch({
    //     data: {
    //       priority: this.queryPriority,
    //       from: options.range.from.valueOf().toString(),
    //       query: query.rawSql,
    //       to: options.range.to.valueOf().toString(),
    //       useLegacySql: false,
    //       useQueryCache: true,
    //     },
    //     method: 'POST',
    //     requestId: options.annotation.name,
    //     url,
    //   })
    //   .pipe(
    //     map(async (res: FetchResponse) => {
    //       return await this.responseParser.transformAnnotationResponse(options, res);
    //     })
    //   )
    //   .toPromise();
  }

  // private setUpQ(modOptions: any, options: DataQueryRequest<BigQueryQueryNG>, query: BigQueryQueryNG) {
  //   let q = this.queryModel.expend_macros(modOptions);

  //   if (q) {
  //     q = this.setUpPartition(q, Boolean(query.partitioned), query.partitionedField || '', modOptions);
  //     q = updatePartition(q, modOptions);
  //     q = updateTableSuffix(q, modOptions);

  //     if (query.refId.search(SHIFTED) > -1) {
  //       // TODO: get rid of !
  //       q = this._updateAlias(q!, modOptions, query.refId);
  //     }

  //     const limit = q?.match(/[^]+(\bLIMIT\b)/gi);

  //     if (limit == null) {
  //       const limitStatement = ' LIMIT ' + options.maxDataPoints;
  //       const limitPosition = q?.match(/\$__limitPosition/g);

  //       if (limitPosition !== null) {
  //         q = q?.replace(/\$__limitPosition/g, limitStatement);
  //       } else {
  //         q += limitStatement;
  //       }
  //     }
  //   }
  //   return q;
  // }

  /**
   * Add partition to query unless it has one
   * @param query
   * @param isPartitioned
   * @param partitionedField
   * @param options
   */
  // private setUpPartition(
  //   query: string,
  //   isPartitioned: boolean,
  //   partitionedField: string,
  //   options: DataQueryRequest<BigQueryQueryNG>
  // ) {
  //   partitionedField = partitionedField ? partitionedField : '_PARTITIONTIME';

  //   if (isPartitioned && !query.match(new RegExp(partitionedField, 'i'))) {
  //     const fromD = convertToUtc(options.range.from.toDate());
  //     const toD = convertToUtc(options.range.to.toDate());

  //     const from = `${partitionedField} >= '${formatDateToString(fromD, '-', true)}'`;
  //     const to = `${partitionedField} < '${formatDateToString(toD, '-', true)}'`;
  //     const partition = `where ${from} AND ${to} AND `;
  //     if (query.match(/where/i)) {
  //       query = query.replace(/where/i, partition);
  //     } else {
  //       const reg = /from ('|`|"|){1}(.*?)('|`|"|){1} as ('|`|"|)(\S*)('|`|"|){1}|from ('|`|"|){1}(\S*)('|`|"|){1}/i;
  //       const fromMatch = query.match(reg);
  //       query = query.replace(reg, `${fromMatch} ${fromMatch}`);
  //     }
  //   }
  //   return query;
  // }

  // @ts-ignore
  private async doRequest(url: string, requestId = 'requestId', maxRetries = 3) {
    return getBackendSrv()
      .fetch<BQTypes.IQueryResponse>({
        method: 'GET',
        requestId: generateID(),
        url: this.url + url,
      })
      .toPromise()
      .then((result) => {
        if (result?.status !== 200) {
          if (result && result.status >= 500 && maxRetries > 0) {
            return this.doRequest(url, requestId, maxRetries - 1);
          }
          throw formatBigqueryError((result?.data as any).error);
        }

        return result;
      });
    // TODO: fix this
    // .catch((error) => {
    //   if (error.status === 500 && maxRetries > 0) {
    //     return this.doRequest(url, requestId, maxRetries - 1);
    //   }

    //   if (error.cancelled === true) {
    //     return [];
    //   }
    //   return handleError(error);
    // });
  }

  // @ts-ignore
  // private async doQueryRequest(query: string, requestId: string, priority: QueryPriority, maxRetries = 3) {
  //   const location = this.queryModel.target.location || this.processingLocation || 'US';
  //   let data,
  //     queryiesOrJobs = 'queries';
  //   data = { priority, location, query, useLegacySql: false, useQueryCache: true }; //ExternalDataConfiguration

  //   if (priority.toUpperCase() === 'BATCH') {
  //     queryiesOrJobs = 'jobs';
  //     data = { configuration: { query: { query, priority } } };
  //   }

  //   const path = `v2/projects/${this.runInProject}/${queryiesOrJobs}`;
  //   const url = this.url + `${this.baseUrl}${path}`;

  //   return getBackendSrv()
  //     .fetch<BQTypes.IQueryResponse>({
  //       data: data,
  //       method: 'POST',
  //       requestId,
  //       url,
  //       retry: 3,
  //     })
  //     .toPromise()
  //     .then((result) => {
  //       if (result?.status !== 200) {
  //         if (result && result.status >= 500 && maxRetries > 0) {
  //           return this.doQueryRequest(query, requestId, priority, maxRetries - 1);
  //         }
  //         throw formatBigqueryError((result?.data as any).error);
  //       }
  //       return result;
  //     })
  //     .catch((error) => {
  //       if (error.status === 500 && maxRetries > 0) {
  //         return this.doQueryRequest(query, requestId, priority, maxRetries - 1);
  //       }

  //       if (error.cancelled === true) {
  //         return [];
  //       }
  //       return handleError(error);
  //     });
  // }

  // private async _waitForJobComplete(
  //   queryResults: FetchResponse<BQTypes.IQueryResponse>,
  //   requestId: string,
  //   jobId: string
  // ) {
  //   let sleepTimeMs = 100;

  //   const location = this.queryModel.target.location || this.processingLocation || 'US';
  //   const path = `v2/projects/${this.runInProject}/queries/` + jobId + '?location=' + location;
  //   while (!queryResults.data.jobComplete) {
  //     await sleep(sleepTimeMs);
  //     sleepTimeMs *= 2;
  //     queryResults = await this.doRequest(`${this.baseUrl}${path}`, requestId);
  //   }
  //   return queryResults;
  // }

  private interpolateVariable = (value: any, variable: VariableModel) => {
    if (typeof value === 'string') {
      // @ts-ignore
      if (variable.multi || variable.includeAll) {
        return quoteLiteral(value);
      } else {
        return value;
      }
    }

    if (typeof value === 'number') {
      return value;
    }

    const quotedValues = _.map(value, (v) => {
      return quoteLiteral(v);
    });
    return quotedValues.join(',');
  };

  private async paginatedResults(path: string, dataName: string) {
    let queryResults = await this.doRequest(`${this.baseUrl}${path}`);
    let data = queryResults.data;

    if (!data) {
      return data;
    }

    const dataList = dataName.split('.');
    dataList.forEach((element) => {
      if (data && data[element]) {
        data = data[element];
      }
    });

    while (queryResults && queryResults.data && queryResults.data.nextPageToken) {
      queryResults = await this.doRequest(`${this.baseUrl}${path}` + '?pageToken=' + queryResults.data.nextPageToken);
      dataList.forEach((element) => {
        data = data.concat(queryResults.data[element]);
      });
    }
    return data;
  }

  // private _updateAlias(q: string, options: any, shiftstr: string) {
  //   if (shiftstr !== undefined) {
  //     const index = shiftstr.search(SHIFTED);
  //     const shifted = shiftstr.substr(index, shiftstr.length);
  //     for (const al of options.targets[0].select[0]) {
  //       if (al.type === 'alias') {
  //         q = q.replace('AS ' + al.params[0], 'AS ' + al.params[0] + shifted);
  //         return q;
  //       }
  //     }
  //     const aliasshiftted = [options.targets[0].select[0][0].params[0] + shifted];
  //     const oldSelect = this.queryModel.buildValueColumn(options.targets[0].select[0]);
  //     const newSelect = this.queryModel.buildValueColumn([
  //       options.targets[0].select[0][0],
  //       options.targets[0].select[0][1],
  //       { type: 'alias', params: [aliasshiftted] },
  //     ]);
  //     q = q.replace(oldSelect, newSelect);
  //   }
  //   return q;
  // }

  applyTemplateVariables(queryModel: BigQueryQueryNG, scopedVars: ScopedVars): QueryModel {
    // TMP until we refactor Query Model
    const query = new BigQueryQuery(queryModel, scopedVars);
    const rawSql = query.target.rawQuery ? query.target.rawSql : query.buildQuery();

    const interpolatedSql = getTemplateSrv().replace(rawSql, scopedVars, this.interpolateVariable);
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

// async query(options: DataQueryRequest<BigQueryQueryNG>): Promise<DataQueryResponse> {
//   const queries = options.targets
//     .filter((target) => {
//       return target.hide !== true;
//     })
//     .map<BigQueryQueryNG>((target) => {
//       const queryModel = new BigQueryQuery(target, options.scopedVars);
//       this.queryModel = queryModel;

//       return {
//         queryPriority: this.queryPriority,
//         datasourceId: this.id,
//         format: target.format,
//         intervalMs: options.intervalMs,
//         maxDataPoints: options.maxDataPoints,
//         metricColumn: target.metricColumn,
//         partitioned: target.partitioned,
//         partitionedField: target.partitionedField,
//         rawSql: queryModel.render(true),
//         refId: target.refId,
//         sharded: target.sharded,
//         table: target.table,
//         timeColumn: target.timeColumn,
//         timeColumnType: target.timeColumnType,
//       };
//     });

//   if (queries.length === 0) {
//     return Promise.resolve({ data: [] });
//   }

//   queries.map((query) => {
//     const newQuery = createTimeShiftQuery(query);
//     if (newQuery) {
//       queries.push(newQuery);
//     }
//   });

//   let modOptions;

//   const allQueryPromise = queries.map((query) => {
//     const tmpQ = this.queryModel.target.rawSql;

//     if (this.queryModel.target.rawQuery === false) {
//       this.queryModel.target.metricColumn = query.metricColumn;
//       this.queryModel.target.partitioned = query.partitioned;
//       this.queryModel.target.partitionedField = query.partitionedField;
//       this.queryModel.target.rawSql = query.rawSql;
//       this.queryModel.target.sharded = query.sharded;
//       this.queryModel.target.table = query.table;
//       this.queryModel.target.timeColumn = query.timeColumn;
//       this.queryModel.target.timeColumnType = query.timeColumnType;

//       modOptions = setupTimeShiftQuery(query, options);

//       const q = this.setUpQ(modOptions, options, query);

//       this.queryModel.target.rawSql = q;

//       return this.doQuery(q, options.panelId + query.refId, query.queryPriority).then((response) => {
//         if (!response) {
//           return null;
//         }
//         return ResponseParser.parseQueryResults(response.data, query);
//       });
//     } else {
//       // Fix raw sql
//       const sqlWithNoVariables = getTemplateSrv().replace(tmpQ, options.scopedVars, this.interpolateVariable);
//       const [project, dataset, table] = extractFromClause(sqlWithNoVariables);

//       if (!project || !dataset || !table) {
//         console.error(`Unable to extract project, dataset, or table from query: ${sqlWithNoVariables}`);
//       }

//       // TODO: fix the !
//       this.getDateFields(project!, dataset!, table!)
//         .then((dateFields) => {
//           const tm = findTimeField(tmpQ, dateFields);
//           this.queryModel.target.timeColumn = tm.text;
//           this.queryModel.target.timeColumnType = tm.value;
//           this.queryModel.target.table = table;
//         })
//         .catch((err) => {
//           console.log(err);
//         });
//       this.queryModel.target.rawSql = query.rawSql;
//       modOptions = setupTimeShiftQuery(query, options);
//       const q = this.setUpQ(modOptions, options, query);

//       return this.doQuery(q!, options.panelId + query.refId, query.queryPriority).then((response) => {
//         if (!response) {
//           return null;
//         }
//         return ResponseParser.parseQueryResults(response.data, query);
//       });
//     }
//   });

//   return Promise.all(allQueryPromise).then((responses) => {
//     const data = [];

//     if (responses) {
//       for (let i = 0; i < responses.length; i++) {
//         data.push(responses[i]);
//       }
//     }

//     for (let i = 0; i < data.length; i++) {
//       const q = queries[i];

//       if (q.timeShift) {
//         const timeField = data[i]?.fields.find((f, i) => {
//           if (f.type === FieldType.time) {
//             return true;
//           }
//           return false;
//         });
//         if (timeField) {
//           const shiftPeriod = getShiftPeriod(q.timeShift);
//           timeField.values = new ArrayVector(
//             timeField.values.toArray().map((v) => dateTime(v).add(shiftPeriod[1], shiftPeriod[0]).valueOf())
//           );
//         }
//       }
//     }

//     return { data };
//   });
// }
