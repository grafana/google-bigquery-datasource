import _ from 'lodash';
import moment from 'moment';
import BigQueryQuery from './bigquery_query';
import { map } from 'rxjs/operators';
import ResponseParser, { IResultFormat } from './ResponseParser';
import { BigQueryOptions, GoogleAuthType } from './types';
import { v4 as generateID } from 'uuid';
import { DataSourceApi, DataSourceInstanceSettings } from '@grafana/data';
import { FetchResponse, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import {
  convertToUtc,
  createTimeShiftQuery,
  extractFromClause,
  findTimeField,
  formatBigqueryError,
  formatDateToString,
  getShiftPeriod,
  handleError,
  quoteLiteral,
  setupTimeShiftQuery,
  updatePartition,
  updateTableSuffix,
  SHIFTED,
} from 'utils';

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export class BigQueryDatasource extends DataSourceApi<any, BigQueryOptions> {
  private readonly baseUrl: string;
  private readonly url: string;

  private runInProject: string;
  private jsonData: BigQueryOptions;
  private responseParser: ResponseParser;
  private queryModel: BigQueryQuery;
  private processingLocation: string;
  private queryPriority: string;

  authenticationType: string;
  projectName: string;

  constructor(instanceSettings: DataSourceInstanceSettings<BigQueryOptions>) {
    super(instanceSettings);

    this.baseUrl = `/bigquery/`;
    this.url = instanceSettings.url;
    this.responseParser = new ResponseParser();
    this.queryModel = new BigQueryQuery({});

    this.jsonData = instanceSettings.jsonData;
    this.authenticationType = instanceSettings.jsonData.authenticationType || GoogleAuthType.JWT;

    (async () => {
      this.projectName = instanceSettings.jsonData.defaultProject || (await this.getDefaultProject());
    })();

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

  async query(options) {
    const queries = _.filter(options.targets, target => {
      return target.hide !== true;
    }).map(target => {
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
        rawSql: queryModel.render(this.interpolateVariable),
        refId: target.refId,
        sharded: target.sharded,
        table: target.table,
        timeColumn: target.timeColumn,
        timeColumnType: target.timeColumnType,
      };
    });

    if (queries.length === 0) {
      return Promise.resolve({ data: [] });
    }
    _.map(queries, query => {
      const newQuery = createTimeShiftQuery(query);
      if (newQuery) {
        queries.push(newQuery);
      }
    });
    let modOptions;
    const allQueryPromise = _.map(queries, query => {
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
        console.log(q);
        this.queryModel.target.rawSql = q;
        return this.doQuery(q, options.panelId + query.refId, query.queryPriority).then(response => {
          return ResponseParser.parseDataQuery(response, query.format);
        });
      } else {
        // Fix raw sql
        const sqlWithNoVariables = getTemplateSrv().replace(tmpQ, options.scopedVars, this.interpolateVariable);
        const [project, dataset, table] = extractFromClause(sqlWithNoVariables);
        this.getDateFields(project, dataset, table)
          .then(dateFields => {
            const tm = findTimeField(tmpQ, dateFields);
            this.queryModel.target.timeColumn = tm.text;
            this.queryModel.target.timeColumnType = tm.value;
            this.queryModel.target.table = table;
          })
          .catch(err => {
            console.log(err);
          });
        this.queryModel.target.rawSql = query.rawSql;
        modOptions = setupTimeShiftQuery(query, options);
        const q = this.setUpQ(modOptions, options, query);
        // console.log(q);
        return this.doQuery(q, options.panelId + query.refId, query.queryPriority).then(response => {
          return ResponseParser.parseDataQuery(response, query.format);
        });
      }
    });
    return Promise.all(allQueryPromise).then((responses): any => {
      const data = [];
      if (responses) {
        for (const response of responses) {
          if (response.type && response.type === 'table') {
            data.push(response);
          } else {
            for (const dp of response) {
              data.push(dp);
            }
          }
        }
      }
      for (const d of data) {
        if (typeof d.target !== 'undefined' && d.target.search(SHIFTED) > -1) {
          const res = getShiftPeriod(d.target.substring(d.target.lastIndexOf('_') + 1, d.target.length));
          const shiftPeriod = res[0];
          const shiftVal = res[1];
          for (let i = 0; i < d.datapoints.length; i++) {
            d.datapoints[i][1] = moment(d.datapoints[i][1])
              .subtract(shiftVal, shiftPeriod)
              .valueOf();
          }
        }
      }
      return { data };
    });
  }

  metricFindQuery(query, optionalOptions) {
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
    return this.doQuery(interpolatedQuery.rawSql, refId, query.queryPriority).then(metricData =>
      ResponseParser.parseDataQuery(metricData, 'var')
    );
  }

  async testDatasource() {
    let status = 'success';
    let message = 'Successfully queried the BigQuery API.';
    const defaultErrorMessage = 'Cannot connect to BigQuery API';
    if (!this.projectName) {
      try {
        await this.getDefaultProject();
      } catch (error) {
        message = error.statusText ? error.statusText : defaultErrorMessage;
      }
    }
    try {
      const path = `v2/projects/${this.projectName}/datasets`;
      const response = await this.doRequest(`${this.baseUrl}${path}`);
      if (response.status !== 200) {
        status = 'error';
        message = response.statusText ? response.statusText : defaultErrorMessage;
      }
    } catch (error) {
      message = error.statusText ? error.statusText : defaultErrorMessage;
    }
    try {
      const path = `v2/projects/${this.projectName}/jobs/no-such-jobs`;
      const response = await this.doRequest(`${this.baseUrl}${path}`);
      if (response.status !== 200) {
        status = 'error';
        message = response.statusText ? response.statusText : defaultErrorMessage;
      }
    } catch (error) {
      if (error.status !== 404) {
        message = error.statusText ? error.statusText : defaultErrorMessage;
      }
    }
    return {
      message,
      status,
    };
  }

  async getProjects(): Promise<IResultFormat[]> {
    const path = `v2/projects`;
    const data = await this.paginatedResults(path, 'projects');
    return ResponseParser.parseProjects(data);
  }

  async getDatasets(projectName): Promise<IResultFormat[]> {
    const path = `v2/projects/${projectName}/datasets`;
    const data = await this.paginatedResults(path, 'datasets');
    return ResponseParser.parseDatasets(data);
  }

  async getTables(projectName: string, datasetName: string): Promise<IResultFormat[]> {
    const path = `v2/projects/${projectName}/datasets/${datasetName}/tables`;
    const data = await this.paginatedResults(path, 'tables');
    return new ResponseParser().parseTabels(data);
  }

  async getTableFields(projectName: string, datasetName: string, tableName: string, filter): Promise<IResultFormat[]> {
    const path = `v2/projects/${projectName}/datasets/${datasetName}/tables/${tableName}`;
    const data = await this.paginatedResults(path, 'schema.fields');
    return ResponseParser.parseTableFields(data, filter);
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

  async annotationQuery(options) {
    const path = `v2/projects/${this.runInProject}/queries`;
    const url = this.url + `${this.baseUrl}${path}`;
    if (!options.annotation.rawQuery) {
      return Promise.reject({
        message: 'Query missing in annotation definition',
      });
    }
    const rawSql = getTemplateSrv().replace(options.annotation.rawQuery, options.scopedVars, this.interpolateVariable);

    const query = {
      datasourceId: this.id,
      format: 'table',
      rawSql,
      refId: options.annotation.name,
    };
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
          const result = await this.responseParser.transformAnnotationResponse(options, res);
          return result;
        })
      )
      .toPromise();
  }

  private setUpQ(modOptions, options, query) {
    let q = this.queryModel.expend_macros(modOptions);
    if (q) {
      q = this.setUpPartition(q, query.partitioned, query.partitionedField, modOptions);
      q = updatePartition(q, modOptions);
      q = updateTableSuffix(q, modOptions);
      if (query.refId.search(SHIFTED) > -1) {
        q = this._updateAlias(q, modOptions, query.refId);
      }
      const limit = q.match(/[^]+(\bLIMIT\b)/gi);
      if (limit == null) {
        const limitStatement = ' LIMIT ' + options.maxDataPoints;
        const limitPosition = q.match(/\$__limitPosition/g);
        if (limitPosition !== null) {
          q = q.replace(/\$__limitPosition/g, limitStatement);
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
  private setUpPartition(query, isPartitioned, partitionedField, options) {
    partitionedField = partitionedField ? partitionedField : '_PARTITIONTIME';
    if (isPartitioned && !query.match(new RegExp(partitionedField, 'i'))) {
      const fromD = convertToUtc(options.range.from._d);
      const toD = convertToUtc(options.range.to._d);
      const from = `${partitionedField} >= '${formatDateToString(fromD, '-', true)}'`;
      const to = `${partitionedField} < '${formatDateToString(toD, '-', true)}'`;
      const partition = `where ${from} AND ${to} AND `;
      if (query.match(/where/i)) query = query.replace(/where/i, partition);
      else {
        const reg = /from ('|`|"|){1}(.*?)('|`|"|){1} as ('|`|"|)(\S*)('|`|"|){1}|from ('|`|"|){1}(\S*)('|`|"|){1}/i;
        const fromMatch = query.match(reg);
        query = query.replace(reg, `${fromMatch} ${fromMatch}`);
      }
    }
    return query;
  }

  private async doRequest(url, requestId = 'requestId', maxRetries = 3) {
    return getBackendSrv()
      .fetch({
        method: 'GET',
        requestId: generateID(),
        url: this.url + url,
      })
      .toPromise()
      .then(result => {
        if (result.status !== 200) {
          if (result.status >= 500 && maxRetries > 0) {
            return this.doRequest(url, requestId, maxRetries - 1);
          }
          throw formatBigqueryError((result.data as any).error);
        }
        return result;
      })
      .catch(error => {
        if (maxRetries > 0) {
          return this.doRequest(url, requestId, maxRetries - 1);
        }
        if (error.cancelled === true) {
          return [];
        }
        return handleError(error);
      });
  }

  private async doQueryRequest(query, requestId, priority, maxRetries = 3) {
    const location = this.queryModel.target.location || this.processingLocation || 'US';
    let data,
      queryiesOrJobs = 'queries';
    data = { priority: priority, location, query, useLegacySql: false, useQueryCache: true }; //ExternalDataConfiguration
    if (priority.toUpperCase() === 'BATCH') {
      queryiesOrJobs = 'jobs';
      data = { configuration: { query: { query, priority } } };
    }
    const path = `v2/projects/${this.runInProject}/${queryiesOrJobs}`;
    const url = this.url + `${this.baseUrl}${path}`;
    return getBackendSrv()
      .fetch({
        data: data,
        method: 'POST',
        requestId,
        url,
      }).toPromise()
      .then(result => {
        if (result.status !== 200) {
          if (result.status >= 500 && maxRetries > 0) {
            return this.doQueryRequest(query, requestId, priority, maxRetries - 1);
          }
          throw formatBigqueryError((result.data as any).error);
        }
        return result;
      })
      .catch(error => {
        if (maxRetries > 0) {
          return this.doQueryRequest(query, requestId, priority, maxRetries - 1);
        }
        if (error.cancelled === true) {
          return [];
        }
        return handleError(error);
      });
  }
  private async _waitForJobComplete(queryResults, requestId, jobId) {
    let sleepTimeMs = 100;
    const location = this.queryModel.target.location || this.processingLocation || 'US';
    const path = `v2/projects/${this.runInProject}/queries/` + jobId + '?location=' + location;
    while (!queryResults.data.jobComplete) {
      await sleep(sleepTimeMs);
      sleepTimeMs *= 2;
      queryResults = await this.doRequest(`${this.baseUrl}${path}`, requestId);
    }
    return queryResults;
  }

  private async _getQueryResults(queryResults, rows, requestId, jobId) {
    while (queryResults.data.pageToken) {
      const location = this.queryModel.target.location || this.processingLocation || 'US';
      const path =
        `v2/projects/${this.runInProject}/queries/` +
        jobId +
        '?pageToken=' +
        queryResults.data.pageToken +
        '&location=' +
        location;
      queryResults = await this.doRequest(`${this.baseUrl}${path}`, requestId);
      if (queryResults.length === 0) {
        return rows;
      }
      rows = rows.concat(queryResults.data.rows);
    }
    return rows;
  }

  private async doQuery(query, requestId, priority = 'INTERACTIVE') {
    if (!query) {
      return {
        rows: null,
        schema: null,
      };
    }
    let notReady = false;
    ['-- time --', '-- value --'].forEach(element => {
      if (query.indexOf(element) !== -1) {
        notReady = true;
      }
    });
    if (notReady) {
      return {
        rows: null,
        schema: null,
      };
    }
    let queryResults = await this.doQueryRequest(
      //"tableDefinitions": {
      //   string: {
      //     object (ExternalDataConfiguration)
      //   },
      //   ...
      // },
      query,
      requestId,
      priority
    );
    if (queryResults.length === 0) {
      return {
        rows: null,
        schema: null,
      };
    }
    const jobId = queryResults.data.jobReference.jobId;
    queryResults = await this._waitForJobComplete(queryResults, requestId, jobId);
    if (queryResults.length === 0) {
      return {
        rows: null,
        schema: null,
      };
    }
    let rows = queryResults.data.rows;
    const schema = queryResults.data.schema;
    rows = await this._getQueryResults(queryResults, rows, requestId, jobId);
    return {
      rows,
      schema,
    };
  }

  private interpolateVariable = (value, variable) => {
    if (typeof value === 'string') {
      if (variable.multi || variable.includeAll) {
        return quoteLiteral(value);
      } else {
        return value;
      }
    }

    if (typeof value === 'number') {
      return value;
    }

    const quotedValues = _.map(value, v => {
      return quoteLiteral(v);
    });
    return quotedValues.join(',');
  };

  private async paginatedResults(path, dataName) {
    let queryResults = await this.doRequest(`${this.baseUrl}${path}`);
    let data = queryResults.data;
    if (!data) return data;
    const dataList = dataName.split('.');
    dataList.forEach(element => {
      if (data && data[element]) data = data[element];
    });
    while (queryResults && queryResults.data && queryResults.data.nextPageToken) {
      queryResults = await this.doRequest(`${this.baseUrl}${path}` + '?pageToken=' + queryResults.data.nextPageToken);
      dataList.forEach(element => {
        data = data.concat(queryResults.data[element]);
      });
    }
    return data;
  }

  private _updateAlias(q, options, shiftstr) {
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
