import ResponseParser from 'ResponseParser';

describe('ResponseParser', () => {
  it('transformAnnotationResponse empty results with 0 rows', async () => {
    const fields = [
      {
        name: 'time',
        type: 'TIMESTAMP',
        mode: 'NULLABLE',
      },
      {
        name: 'text',
        type: 'FLOAT',
        mode: 'NULLABLE',
      },
      {
        name: 'tags',
        type: 'FLOAT',
        mode: 'NULLABLE',
      },
    ];
    const options = { annotation: {} };
    const data = { data: { schema: { fields } } };
    const rp = new ResponseParser();
    const list = await rp.transformAnnotationResponse(options, data);

    expect(list.length).toBe(0);
  });
  it('transformAnnotationResponse empty results without rows', async () => {
    const fields = [
      {
        name: 'time',
        type: 'TIMESTAMP',
        mode: 'NULLABLE',
      },
      {
        name: 'text',
        type: 'FLOAT',
        mode: 'NULLABLE',
      },
      {
        name: 'tags',
        type: 'FLOAT',
        mode: 'NULLABLE',
      },
    ];
    const options = { annotation: {} };
    const data = { data: { schema: { fields } } };
    const rp = new ResponseParser();
    const list = await rp.transformAnnotationResponse(options, data);

    expect(list.length).toBe(0);
    expect(list).toEqual([]);
  });

  it('transformAnnotationResponse results with 3 rows', async () => {
    const rows = [
        {
          f: [
            {
              v: '1.521578851E9',
            },
            {
              v: '37.7753058',
            },
            {
              v: '42.7753058',
            },
          ],
        },
        {
          f: [
            {
              v: '1.521578916E9',
            },
            {
              v: '37.3322326',
            },
            {
              v: '42.7753058',
            },
          ],
        },
        {
          f: [
            {
              v: '1.521578927E9',
            },
            {
              v: '37.781752',
            },
            {
              v: '42.7753058',
            },
          ],
        },
      ],
      fields = [
        {
          name: 'time',
          type: 'TIMESTAMP',
          mode: 'NULLABLE',
        },
        {
          name: 'text',
          type: 'FLOAT',
          mode: 'NULLABLE',
        },
        {
          name: 'tags',
          type: 'FLOAT',
          mode: 'NULLABLE',
        },
      ];
    const options = { annotation: {} };
    const data = { data: { schema: { fields }, rows } };
    const rp = new ResponseParser();
    const list = await rp.transformAnnotationResponse(options, data);

    expect(list.length).toBe(3);
  });
});

describe('When performing parseDataQuery for table', () => {
  const response = {
    kind: 'bigquery#queryResponse',
    schema: {
      fields: [
        {
          name: 'time',
          type: 'TIMESTAMP',
          mode: 'NULLABLE',
        },
        {
          name: 'start_station_latitude',
          type: 'FLOAT',
          mode: 'NULLABLE',
        },
      ],
    },
    jobReference: {
      projectId: 'proj-1',
      jobId: 'job_fB4qCDAO-TKg1Orc-OrkdIRxCGN5',
      location: 'US',
    },
    totalRows: '3',
    rows: [
      {
        f: [
          {
            v: '1.521578851E9',
          },
          {
            v: '37.7753058',
          },
        ],
      },
      {
        f: [
          {
            v: '1.521578916E9',
          },
          {
            v: '37.3322326',
          },
        ],
      },
      {
        f: [
          {
            v: '1.521578927E9',
          },
          {
            v: '37.781752',
          },
        ],
      },
    ],
    totalBytesProcessed: '23289520',
    jobComplete: true,
    cacheHit: false,
  };

  const results = ResponseParser.parseDataQuery(response, 'table');

  it('should return a table', () => {
    expect(results.columns.length).toBe(2);
    expect(results.rows.length).toBe(3);
    expect(results.columns[0].text).toBe('time');
    expect(results.columns[0].type).toBe('TIMESTAMP');
  });
});

describe('When performing parseDataQuery for time_series', () => {
  let results;
  const response = {
    kind: 'bigquery#queryResponse',
    schema: {
      fields: [
        {
          name: 'time',
          type: 'TIMESTAMP',
          mode: 'NULLABLE',
        },
        {
          name: 'start_station_latitude',
          type: 'FLOAT',
          mode: 'NULLABLE',
        },
      ],
    },
    jobReference: {
      projectId: 'proj-1',
      jobId: 'job_fB4qCDAO-TKg1Orc-OrkdIRxCGN5',
      location: 'US',
    },
    totalRows: '3',
    rows: [
      {
        f: [
          {
            v: '1.521578851E9',
          },
          {
            v: null,
          },
        ],
      },
      {
        f: [
          {
            v: '1.521578916E9',
          },
          {
            v: '37.3322326',
          },
        ],
      },
      {
        f: [
          {
            v: '1.521578927E9',
          },
          {
            v: '37.781752',
          },
        ],
      },
    ],
    totalBytesProcessed: '23289520',
    jobComplete: true,
    cacheHit: false,
  };

  results = ResponseParser.parseDataQuery(response, 'time_series');
  it('should return a time_series', () => {
    expect(results[0].datapoints.length).toBe(3);
    expect(results[0].datapoints[0][0]).toBe(null);
    expect(results[0].datapoints[0][1]).toBe(1521578851000);
    expect(results[0].datapoints[2][0]).toBe(37.781752);
    expect(results[0].datapoints[2][1]).toBe(1521578927000);
  });
});

describe('When performing parseDataQuery for vars', () => {
  let results;
  const response = {
    kind: 'bigquery#queryResponse',
    schema: {
      fields: [
        {
          name: 'time',
          type: 'TIMESTAMP',
          mode: 'NULLABLE',
        },
        {
          name: 'start_station_latitude',
          type: 'FLOAT',
          mode: 'NULLABLE',
        },
      ],
    },
    jobReference: {
      projectId: 'proj-1',
      jobId: 'job_fB4qCDAO-TKg1Orc-OrkdIRxCGN5',
      location: 'US',
    },
    totalRows: '3',
    rows: [
      {
        f: [
          {
            v: '1.521578851E9',
          },
          {
            v: '37.7753058',
          },
        ],
      },
      {
        f: [
          {
            v: '1.521578916E9',
          },
          {
            v: '37.3322326',
          },
        ],
      },
      {
        f: [
          {
            v: '1.521578927E9',
          },
          {
            v: '37.781752',
          },
        ],
      },
    ],
    totalBytesProcessed: '23289520',
    jobComplete: true,
    cacheHit: false,
  };

  results = ResponseParser.parseDataQuery(response, 'var');
  it('should return a var', () => {
    expect(results.length).toBe(3);
    expect(results[0].text).toBe('1.521578851E9');
  });
});
