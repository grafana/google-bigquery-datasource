import { EditorMode } from '@grafana/experimental';
import { QueryFormat } from 'types';
import { applyQueryDefaults, extractFromClause, findTimeField, formatBigqueryError, getShiftPeriod } from 'utils';

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
});
