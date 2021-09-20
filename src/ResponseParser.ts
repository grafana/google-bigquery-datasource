import { MetricFindValue, TableData, TimeSeries } from '@grafana/data';
import BQTypes from '@google-cloud/bigquery/build/src/types';
import _ from 'lodash';
import { FetchResponse } from '@grafana/runtime';

// API interfaces
export interface ResultFormat {
  text: string;
  value: string;
}

export interface DataTarget {
  target: string;
  datapoints: any[];
  refId: string;
  query: any;
}

export default class ResponseParser {
  static parseProjects(results: BQTypes.IProjectList['projects']): ResultFormat[] {
    return ResponseParser.parseData(results, 'id', 'id');
  }

  static parseDatasets(results: BQTypes.IDatasetList['datasets']): ResultFormat[] {
    return ResponseParser.parseData(results, 'datasetReference.datasetId', 'datasetReference.datasetId');
  }

  static parseTableFields(results: BQTypes.ITableFieldSchema[], filter: string[]): ResultFormat[] {
    const fields: ResultFormat[] = [];
    if (!results || results.length === 0) {
      return fields;
    }
    const res: ResultFormat[] = [];

    results = ResponseParser._handleRecordFields(results, res);

    for (const fl of results) {
      if (filter.length > 0) {
        for (const flt of filter) {
          if (flt === fl.type) {
            fields.push({
              text: fl.name!,
              value: fl.type!,
            });
          }
        }
      } else {
        fields.push({
          text: fl.name!,
          value: fl.type!,
        });
      }
    }
    return fields;
  }

  static parseDataQuery(results: BQTypes.IQueryResponse, format: string) {
    if (!results.rows || !results.schema) {
      return [{ data: [] }];
    }

    let res = null;

    if (format === 'time_series') {
      res = ResponseParser._toTimeSeries(results);
    }
    if (format === 'table') {
      res = ResponseParser._toTable(results);
    }

    if (format === 'var') {
      res = ResponseParser.toVar(results);
    }
    if (res === null) {
      res = [];
    }
    return res;
  }

  static _convertValues(value: any, type: string) {
    if (['INT64', 'NUMERIC', 'FLOAT64', 'FLOAT', 'INT', 'INTEGER'].includes(type)) {
      return Number(value);
    }
    if (['TIMESTAMP'].includes(type)) {
      return new Date(Number(value) * 1000).toString();
    }
    //  No casting is required for types: DATE, DATETIME, TIME
    return value;
  }

  private static parseData(results: any[] | undefined, text: string, value: string): ResultFormat[] {
    const data: ResultFormat[] = [];

    if (!results || results.length === 0) {
      return data;
    }
    const objectTextList = text.split('.');
    const objectValueList = value.split('.');
    let itemValue;
    let itemText;
    for (let item of results) {
      item = ResponseParser.manipulateItem(item);
      itemText = item[objectTextList[0]];
      itemValue = item[objectValueList[0]];
      for (let i = 1; i < objectTextList.length; i++) {
        itemText = itemText[objectTextList[i]];
      }
      for (let i = 1; i < objectValueList.length; i++) {
        itemValue = itemValue[objectValueList[i]];
      }

      data.push({ text: itemText, value: itemValue });
    }
    return data;
  }

  private static manipulateItem(item: any) {
    if (item.kind === 'bigquery#table' && item.timePartitioning) {
      item.tableReference.tableId = item.tableReference.tableId + '__partitioned';
      if (item.timePartitioning.field) {
        item.tableReference.tableId += '__' + item.timePartitioning.field;
      }
    }
    return item;
  }

  private static _handleRecordFields(results: BQTypes.ITableFieldSchema[], res: any[]) {
    for (const fl of results) {
      if (fl.type === 'RECORD' && fl.fields) {
        for (const f of fl.fields) {
          if (f.type !== 'RECORD') {
            res.push({ name: fl.name + '.' + f.name, type: f.type });
          } else {
            if (f.fields) {
              for (const ff of f.fields) {
                ff.name = fl.name + '.' + f.name + '.' + ff.name;
              }
              res = ResponseParser._handleRecordFields(f.fields, res);
            }
          }
        }
      } else {
        res.push({ name: fl.name, type: fl.type });
      }
    }
    return res;
  }
  private static _toTimeSeries(results: BQTypes.IQueryResponse) {
    let timeIndex = -1;
    let metricIndex = -1;
    const valueIndexes = [];
    for (let i = 0; i < results.schema!.fields!.length; i++) {
      if (timeIndex === -1 && ['DATE', 'TIMESTAMP', 'DATETIME'].includes(results.schema!.fields![i].type!)) {
        timeIndex = i;
      }
      if (metricIndex === -1 && results.schema!.fields![i].name === 'metric') {
        metricIndex = i;
      }
      if (['INT64', 'NUMERIC', 'FLOAT64', 'FLOAT', 'INT', 'INTEGER'].includes(results.schema!.fields![i].type!)) {
        valueIndexes.push(i);
      }
    }
    if (timeIndex === -1) {
      throw new Error('No datetime column found in the result. The Time Series format requires a time column.');
    }
    return ResponseParser._buildDataPoints(results, timeIndex, metricIndex, valueIndexes);
  }

  private static _buildDataPoints(
    results: BQTypes.IQueryResponse,
    timeIndex: number,
    metricIndex: number,
    valueIndexes: number[]
  ) {
    const data: TimeSeries[] = [];
    let targetName = '';
    let metricName = '';
    let i;

    if (!results.rows || !results.schema) {
      return data;
    }

    for (const row of results.rows) {
      if (row) {
        for (i = 0; i < valueIndexes.length; i++) {
          if (row.f === undefined) {
            continue;
          }

          const epoch = Number(row.f[timeIndex].v) * 1000;
          const valueIndexName = results.schema.fields![valueIndexes[i]].name;

          targetName = metricIndex > -1 ? row.f[metricIndex].v.concat(' ', valueIndexName) : valueIndexName;
          metricName = metricIndex > -1 ? row.f[metricIndex].v : valueIndexName;

          if (metricIndex > -1 && valueIndexes.length === 1) {
            targetName = metricName;
          }

          const bucket = ResponseParser.findOrCreateBucket(data, targetName, metricName);
          const value = row.f![valueIndexes[i]].v === null ? null : Number(row.f[valueIndexes[i]].v);

          bucket.datapoints.push([value, epoch]);
        }
      }
    }
    return data;
  }

  private static findOrCreateBucket(data: TimeSeries[], target: string, metric: string): TimeSeries {
    let dataTarget = _.find(data, ['target', target]);
    if (!dataTarget) {
      dataTarget = { target, datapoints: [], refId: metric, query: '' } as TimeSeries;
      data.push(dataTarget);
    }

    return dataTarget;
  }

  private static _toTable(results: BQTypes.IQueryResponse): TableData {
    const columns: Array<{ text: string; type: string }> = [];
    const rows: any[] = [];

    if (!results.schema) {
      return {
        columns,
        rows,
        type: 'table',
      };
    }

    for (const fl of results.schema!.fields!) {
      columns.push({
        text: fl.name!,
        type: fl.type!,
      });
    }

    results.rows?.forEach((row) => {
      const r: any[] = [];
      row.f?.forEach((v, i) => {
        const val = v.v ? ResponseParser._convertValues(v.v, columns[i].type) : '';
        r.push(val);
      });
      rows.push(r);
    });

    return {
      columns,
      rows,
      type: 'table',
    };
  }

  static toVar(results: any): MetricFindValue[] {
    const res = [];
    for (const row of results.rows) {
      res.push(row.f[0].v);
    }

    return _.map(res, (value) => {
      return { text: value };
    });
  }

  constructor() {}

  parseTabels(results: BQTypes.ITableList['tables']): ResultFormat[] {
    return this._handelWildCardTables(
      ResponseParser.parseData(results, 'tableReference.tableId', 'tableReference.tableId')
    );
  }

  transformAnnotationResponse(options: any, data: FetchResponse) {
    const table = data.data;
    let timeColumnIndex = -1;
    let textColumnIndex = -1;
    let tagsColumnIndex = -1;

    for (let i = 0; i < data.data.schema.fields.length; i++) {
      if (data.data.schema.fields[i].name === 'time') {
        timeColumnIndex = i;
      } else if (data.data.schema.fields[i].name === 'text') {
        textColumnIndex = i;
      } else if (data.data.schema.fields[i].name === 'tags') {
        tagsColumnIndex = i;
      }
    }

    if (timeColumnIndex === -1) {
      return Promise.reject({
        message: 'Missing mandatory time column in annotation query.',
      });
    }

    const list = [];
    if (table.rows && table.rows.length) {
      for (const row of table.rows) {
        list.push({
          annotation: options.annotation,
          tags: row.f[tagsColumnIndex].v ? row.f[tagsColumnIndex].v.trim().split(/\s*,\s*/) : [],
          text: row.f[textColumnIndex].v ? row.f[textColumnIndex].v.toString() : '',
          time: Number(Math.floor(Number(row.f[timeColumnIndex].v))) * 1000,
        });
      }
    }

    return Promise.resolve(list);
  }

  private _handelWildCardTables(tables: ResultFormat[]) {
    let sorted = new Map();
    let newTables: ResultFormat[] = [];
    for (const t of tables) {
      const partitioned = t.text.indexOf('__partitioned');
      if (partitioned > -1) {
        t.text = t.text.substring(0, partitioned);
      }
      if (
        !t.value.match(
          /_(?:(?:20\d{2})(?:(?:(?:0[13578]|1[02])31)|(?:(?:0[1,3-9]|1[0-2])(?:29|30)))|(?:(?:20(?:0[48]|[2468][048]|[13579][26]))0229)|(?:20\d{2})(?:(?:0?[1-9])|(?:1[0-2]))(?:0?[1-9]|1\d|2[0-8]))(?!\d)$/g
        )
      ) {
        sorted = sorted.set(t.value, t.text);
      } else {
        sorted.set(
          t.text.substring(0, t.text.length - 8) + 'YYYYMMDD',
          t.text.substring(0, t.text.length - 8) + 'YYYYMMDD'
        );
      }
    }
    sorted.forEach((text, value) => {
      newTables = newTables.concat({ text, value });
    });
    return newTables;
  }
}
