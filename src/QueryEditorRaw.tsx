import React from 'react';

import { BigQueryQueryNG } from './bigquery_query';
import { TableFieldSchema } from 'api';
import { SQLEditor } from 'components/sql-editor/SQLEditor';
import { LanguageCompletionProvider } from 'components/sql-editor/types';
import { StatementPosition } from 'components/sql-editor/utils/types';

type Props = {
  query: BigQueryQueryNG;
  schema: TableFieldSchema[];
  columns: string[];
  onChange: (value: BigQueryQueryNG) => void;
  onRunQuery: () => void;
};

// function getColumnSchema(schema: TableFieldSchema[], column: string): TableFieldSchema | undefined {
//   const path = column.split('.');
//   let currentSchema = schema;

//   const k = path.shift();
//   const c = currentSchema.find((f) => f.name === k);

//   if (c && c.schema && path.length > 0) {
//     return getColumnSchema(c.schema, path.join('.'));
//   }
//   return c;
// }

export function QueryEditorRaw(props: Props) {
  const onRawSqlChange = (rawSql: string) => {
    const query = {
      ...props.query,
      rawQuery: true,
      rawSql,
    };
    props.onChange(query);
    props.onRunQuery();
  };

  return (
    <SQLEditor
      query={props.query.rawSql}
      onChange={onRawSqlChange}
      language={{ id: 'sql', completionProvider: BigQueryCompletionProvider }}
    />
  );
}

const BigQueryCompletionProvider: LanguageCompletionProvider = (monaco) => ({
  triggerCharacters: [' ', '$', ',', '(', "'"],

  customFunctions: () => [
    // TODO: add BQ functions
    {
      id: 'custom_function',
      name: 'CUSTOM_FN',
    },
  ],
  customStatementPlacement: () => [],

  customSuggestionKinds: () => {
    return [
      {
        id: 'tables',
        applyTo: [StatementPosition.AfterFromKeyword],
        suggestionsResolver: () => {
          return Promise.resolve([
            {
              label: 'TableA',
              kind: 1,
              insertText: 'tableA',
            },
            {
              label: 'TableB',
              kind: 1,
              insertText: 'tableB',
            },
          ]);
        },
      },
      {
        id: 'columns',
        applyTo: [StatementPosition.AfterSelectKeyword],
        suggestionsResolver: () => {
          return Promise.resolve([
            {
              label: 'ColumnA',
              kind: 1,
              insertText: 'columnA',
            },
            {
              label: 'ColumnB',
              kind: 1,
              insertText: 'columnB',
            },
          ]);
        },
      },
    ];
  },

  provideCompletionItems: (model, position, context, token, positionContext) => {
    return {
      suggestions: [],
    };
  },
});
