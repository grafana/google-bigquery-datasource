import React, { useMemo, useRef, useEffect } from 'react';
import { BigQueryQueryNG } from './bigquery_query';
import { TableSchema } from 'api';
import { SQLEditor } from 'components/sql-editor/SQLEditor';
import { ColumnSchema, LanguageCompletionProvider } from 'components/sql-editor/types';
import { StatementPosition } from 'components/sql-editor/utils/types';

type Props = {
  query: BigQueryQueryNG;
  getTables: () => Promise<Array<string>>;
  getColumns: (t: string) => Promise<Array<ColumnSchema>>;
  getSchema?: () => TableSchema | null;
  onChange: (value: BigQueryQueryNG) => void;
  onRunQuery: () => void;
};

export function QueryEditorRaw(props: Props) {
  const getColumns = useRef<Props['getColumns']>(props.getColumns);
  const getTables = useRef<Props['getTables']>(props.getTables);
  const completionProvider = useMemo(() => getBigQueryCompletionProvider({ getColumns, getTables }), []);

  useEffect(() => {
    getColumns.current = props.getColumns;
    getTables.current = props.getTables;
  }, [props.getColumns, props.getTables]);

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
    <SQLEditor query={props.query.rawSql} onChange={onRawSqlChange} language={{ id: 'sql', completionProvider }} />
  );
}

interface CompletionProviderGetterArgs {
  getSchema?: () => TableSchema;
  getColumns: React.MutableRefObject<(t: string) => Promise<Array<ColumnSchema>>>;
  getTables: React.MutableRefObject<() => Promise<Array<string>>>;
}

const getBigQueryCompletionProvider: (args: CompletionProviderGetterArgs) => LanguageCompletionProvider =
  ({ getColumns, getTables }) =>
  (monaco) => ({
    triggerCharacters: [' ', '$', ',', '(', "'"],
    resolveTables: async () => {
      return await getTables.current();
    },
    resolveColumns: async (t: string) => {
      return await getColumns.current(t);
    },
    supportedFunctions: () => BQ_AGGREGATE_FNS,

    customSuggestionKinds: () => {
      return [
        {
          id: 'CustomColumns',
          applyTo: [
            StatementPosition.AfterSelectKeyword,
            StatementPosition.AfterSelectFuncFirstArgument,
            StatementPosition.AfterSelectArguments,
          ],
          suggestionsResolver: (ctx) => {
            // TESTING only
            // use table token to fetch columns
            // const tableToken = getTableToken(ctx.currentToken);
            return Promise.resolve([
              {
                label: 'Custom: ColumnA',
                kind: 1,
                insertText: 'columnA',
              },
              {
                label: 'Custom: ColumnB',
                kind: 1,
                insertText: 'columnB',
              },
            ]);
          },
        },
      ];
    },

    // customStatementPlacement: () => [
    //   {
    //     id: 'afterSelectArguments',
    //     resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) => {
    //       return Boolean(previousKeyword?.value === SELECT && previousNonWhiteSpace?.value === ',');
    //     },
    //   },
    // ],

    // provideCompletionItems: () => {
    //   return {
    //     suggestions: [],
    //   };
    // },
  });

const BQ_AGGREGATE_FNS = [
  { id: 'ANY_VALUE', name: 'ANY_VALUE' },
  { id: 'ARRAY_AGG', name: 'ARRAY_AGG' },
  { id: 'ARRAY_CONCAT_AGG', name: 'ARRAY_CONCAT_AGG' },
  { id: 'AVG', name: 'AVG' },
  { id: 'BIT_AND', name: 'BIT_AND' },
  { id: 'BIT_OR', name: 'BIT_OR' },
  { id: 'BIT_XOR', name: 'BIT_XOR' },
  { id: 'COUNT', name: 'COUNT' },
  { id: 'COUNTIF', name: 'COUNTIF' },
  { id: 'LOGICAL_AND', name: 'LOGICAL_AND' },
  { id: 'LOGICAL_OR', name: 'LOGICAL_OR' },
  { id: 'MAX', name: 'MAX' },
  { id: 'MIN', name: 'MIN' },
  { id: 'STRING_AGG', name: 'STRING_AGG' },
  { id: 'SUM', name: 'SUM' },
];

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
