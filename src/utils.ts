// # MIT License
// ## Copyright (c) 2019 DoiT International
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
import { DataQueryRequest } from '@grafana/data';
import { EditorMode } from '@grafana/plugin-ui';
import { config } from '@grafana/runtime';
import { BigQueryAPI } from 'api';
import { BigQueryDatasource } from 'datasource';
import SqlParser from 'sql_parser';
import { BigQueryQueryNG, QueryFormat } from 'types';
import { createFunctionField, setGroupByField } from 'utils/sql.utils';

export function formatBigqueryError(error: any) {
  let message = 'BigQuery: ';
  let status = '';
  let data = '';
  if (error !== undefined) {
    message += error.message ? error.message : 'Cannot connect to BigQuery API';
    status = error.code;
    data = error.errors[0].reason + ': ' + error.message;
  }
  return {
    data: {
      message: data,
    },
    status,
    statusText: message,
  };
}

export function extractFromClause(sql: string) {
  return SqlParser.getProjectDatasetTableFromSql(sql);
}

export function handleError(error: any) {
  if (error.cancelled === true) {
    return [];
  }
  let msg = error;
  if (error.data !== undefined) {
    msg = error.data.error;
  }
  throw formatBigqueryError(msg);
}

export function updatePartition(q: string, options: DataQueryRequest<BigQueryQueryNG>) {
  if (q.indexOf('AND _PARTITIONTIME >= ') < 1) {
    return q;
  }
  if (q.indexOf('AND _PARTITIONTIME <') < 1) {
    return q;
  }
  const from = q.substring(q.indexOf('AND _PARTITIONTIME >= ') + 22, 21);

  const newFrom = "'" + formatDateToString(options.range.from.toDate(), '-', true) + "'";
  q = q.replace(from, newFrom);
  const to = q.substring(q.indexOf('AND _PARTITIONTIME < ') + 21, 21);
  const newTo = "'" + formatDateToString(options.range.to.toDate(), '-', true) + "'";

  q = q.replace(to, newTo) + '\n ';
  return q;
}

export function updateTableSuffix(q: string, options: DataQueryRequest<BigQueryQueryNG>) {
  const ind = q.indexOf('AND  _TABLE_SUFFIX BETWEEN ');
  if (ind < 1) {
    return q;
  }
  const from = q.substring(ind + 28, 8);

  const newFrom = formatDateToString(options.range.from.toDate());
  q = q.replace(from, newFrom);
  const to = q.substring(ind + 43, 8);
  const newTo = formatDateToString(options.range.to.toDate());
  q = q.replace(to, newTo) + '\n ';
  return q;
}

// query utils
export function quoteLiteral(value: any) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

export function escapeLiteral(value: any) {
  return String(value).replace(/'/g, "''");
}

export function quoteFiledName(value: string) {
  const values = value.split('.');
  let res = '';
  for (let i = 0; i < values.length; i++) {
    res = res + '`' + String(values[i]) + '`';
    if (values.length > 1 && i + 1 < values.length) {
      res = res + '.';
    }
  }
  return res;
}

export function formatDateToString(inputDate: Date, separator = '', addTime = false) {
  const date = new Date(inputDate);
  // 01, 02, 03, ... 29, 30, 31
  const DD = (date.getDate() < 10 ? '0' : '') + date.getDate();
  // 01, 02, 03, ... 10, 11, 12
  const MM = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
  // 1970, 1971, ... 2015, 2016, ...
  const YYYY = date.getFullYear();

  // create the format you want
  let dateStr = YYYY + separator + MM + separator + DD;
  if (addTime === true) {
    dateStr += ' ' + date.toTimeString().substring(0, 8);
  }
  return dateStr;
}

export function getInterval(q: string, alias: boolean) {
  const interval: string[] = [];
  const res = alias
    ? q.match(/(\$__timeGroupAlias\(([\w._]+,)).*?(?=\))/g)
    : q.match(/(\$__timeGroup\(([\w_.]+,)).*?(?=\))/g);
  if (res) {
    interval[0] = res[0].split(',')[1] ? res[0].split(',')[1].trim() : res[0].split(',')[1];
    interval[1] = res[0].split(',')[2] ? res[0].split(',')[2].trim() : res[0].split(',')[2];
  }
  return interval;
}

export function convertToUtc(d: Date) {
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
}

export function applyQueryDefaults(q: BigQueryQueryNG, ds: BigQueryDatasource, apiClient?: BigQueryAPI) {
  let editorMode = q.editorMode || EditorMode.Builder;

  // Switching to code editor if the query was created before visual query builder was introduced.
  if (q.editorMode === undefined && q.rawSql !== undefined) {
    editorMode = EditorMode.Code;
  }

  const result = {
    ...q,
    project: q.project || apiClient?.getDefaultProject() || '',
    location: q.location ?? (ds.jsonData.processingLocation || ''),
    format: q.format !== undefined ? q.format : QueryFormat.Table,
    rawSql: q.rawSql || '',
    editorMode,
    sql: q.sql || {
      columns: [createFunctionField()],
      groupBy: [setGroupByField()],
      limit: 50,
    },
  };

  return result;
}

export const isQueryValid = (q: BigQueryQueryNG) => {
  return Boolean(q.rawSql);
};

let datasourceId: string;

export function setDatasourceId(instance: string) {
  datasourceId = instance;
}

export function getDatasourceId(): string {
  return datasourceId;
}

/**
 * Checks if the current Grafana instance is running on cloud
 * Uses namespace to determine deployment type:
 * - Cloud instances use namespace format: `stacks-{stackId}`
 * - On-prem instances use org-based namespace format: `org-{orgId}` or similar
 *
 * @returns true if the instance is cloud, false if it's on-premise
 */
export function isCloud() {
  const namespace = config.namespace;

  return namespace.startsWith('stacks-');
}

let idCounter = 0;

/**
 * Generates a unique id, optionally prefixed. Mirrors lodash's `uniqueId`.
 */
export function uniqueId(prefix = ''): string {
  return `${prefix}${++idCounter}`;
}
