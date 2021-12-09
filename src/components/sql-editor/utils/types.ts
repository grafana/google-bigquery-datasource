import { monacoTypes } from '@grafana/ui';

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
  Type = 'type.sql',
  Function = 'predefined.sql',
  Number = 'number.sql',
  String = 'string.sql',
  Variable = 'variable.sql',
}

export enum StatementPosition {
  Unknown = 'unknown',
  SelectKeyword = 'selectKeyword',
  AfterSelectKeyword = 'afterSelectKeyword',
  AfterSelectFuncFirstArgument = 'afterSelectFuncFirstArgument',
  AfterSelectArguments = 'afterSelectArguments',
  AfterFromKeyword = 'afterFromKeyword',
  AfterTable = 'afterTable',
  SchemaFuncFirstArgument = 'schemaFuncFirstArgument',
  SchemaFuncExtraArgument = 'schemaFuncExtraArgument',
  FromKeyword = 'fromKeyword',
  AfterFrom = 'afterFrom',
  WhereKey = 'whereKey',
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

  // NON-STD
  SchemaKeyword = 'schemaKeyword',
  Namespaces = 'namespaces', // EXTENSIBLE
  Metrics = 'metrics',
  LabelValues = 'labelValues',
  LabelKeys = 'labelKeys',
}

export enum CompletionItemPriority {
  High = 'a',
  MediumHigh = 'd',
  Medium = 'g',
  MediumLow = 'k',
  Low = 'q',
}

export interface Editor {
  tokenize: (value: string, languageId: string) => monacoTypes.Token[][];
}

export interface Range {
  containsPosition: (range: monacoTypes.IRange, position: monacoTypes.IPosition) => boolean;
}

export interface Monaco {
  editor: Editor;
  Range: Range;
}

// TODO: export from grafana/ui
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
