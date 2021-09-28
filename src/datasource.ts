import BQTypes from '@google-cloud/bigquery/build/src/types';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  VariableModel,
} from '@grafana/data';
import { BackendSrvRequest, FetchResponse, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { filter as lodashFilter, map as lodashMap } from 'lodash';
import { merge, Observable, of, timer, EMPTY, throwError } from 'rxjs';
import { map, exhaustMap, switchMapTo, expand, reduce, takeWhile, catchError } from 'rxjs/operators';
import {
  convertToUtc,
  createTimeShiftQuery,
  extractFromClause,
  findTimeField,
  formatBigqueryError,
  formatDateToString,
  quoteLiteral,
  setupTimeShiftQuery,
  SHIFTED,
  updatePartition,
  updateTableSuffix,
} from 'utils';
import { v4 as generateID } from 'uuid';
import BigQueryQuery, { BigQueryQueryNG } from './bigquery_query';
import ResponseParser, { ResultFormat } from './ResponseParser';
import { BigQueryOptions, GoogleAuthType, QueryFormat, QueryPriority } from './types';

export class BigQueryDatasource extends DataSourceApi<any, BigQueryOptions> {
  private readonly url?: string;

  private runInProject: string;
  private jsonData: BigQueryOptions;
  private responseParser: ResponseParser;
  private queryModel: BigQueryQuery;
  private processingLocation?: string;
  private queryPriority?: QueryPriority;

  authenticationType: string;
  projectName = '';

  constructor(instanceSettings: DataSourceInstanceSettings<BigQueryOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.url + '/bigquery/v2';
    this.responseParser = new ResponseParser();
    this.queryModel = new BigQueryQuery({} as any);

    this.jsonData = instanceSettings.jsonData;
    this.authenticationType = instanceSettings.jsonData.authenticationType || GoogleAuthType.JWT;

    // TODO(Zoltán): I don't like this here. We should probably get this from somewhere else.
    (async () => {
      this.projectName = instanceSettings.jsonData.defaultProject || (await this.getDefaultProject());
    })();

    // TODO: This is kind of confusing. When to use projectName and when runInProject?
    this.runInProject =
      this.jsonData.flatRateProject && this.jsonData.flatRateProject.length
        ? this.jsonData.flatRateProject
        : this.projectName;

    this.processingLocation =
      this.jsonData.processingLocation && this.jsonData.processingLocation.length
        ? this.jsonData.processingLocation
        : undefined;

    this.queryPriority = this.jsonData.queryPriority;
  }

  query(options: DataQueryRequest<BigQueryQueryNG>): Observable<DataQueryResponse> {
    const queries = lodashFilter(options.targets, (target) => {
      return target.hide !== true;
    }).map<BigQueryQueryNG>((target) => {
      const queryModel = new BigQueryQuery(target, options.scopedVars);
      this.queryModel = queryModel;

      return {
        queryPriority: this.queryPriority,
        datasourceId: this.id,
        format: target.format,
        intervalMs: options.intervalMs,
        maxDataPoints: options.maxDataPoints,
        metricColumn: target.metricColumn,
        partitioned: target.partitioned,
        partitionedField: target.partitionedField,
        rawSql: queryModel.render(true),
        refId: target.refId,
        sharded: target.sharded,
        table: target.table,
        timeColumn: target.timeColumn,
        timeColumnType: target.timeColumnType,
      };
    });

    if (queries.length === 0) {
      return of({ data: [] });
    }

    lodashMap(queries, (query) => {
      const newQuery = createTimeShiftQuery(query);
      if (newQuery) {
        queries.push(newQuery);
      }
    });

    let modOptions;
    const allQueryPromise = lodashMap(queries, (query) => {
      const tmpQ = this.queryModel.target.rawSql;

      if (this.queryModel.target.rawQuery === false) {
        this.queryModel.target.metricColumn = query.metricColumn;
        this.queryModel.target.partitioned = query.partitioned;
        this.queryModel.target.partitionedField = query.partitionedField;
        this.queryModel.target.rawSql = query.rawSql;
        this.queryModel.target.sharded = query.sharded;
        this.queryModel.target.table = query.table;
        this.queryModel.target.timeColumn = query.timeColumn;
        this.queryModel.target.timeColumnType = query.timeColumnType;

        modOptions = setupTimeShiftQuery(query, options);

        const q = this.setUpQ(modOptions, options, query);

        this.queryModel.target.rawSql = q;

        return this.doQuery(q, options.panelId + query.refId, query.queryPriority).pipe(
          map((response) => {
            if (!response) {
              return { data: [] };
            }
            return { data: [ResponseParser.parseQueryResults(response.data, query)] };
          })
        );
      } else {
        // Fix raw sql
        const sqlWithNoVariables = getTemplateSrv().replace(tmpQ, options.scopedVars, this.interpolateVariable);
        const [project, dataset, table] = extractFromClause(sqlWithNoVariables);

        if (!project || !dataset || !table) {
          console.error(`Unable to extract project, dataset, or table from query: ${sqlWithNoVariables}`);
        }

        // TODO: fix the !
        this.getDateFields(project!, dataset!, table!)
          .then((dateFields) => {
            const tm = findTimeField(tmpQ, dateFields);
            this.queryModel.target.timeColumn = tm.text;
            this.queryModel.target.timeColumnType = tm.value;
            this.queryModel.target.table = table;
          })
          .catch((err) => {
            console.log(err);
          });
        this.queryModel.target.rawSql = query.rawSql;
        modOptions = setupTimeShiftQuery(query, options);
        const q = this.setUpQ(modOptions, options, query);

        return this.doQuery(q, options.panelId + query.refId, query.queryPriority).pipe(
          map((response) => {
            return { data: [ResponseParser.parseQueryResults(response.data, query)] };
          })
        );
      }
    });

    //     for (const d of data) {
    //       if (typeof d.target !== 'undefined' && d.target.search(SHIFTED) > -1) {
    //         const res = getShiftPeriod(d.target.substring(d.target.lastIndexOf('_') + 1, d.target.length));

    //         const shiftPeriod = res[0];
    //         const shiftVal = parseInt(res[1], 10);

    //         for (let i = 0; i < d.datapoints.length; i++) {
    //           d.datapoints[i][1] = dateTime(d.datapoints[i][1]).subtract(shiftVal, shiftPeriod).valueOf();
    //         }
    //       }
    //     }

    //     return { data };
    //   })
    // );
    return merge(...allQueryPromise);
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

    const metricData = await this.doQuery(interpolatedQuery.rawSql, refId).toPromise();
    if (!metricData.data?.rows) {
      return [];
    }
    return ResponseParser.toVar(metricData);
  }

  async testDatasource() {
    let status = 'success';
    let message = 'Successfully queried the BigQuery API.';
    const defaultErrorMessage = 'Cannot connect to BigQuery API';

    if (!this.projectName) {
      await this.getDefaultProject();
    }

    try {
      const path = `/projects/${this.projectName}/datasets`;
      const response = await this.doRequest(path).toPromise();
      if (response.status !== 200) {
        status = 'error';
        message = response.statusText ? response.statusText : defaultErrorMessage;
      }
    } catch (error) {
      message = (error as any).statusText ? (error as any).statusText : defaultErrorMessage;
    }

    try {
      const path = `/projects/${this.projectName}/jobs/no-such-jobs`;
      const response = await this.doRequest(path).toPromise();
      if (response.status !== 200) {
        status = 'error';
        message = response.statusText ? response.statusText : defaultErrorMessage;
      }
    } catch (error) {
      if ((error as any).status !== 404) {
        message = (error as any).statusText ? (error as any).statusText : defaultErrorMessage;
      }
    }
    return {
      message,
      status,
    };
  }

  async getProjects(): Promise<ResultFormat[]> {
    const path = `/projects`;
    const data: BQTypes.IProjectList['projects'] = await this.paginatedResults(path, 'projects').toPromise();
    return ResponseParser.parseProjects(data);
  }

  async getDatasets(projectName: string): Promise<ResultFormat[]> {
    const path = `/projects/${projectName}/datasets`;
    const data: BQTypes.IDatasetList['datasets'] = await this.paginatedResults(path, 'datasets').toPromise();
    return ResponseParser.parseDatasets(data);
  }

  async getTables(projectName: string, datasetName: string): Promise<ResultFormat[]> {
    const path = `/projects/${projectName}/datasets/${datasetName}/tables`;
    const data: BQTypes.ITableList['tables'] = await this.paginatedResults(path, 'tables').toPromise();
    return this.responseParser.parseTables(data);
  }

  async getTableFields(
    projectName: string,
    datasetName: string,
    tableName: string,
    filter: string[]
  ): Promise<ResultFormat[]> {
    const path = `/projects/${projectName}/datasets/${datasetName}/tables/${tableName}`;
    const { data } = await this.doRequest<BQTypes.ITable>(path).toPromise();
    return ResponseParser.parseTableFields(data.schema?.fields, filter);
  }

  async getDateFields(projectName: string, datasetName: string, tableName: string) {
    return this.getTableFields(projectName, datasetName, tableName, ['DATE', 'TIMESTAMP', 'DATETIME']);
  }

  async getDefaultProject() {
    try {
      if (this.authenticationType === 'gce' || !this.projectName) {
        const data = await this.getProjects();
        this.projectName = data[0].value;
        if (!this.runInProject) {
          this.runInProject = this.projectName;
        }
        return data[0].value;
      } else {
        return this.projectName;
      }
    } catch (error) {
      return (this.projectName = '');
    }
  }

  async annotationQuery(options: any) {
    const path = `/projects/${this.runInProject}/queries`;
    const url = this.url + `${path}`;
    if (!options.annotation.rawQuery) {
      return Promise.reject({
        message: 'Query missing in annotation definition',
      });
    }
    const rawSql = getTemplateSrv().replace(options.annotation.rawQuery, options.scopedVars, this.interpolateVariable);

    const query = {
      // datasourceId: this.id,
      format: QueryFormat.Table,
      rawSql,
      refId: options.annotation.name,
    } as BigQueryQueryNG;

    this.queryModel.target.rawSql = query.rawSql;
    query.rawSql = this.queryModel.expend_macros(options);

    return getBackendSrv()
      .fetch({
        data: {
          priority: this.queryPriority,
          from: options.range.from.valueOf().toString(),
          query: query.rawSql,
          to: options.range.to.valueOf().toString(),
          useLegacySql: false,
          useQueryCache: true,
        },
        method: 'POST',
        requestId: options.annotation.name,
        url,
      })
      .pipe(
        map(async (res: FetchResponse) => {
          return await this.responseParser.transformAnnotationResponse(options, res);
        })
      )
      .toPromise();
  }

  private setUpQ(modOptions: any, options: DataQueryRequest<BigQueryQueryNG>, query: BigQueryQueryNG) {
    let q = this.queryModel.expend_macros(modOptions);

    if (q) {
      q = this.setUpPartition(q, Boolean(query.partitioned), query.partitionedField || '', modOptions);
      q = updatePartition(q, modOptions);
      q = updateTableSuffix(q, modOptions);

      if (query.refId.search(SHIFTED) > -1) {
        // TODO: get rid of !
        q = this._updateAlias(q!, modOptions, query.refId);
      }

      const limit = q?.match(/[^]+(\bLIMIT\b)/gi);

      if (limit == null) {
        const limitStatement = ' LIMIT ' + options.maxDataPoints;
        const limitPosition = q?.match(/\$__limitPosition/g);

        if (limitPosition !== null) {
          q = q?.replace(/\$__limitPosition/g, limitStatement);
        } else {
          q += limitStatement;
        }
      }
    }
    return q;
  }

  /**
   * Add partition to query unless it has one
   * @param query
   * @param isPartitioned
   * @param partitionedField
   * @param options
   */
  private setUpPartition(
    query: string,
    isPartitioned: boolean,
    partitionedField: string,
    options: DataQueryRequest<BigQueryQueryNG>
  ) {
    partitionedField = partitionedField ? partitionedField : '_PARTITIONTIME';

    if (isPartitioned && !query.match(new RegExp(partitionedField, 'i'))) {
      const fromD = convertToUtc(options.range.from.toDate());
      const toD = convertToUtc(options.range.to.toDate());

      const from = `${partitionedField} >= '${formatDateToString(fromD, '-', true)}'`;
      const to = `${partitionedField} < '${formatDateToString(toD, '-', true)}'`;
      const partition = `where ${from} AND ${to} AND `;
      if (query.match(/where/i)) {
        query = query.replace(/where/i, partition);
      } else {
        const reg = /from ('|`|"|){1}(.*?)('|`|"|){1} as ('|`|"|)(\S*)('|`|"|){1}|from ('|`|"|){1}(\S*)('|`|"|){1}/i;
        const fromMatch = query.match(reg);
        query = query.replace(reg, `${fromMatch} ${fromMatch}`);
      }
    }
    return query;
  }

  private doRequest<T = any>(apiUrl: string, requestId = generateID(), maxRetries = 3): Observable<FetchResponse<T>> {
    const url = this.url + apiUrl;
    const options: BackendSrvRequest = {
      url,
      method: 'GET',
      requestId,
      retry: maxRetries,
      hideFromInspector: true,
    } as BackendSrvRequest;
    return getBackendSrv()
      .fetch<T>(options)
      .pipe(catchError((err) => throwError(() => formatBigqueryError(err))));
    // TODO: fix this
    // .then((result) => {
    //   if (result.status !== 200) {
    //     if (result.status >= 500 && maxRetries > 0) {
    //       return this.doRequest(url, requestId, maxRetries - 1);
    //     }
    //     throw formatBigqueryError((result.data as any).error);
    //   };
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

  private createJob(query: string, requestId: string, priority: QueryPriority) {
    const data: BQTypes.IJob = { configuration: { query: { query, priority } } };
    const path = `/projects/${this.runInProject}/jobs`;
    const url = this.url + `${path}`;
    return getBackendSrv().fetch<BQTypes.IJob>({
      data,
      method: 'POST',
      requestId,
      url,
    });
  }

  private doQuery(query: string, requestId: string, priority = QueryPriority.Interactive) {
    const location = this.queryModel.target.location || this.processingLocation || 'US';
    // TODO: What is this?
    let notReady = false;

    ['-- time --', '-- value --'].forEach((element) => {
      if (query.indexOf(element) !== -1) {
        notReady = true;
      }
    });

    if (notReady) {
      return of({
        data: {},
      }) as Observable<FetchResponse<BQTypes.IQueryResponse>>;
    }

    return this.createJob(query, requestId, priority).pipe(
      exhaustMap((jobResponse) =>
        timer(0, 500).pipe(
          switchMapTo(
            this.doRequest<BQTypes.IQueryResponse>(
              `/projects/${this.runInProject}/queries/${jobResponse.data.jobReference?.jobId}?location=${location}`,
              requestId
            )
          ),
          takeWhile((value) => !Boolean(value.data.jobComplete), true)
        )
      )
    );
  }

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

    const quotedValues = lodashMap(value, (v) => {
      return quoteLiteral(v);
    });
    return quotedValues.join(',');
  };

  private paginatedResults(path: string, property: string) {
    return this.doRequest<PaginatedResult | BQTypes.IQueryResponse>(path).pipe(
      expand((res) => {
        let nextPageToken: string | undefined;
        if ('pageToken' in res.data) {
          nextPageToken = res.data.pageToken;
        }
        if ('nextPageToken' in res.data) {
          nextPageToken = res.data.nextPageToken;
        }

        if (!nextPageToken) {
          return EMPTY;
        }
        return this.doRequest<PaginatedResult>(this.addPageTokenToURL(path, nextPageToken));
      }),
      //TODO: Figure out proper typing here
      reduce((acc, res) => acc.concat((res.data as any)[property]), [])
    );
  }

  private addPageTokenToURL(path: string, token?: string) {
    return `${path}${path.includes('?') ? '&' : '?'}pageToken=${token}`;
  }

  private _updateAlias(q: string, options: any, shiftstr: string) {
    if (shiftstr !== undefined) {
      const index = shiftstr.search(SHIFTED);
      const shifted = shiftstr.substr(index, shiftstr.length);
      for (const al of options.targets[0].select[0]) {
        if (al.type === 'alias') {
          q = q.replace('AS ' + al.params[0], 'AS ' + al.params[0] + shifted);
          return q;
        }
      }
      const aliasshiftted = [options.targets[0].select[0][0].params[0] + shifted];
      const oldSelect = this.queryModel.buildValueColumn(options.targets[0].select[0]);
      const newSelect = this.queryModel.buildValueColumn([
        options.targets[0].select[0][0],
        options.targets[0].select[0][1],
        { type: 'alias', params: [aliasshiftted] },
      ]);
      q = q.replace(oldSelect, newSelect);
    }
    return q;
  }
}

type PaginatedResult = BQTypes.ITableList | BQTypes.IProjectList | BQTypes.IDatasetList | BQTypes.IJobList;
