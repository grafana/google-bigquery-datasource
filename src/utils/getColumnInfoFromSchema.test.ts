import { getColumnInfoFromSchema } from './getColumnInfoFromSchema';

describe('getColumnInfoFromSchema', () => {
  test('returns type and description for top-level column', () => {
    const schema = [
      { name: 'col', type: 'STRING', description: 'top level', repeated: false } as any,
    ];

    const res = getColumnInfoFromSchema('col', schema);
    expect(res).toEqual({ type: 'STRING', description: 'top level' });
  });

  test('returns nested field info', () => {
    const schema = [
      {
        name: 'a',
        type: 'RECORD',
        schema: [{ name: 'b', type: 'INT64', description: 'nested', repeated: false }],
      } as any,
    ];

    const res = getColumnInfoFromSchema('a.b', schema);
    expect(res).toEqual({ type: 'INT64', description: 'nested' });
  });

  test('marks repeated fields with prefix', () => {
    const schema = [
      {
        name: 'a',
        type: 'RECORD',
        schema: [{ name: 'b', type: 'INT64', description: 'nested', repeated: true }],
      } as any,
    ];

    const res = getColumnInfoFromSchema('a.b', schema);
    expect(res).toEqual({ type: 'Repeated INT64', description: 'nested' });
  });

  test('handles deep nested paths', () => {
    const schema = [
      {
        name: 'a',
        type: 'RECORD',
        schema: [
          {
            name: 'b',
            type: 'RECORD',
            schema: [{ name: 'c', type: 'BOOL', description: 'deep', repeated: false }],
          },
        ],
      } as any,
    ];

    const res = getColumnInfoFromSchema('a.b.c', schema);
    expect(res).toEqual({ type: 'BOOL', description: 'deep' });
  });

  test('returns null when not found', () => {
    const schema = [{ name: 'x', type: 'STRING', repeated: false } as any];
    const res = getColumnInfoFromSchema('y', schema);
    expect(res).toBeNull();
  });
});
