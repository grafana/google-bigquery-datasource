import { monacoTypes } from "@grafana/ui";

export const singleLineFullQuery = {
  query: `SELECT column1 FROM table1 WHERE column1 = "value1" GROUP BY column1 ORDER BY column1 DESC LIMIT 10`,
  tokens: [
    [
      {
        offset: 0,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 6,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 7,
        type: 'identifier.sql',
        language: 'sql',
      },
      {
        offset: 14,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 15,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 19,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 20,
        type: 'identifier.sql',
        language: 'sql',
      },
      {
        offset: 26,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 27,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 32,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 33,
        type: 'identifier.sql',
        language: 'sql',
      },
      {
        offset: 40,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 41,
        type: 'operator.sql',
        language: 'sql',
      },
      {
        offset: 42,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 43,
        type: 'identifier.quote.sql',
        language: 'sql',
      },
      {
        offset: 44,
        type: 'identifier.sql',
        language: 'sql',
      },
      {
        offset: 50,
        type: 'identifier.quote.sql',
        language: 'sql',
      },
      {
        offset: 51,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 52,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 57,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 58,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 60,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 61,
        type: 'identifier.sql',
        language: 'sql',
      },
      {
        offset: 68,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 69,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 74,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 75,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 77,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 78,
        type: 'identifier.sql',
        language: 'sql',
      },
      {
        offset: 85,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 86,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 90,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 91,
        type: 'keyword.sql',
        language: 'sql',
      },
      {
        offset: 96,
        type: 'white.sql',
        language: 'sql',
      },
      {
        offset: 97,
        type: 'number.sql',
        language: 'sql',
      },
    ],
  ] as monacoTypes.Token[][],
};
