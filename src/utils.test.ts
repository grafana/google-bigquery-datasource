import { EditorMode } from '@grafana/plugin-ui';
import { QueryFormat } from 'types';
import { applyQueryDefaults, extractFromClause, findTimeField, formatBigqueryError, getShiftPeriod, handleError } from 'utils';

describe('Utils', () => {
  test('formatBigqueryError', () => {
    const error = {
      message: 'status text',
      code: '505',
      errors: [{ reason: 'just like that' }],
    };

    const res = formatBigqueryError(error).data.message;
    expect(res).toBe('just like that: status text');
  });

  test('getShiftPeriod', () => {
    const interval = '55 min';

    const res = getShiftPeriod(interval);
    expect(res).toEqual(['m', '55']);
  });

  test('extractFromClause', () => {
    const sql = 'select a from `prj.ds.dt` where';

    const res = extractFromClause(sql);
    expect(res).toEqual(['prj', 'ds', 'dt']);
  });

  test('findTimeField', () => {
    const sql = 'select tm,b from `prj.ds.dt` where';
    const fl = {
      text: 'tm',
    };
    const timeFields = new Array(fl);
    const res = findTimeField(sql, timeFields);
    expect(res.text).toBe('tm');
  });

  test('applyQueryDefaults should handle location change from auto to US', () => {
    const query = {
      location: '',
      refId: 'A',
      rawSql: 'select * from `prj.ds.dt`',
      format: QueryFormat.Table,
      editorMode: EditorMode.Builder,
    };
    const res = applyQueryDefaults(query, { jsonData: { processingLocation: '' } } as any);

    expect(res.location).toBe('');
  });

  test('applyQueryDefaults should handle location change from US to auto', () => {
    const query = {
      location: '',
      refId: 'A',
      rawSql: 'select * from `prj.ds.dt`',
      format: QueryFormat.Table,
      editorMode: EditorMode.Builder,
    };
    const res = applyQueryDefaults(query, { jsonData: { processingLocation: 'US' } } as any);

    expect(res.location).toBe('');
  });

  test('handleError should return [] when cancelled is true', () => {
    const res = handleError({ cancelled: true });
    expect(res).toEqual([]);
  });

  test('handleError should throw formatted error when error.data.error is present', () => {
    const inner = { message: 'status text', code: '505', errors: [{ reason: 'just like that' }] };
    const err = { data: { error: inner } };
    try {
      handleError(err);
      // should not reach here
      throw new Error('handleError did not throw');
    } catch (e: any) {
      expect(e.data.message).toBe('just like that: status text');
      expect(e.status).toBe('505');
      expect(e.statusText).toContain('BigQuery: status text');
    }
  });

  test('handleError should throw formatted error when passed plain error object', () => {
    const err = { message: 'status text', code: '505', errors: [{ reason: 'just like that' }] };
    try {
      handleError(err);
      throw new Error('handleError did not throw');
    } catch (e: any) {
      expect(e.data.message).toBe('just like that: status text');
    }
  });

  test('formatDateToString formats date correctly with separators and time', () => {
    const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5)); // 2020-01-02T03:04:05Z
    const { formatDateToString } = require('utils');
    const r = formatDateToString(d, '-', true);
    expect(r).toMatch(/^2020-01-02 03:04:05$/);
  });

  test('quoteLiteral and escapeLiteral work as expected', () => {
    const { quoteLiteral, escapeLiteral } = require('utils');
    expect(quoteLiteral("O'Reilly")).toBe("'O''Reilly'");
    expect(escapeLiteral("O'Reilly")).toBe("O''Reilly");
  });

  test('quoteFiledName quotes dotted identifiers', () => {
    const { quoteFiledName } = require('utils');
    expect(quoteFiledName('project.dataset.table')).toBe('`project`.`dataset`.`table`');
    expect(quoteFiledName('col')).toBe('`col`');
  });

  test('getInterval extracts interval and value', () => {
    const { getInterval } = require('utils');
    const q = '$__timeGroup(col, 1m, 10)';
    const res = getInterval(q, false);
    expect(res[0]).toBe('1m');
    expect(res[1]).toBe('10');
  });

  test('getInterval extracts interval and value with alias', () => {
    const { getInterval } = require('utils');
    const q = '$__timeGroupAlias(col, 1m, 10)';
    const res = getInterval(q, true);
    expect(res[0]).toBe('1m');
    expect(res[1]).toBe('10');
  });
  

  test('getTimeShift and replaceTimeShift behave as expected', () => {
    const { getTimeShift, replaceTimeShift } = require('utils');
    const sql = 'select $__timeShifting(55 min) as shifted';
    expect(getTimeShift(sql)).toBe('55 min');
    const replaced = replaceTimeShift(sql);
    expect(replaced).not.toContain('$__timeShifting(');
  });

  test('getUnixSecondsFromString handles different periods', () => {
    const { getUnixSecondsFromString } = require('utils');
    expect(getUnixSecondsFromString('5s')).toBe(5);
    expect(getUnixSecondsFromString('2 min')).toBe(120);
    expect(getUnixSecondsFromString('1h')).toBe(3600);
    expect(getUnixSecondsFromString(undefined)).toBe(0);
  });

  test('convertToUtc applies timezone offset', () => {
    const { convertToUtc } = require('utils');
    const d = new Date();
    const expected = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    const res = convertToUtc(d);
    expect(res.getTime()).toBe(expected.getTime());
  });

  test('isQueryValid and datasource id setters/getters', () => {
    const { isQueryValid, setDatasourceId, getDatasourceId } = require('utils');
    expect(isQueryValid({ rawSql: 'select 1' })).toBe(true);
    expect(isQueryValid({})).toBe(false);
    setDatasourceId(999);
    expect(getDatasourceId()).toBe(999);
  });
});
