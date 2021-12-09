import { FROM } from 'components/sql-editor/standardSql/language';
import { ColumnDefinition, LanguageCompletionProvider, TableDefinition } from 'components/sql-editor/types';
import { LinkedToken } from 'components/sql-editor/utils/LinkedToken';
import { OperatorType, TokenType } from 'components/sql-editor/utils/types';

interface CompletionProviderGetterArgs {
  getColumns: React.MutableRefObject<(t: string) => Promise<Array<ColumnDefinition>>>;
  getTables: React.MutableRefObject<(d?: string) => Promise<Array<TableDefinition>>>;
}

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

const BQ_OPERATORS = [
  { type: OperatorType.Comparison, id: 'LESS_THAN', operator: '<' },
  { type: OperatorType.Comparison, id: 'LESS_THAN_EQUAL', operator: '<=' },
  { type: OperatorType.Comparison, id: 'GREATER_THAN', operator: '>' },
  { type: OperatorType.Comparison, id: 'GREATER_THAN_EQUAL', operator: '>=' },
  { type: OperatorType.Comparison, id: 'EQUAL', operator: '=' },
  { type: OperatorType.Comparison, id: 'NOT_EQUAL', operator: '!=' },
  { type: OperatorType.Comparison, id: 'NOT_EQUAL_ALT', operator: '<>' },
  { type: OperatorType.Comparison, id: 'LIKE', operator: 'LIKE' },
  { type: OperatorType.Logical, id: 'LOGICAL_AND', operator: 'AND' },
  { type: OperatorType.Logical, id: 'LOGICAL_OR', operator: 'OR' },
];

export const getBigQueryCompletionProvider: (args: CompletionProviderGetterArgs) => LanguageCompletionProvider =
  ({ getColumns, getTables }) =>
  (monaco) => ({
    triggerCharacters: ['.', ' ', '$', ',', '(', "'"],
    tables: {
      resolve: async () => {
        return await getTables.current();
      },
      parseName: (token: LinkedToken) => {
        let processedToken = token;
        let tablePath = processedToken.value;
        while (processedToken.next && !processedToken?.next?.isKeyword()) {
          tablePath += processedToken.next.value;
          processedToken = processedToken.next;
        }

        return tablePath;
      },
    },

    columns: {
      resolve: async (t: string) => {
        return await getColumns.current(t);
      },
    },
    supportedFunctions: () => BQ_AGGREGATE_FNS,
    supportedOperators: () => BQ_OPERATORS,
    customSuggestionKinds: () => {
      return [
        {
          id: 'tablesWithinDataset',
          applyTo: ['afterDataset'],
          suggestionsResolver: async (ctx) => {
            let processedToken = ctx.currentToken;
            let tablePath = '';
            while (processedToken?.previous && !processedToken.previous.isWhiteSpace()) {
              tablePath = processedToken.previous.value + tablePath;
              processedToken = processedToken.previous;
            }

            const t = await getTables.current(tablePath);

            return t.map((table) => ({
              label: table.name,
              insertText: table.completion ?? table.name,
              kind: 1,
              range: {
                ...ctx.range,
                startColumn: ctx.range.endColumn,
                endColumn: ctx.range.endColumn,
              },
            }));
          },
        },
      ];
    },

    customStatementPlacement: () => [
      {
        id: 'afterDataset',
        resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) => {
          return Boolean(
            previousKeyword?.value === FROM &&
              (currentToken?.is(TokenType.Delimiter, '.') || currentToken?.previous?.is(TokenType.Delimiter, '.'))
          );
        },
      },
    ],

    // provideCompletionItems: () => {
    //   return {
    //     suggestions: [],
    //   };
    // },
  });

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
