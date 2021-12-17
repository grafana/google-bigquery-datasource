import { FieldType } from '@grafana/data';
import { Monaco, monacoTypes } from '@grafana/ui';
import { StatementPositionResolver, SuggestionsResolver } from './standardSql/types';
import { LinkedToken } from './utils/LinkedToken';

/**
 * Provides a context for suggestions resolver
 * @alpha
 */
export interface PositionContext {
  position: monacoTypes.IPosition;
  kind: SuggestionKind[];
  statementPosition: StatementPosition[];
  currentToken: LinkedToken | null;
  range: monacoTypes.IRange;
}

export type CustomSuggestion = Partial<monacoTypes.languages.CompletionItem> & { label: string };

export interface CustomSuggestionKind {
  id: string;
  suggestionsResolver: SuggestionsResolver;
  applyTo?: Array<StatementPosition | string>;
}

export interface CustomStatementPlacement {
  id: string;
  name?: string;
  resolve: StatementPositionResolver;
}
export type StatementPlacementProvider = () => CustomStatementPlacement[];
export type SuggestionKindProvider = () => CustomSuggestionKind[];

export interface ColumnDefinition {
  name: string;
  type?: FieldType;
  // Text used for automplete. If not provided name is used.
  completion?: string;
}
export interface TableDefinition {
  name: string;
  // Text used for automplete. If not provided name is used.
  completion?: string;
}

export interface SQLCompletionItemProvider
  extends Omit<monacoTypes.languages.CompletionItemProvider, 'provideCompletionItems'> {
  /**
   * Allows dialect specific functions to be added to the completion list.
   * @alpha
   */
  supportedFunctions?: () => Array<{
    id: string;
    name: string;
  }>;

  /**
   * Allows dialect specific operators to be added to the completion list.
   * @alpha
   */
  supportedOperators?: () => Array<{
    id: string;
    operator: string;
    type: OperatorType;
  }>;

  /**
   * Allows custom suggestion kinds to be defined and correlate them with <Custom>StatementPosition.
   * @alpha
   */
  customSuggestionKinds?: SuggestionKindProvider;

  /**
   * Allows custom statement placement definition.
   * @alpha
   */
  customStatementPlacement?: StatementPlacementProvider;

  /**
   * Allows providing a custom function for resolving db tables.
   * It's up to the consumer to decide whether the columns are resolved via API calls or preloaded in the query editor(i.e. full db schema is preloades loaded).
   * @alpha
   */
  tables?: {
    resolve: () => Promise<TableDefinition[]>;
    // Allows providing a custom function for calculating the table name from the query. If not specified a default implemnentation is used.
    parseName?: (t: LinkedToken) => string;
  };
  /**
   * Allows providing a custom function for resolving table.
   * It's up to the consumer to decide whether the columns are resolved via API calls or preloaded in the query editor(i.e. full db schema is preloades loaded).
   * @alpha
   */
  columns?: {
    resolve: (table: string) => Promise<ColumnDefinition[]>;
  };

  /**
   * TODO: Not sure whether or not we need this. Would like to avoid this kind of flexibility.
   * @alpha
   */
  provideCompletionItems?: (
    model: monacoTypes.editor.ITextModel,
    position: monacoTypes.Position,
    context: monacoTypes.languages.CompletionContext,
    token: monacoTypes.CancellationToken,
    positionContext: PositionContext // Decorates original provideCompletionItems function with our custom statement position context
  ) => monacoTypes.languages.CompletionList;
}

export type LanguageCompletionProvider = (m: Monaco) => SQLCompletionItemProvider;

export enum OperatorType {
  Comparison,
  Logical,
}

export enum TokenType {
  Parenthesis = 'delimiter.parenthesis.sql',
  Whitespace = 'white.sql',
  Keyword = 'keyword.sql',
  Delimiter = 'delimiter.sql',
  Operator = 'operator.sql',
  Identifier = 'identifier.sql',
  IdentifierQuote = 'identifier.quote.sql',
  Type = 'type.sql',
  Function = 'predefined.sql',
  Number = 'number.sql',
  String = 'string.sql',
  Variable = 'variable.sql',
}

export enum StatementPosition {
  Unknown = 'unknown',
  SelectKeyword = 'selectKeyword',
  WithKeyword = 'withKeyword',
  AfterSelectKeyword = 'afterSelectKeyword',
  AfterSelectArguments = 'afterSelectArguments',
  AfterSelectFuncFirstArgument = 'afterSelectFuncFirstArgument',
  AfterFromKeyword = 'afterFromKeyword',
  AfterTable = 'afterTable',
  SchemaFuncFirstArgument = 'schemaFuncFirstArgument',
  SchemaFuncExtraArgument = 'schemaFuncExtraArgument',
  FromKeyword = 'fromKeyword',
  AfterFrom = 'afterFrom',
  WhereKeyword = 'whereKeyword',
  WhereComparisonOperator = 'whereComparisonOperator',
  WhereValue = 'whereValue',
  AfterWhereValue = 'afterWhereValue',
  AfterGroupByKeywords = 'afterGroupByKeywords',
  AfterGroupBy = 'afterGroupBy',
  AfterOrderByKeywords = 'afterOrderByKeywords',
  AfterOrderByFunction = 'afterOrderByFunction',
  AfterOrderByDirection = 'afterOrderByDirection',
}

export enum SuggestionKind {
  Tables = 'tables',
  Columns = 'columns',
  SelectKeyword = 'selectKeyword',
  WithKeyword = 'withKeyword',
  FunctionsWithArguments = 'functionsWithArguments',
  FromKeyword = 'fromKeyword',
  WhereKeyword = 'whereKeyword',
  GroupByKeywords = 'groupByKeywords',
  OrderByKeywords = 'orderByKeywords',
  FunctionsWithoutArguments = 'functionsWithoutArguments',
  LimitKeyword = 'limitKeyword',
  SortOrderDirectionKeyword = 'sortOrderDirectionKeyword',
  ComparisonOperators = 'comparisonOperators',
  LogicalOperators = 'logicalOperators',
}

// TODO: export from grafana/ui
export enum CompletionItemPriority {
  High = 'a',
  MediumHigh = 'd',
  Medium = 'g',
  MediumLow = 'k',
  Low = 'q',
}

export enum CompletionItemKind {
  Method = 0,
  Function = 1,
  Constructor = 2,
  Field = 3,
  Variable = 4,
  Class = 5,
  Struct = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Event = 10,
  Operator = 11,
  Unit = 12,
  Value = 13,
  Constant = 14,
  Enum = 15,
  EnumMember = 16,
  Keyword = 17,
  Text = 18,
  Color = 19,
  File = 20,
  Reference = 21,
  Customcolor = 22,
  Folder = 23,
  TypeParameter = 24,
  User = 25,
  Issue = 26,
  Snippet = 27,
}

export enum CompletionItemInsertTextRule {
  KeepWhitespace = 1,
  InsertAsSnippet = 4,
}
